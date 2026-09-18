-- ============================================================================
-- gmb/0001 — Gmb (Google Business Profile ops) baseline (PostgreSQL)
--
-- Executed by the migrate job with `SET LOCAL ROLE gmb_owner`; gmb_app gets
-- DML through the grants step.
--
-- Source: apps/gmb/db/mysql-legacy/schema.sql + alter_locations.sql (the
-- ad-hoc columns are folded into `locations`). Deliberate type decisions
-- (see DATABASE-MIGRATION.md §3):
--   • CHAR(36) UUID ids       → varchar(36), NOT uuid: ids arrive from URLs and
--                               a malformed id must stay a 404, not a 500.
--   • ENUM(...)               → varchar + CHECK (evolves with a plain migration;
--                               no ALTER TYPE dance while the product is young).
--   • TINYINT(1)              → boolean (only ever read with !!).
--   • DATETIME(3)             → timestamptz(3).
--   • JSON                    → jsonb.
--   • DECIMAL(p,s)            → numeric(p,s) (returned as strings, as before).
--   • ON UPDATE CURRENT_TIMESTAMP(3) → BEFORE UPDATE trigger gmb.set_updated_at().
--   • utf8mb4_unicode_ci      → identifiers/phones are exact-match values;
--                               free text from Google/users that is not
--                               truncated by the app → text.
-- ============================================================================

CREATE OR REPLACE FUNCTION gmb.set_updated_at() RETURNS trigger
LANGUAGE plpgsql AS $$
BEGIN
  NEW."updatedAt" := CURRENT_TIMESTAMP;
  RETURN NEW;
END $$;

-- ---------------------------------------------------------------------------
-- Identity & access
-- ---------------------------------------------------------------------------
CREATE TABLE gmb.users (
  id             varchar(36)  PRIMARY KEY,
  phone          varchar(20)  NOT NULL,          -- E.164, WhatsApp OTP identity
  name           varchar(191),
  email          varchar(191),
  "isSuperAdmin" boolean      NOT NULL DEFAULT false,
  "lastLoginAt"  timestamptz(3),
  "createdAt"    timestamptz(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"    timestamptz(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT users_phone_key UNIQUE (phone)
);
CREATE TRIGGER trg_users_updated_at BEFORE UPDATE ON gmb.users
  FOR EACH ROW EXECUTE FUNCTION gmb.set_updated_at();

CREATE TABLE gmb.organizations (
  id            varchar(36)  PRIMARY KEY,
  name          varchar(191) NOT NULL,
  "ownerUserId" varchar(36),
  "planId"      varchar(48),
  status        varchar(16)  NOT NULL DEFAULT 'active'
                CHECK (status IN ('active', 'suspended', 'cancelled')),
  "createdAt"   timestamptz(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"   timestamptz(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX org_owner_idx ON gmb.organizations ("ownerUserId");
CREATE TRIGGER trg_organizations_updated_at BEFORE UPDATE ON gmb.organizations
  FOR EACH ROW EXECUTE FUNCTION gmb.set_updated_at();

-- User ↔ Organization with role (RBAC). Super Admin is the platform flag above.
CREATE TABLE gmb.memberships (
  id          varchar(36) PRIMARY KEY,
  "userId"    varchar(36) NOT NULL REFERENCES gmb.users (id) ON DELETE CASCADE,
  "orgId"     varchar(36) NOT NULL REFERENCES gmb.organizations (id) ON DELETE CASCADE,
  role        varchar(24) NOT NULL
              CHECK (role IN ('clinic_admin', 'location_manager', 'content_reviewer', 'analyst')),
  status      varchar(16) NOT NULL DEFAULT 'active'
              CHECK (status IN ('active', 'invited', 'removed')),
  "createdAt" timestamptz(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT membership_user_org UNIQUE ("userId", "orgId")
);
CREATE INDEX membership_org_idx ON gmb.memberships ("orgId");

-- WhatsApp OTP codes (hashed). Purpose separates login vs sensitive re-verify.
CREATE TABLE gmb.otp_codes (
  id           varchar(36)  PRIMARY KEY,
  phone        varchar(20)  NOT NULL,
  "codeHash"   varchar(191) NOT NULL,            -- store hash, never the code
  purpose      varchar(16)  NOT NULL DEFAULT 'login' CHECK (purpose IN ('login', 'sensitive')),
  attempts     integer      NOT NULL DEFAULT 0,
  "expiresAt"  timestamptz(3) NOT NULL,
  "consumedAt" timestamptz(3),
  "createdAt"  timestamptz(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX otp_phone_idx ON gmb.otp_codes (phone, "createdAt");

CREATE TABLE gmb.sessions (
  id          varchar(64)  PRIMARY KEY,           -- opaque session token
  "userId"    varchar(36)  NOT NULL REFERENCES gmb.users (id) ON DELETE CASCADE,
  "orgId"     varchar(36),                        -- active org context
  ip          varchar(64),
  "userAgent" varchar(255),
  "expiresAt" timestamptz(3) NOT NULL,
  "revokedAt" timestamptz(3),
  "createdAt" timestamptz(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX session_user_idx ON gmb.sessions ("userId");

-- ---------------------------------------------------------------------------
-- Clinic locations (the GBP profile) + Google connection
-- ---------------------------------------------------------------------------
CREATE TABLE gmb.locations (
  id                    varchar(36)  PRIMARY KEY,
  "orgId"               varchar(36)  NOT NULL REFERENCES gmb.organizations (id) ON DELETE CASCADE,
  name                  varchar(191) NOT NULL,
  "primaryCategory"     text,                    -- also written from Google category names
  city                  varchar(120),
  locality              varchar(120),
  address               varchar(512),
  phone                 varchar(40),
  website               varchar(512),
  email                 varchar(191),
  "googleLocationId"    text,                    -- Google resource name
  "placeId"             text,
  status                varchar(16)  NOT NULL DEFAULT 'draft'
                        CHECK (status IN ('draft', 'connected', 'disconnected')),
  "completionScore"     integer,
  "lastSyncedAt"        timestamptz(3),
  "createdAt"           timestamptz(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"           timestamptz(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  -- formerly db/alter_locations.sql
  "secondaryCategories" jsonb,
  latitude              numeric(10, 8),
  longitude             numeric(11, 8),
  rating                numeric(3, 2),
  "reviewCount"         integer,
  "priceLevel"          varchar(20),
  "openingHours"        jsonb,
  "googleMapsUrl"       text,
  "currentlyOpen"       boolean,
  "businessStatus"      varchar(50)
);
CREATE INDEX location_org_idx ON gmb.locations ("orgId");
CREATE TRIGGER trg_locations_updated_at BEFORE UPDATE ON gmb.locations
  FOR EACH ROW EXECUTE FUNCTION gmb.set_updated_at();

-- Encrypted Google OAuth tokens. On disconnect, DELETE the row (tokens gone).
CREATE TABLE gmb.google_connections (
  id                  varchar(36)  PRIMARY KEY,
  "orgId"             varchar(36)  NOT NULL REFERENCES gmb.organizations (id) ON DELETE CASCADE,
  "locationId"        varchar(36),
  "googleAccountId"   varchar(191),
  "accessTokenEnc"    text         NOT NULL,     -- AES-256-GCM
  "refreshTokenEnc"   text,                      -- AES-256-GCM
  scope               varchar(512),
  "expiresAt"         timestamptz(3),
  status              varchar(16)  NOT NULL DEFAULT 'active'
                      CHECK (status IN ('active', 'revoked', 'expired')),
  "connectedByUserId" varchar(36),
  "createdAt"         timestamptz(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"         timestamptz(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX gconn_org_idx ON gmb.google_connections ("orgId");
CREATE TRIGGER trg_google_connections_updated_at BEFORE UPDATE ON gmb.google_connections
  FOR EACH ROW EXECUTE FUNCTION gmb.set_updated_at();

-- ---------------------------------------------------------------------------
-- Health Score + prioritized action queue (consent-led edits)
-- ---------------------------------------------------------------------------
CREATE TABLE gmb.health_scores (
  id           varchar(36) PRIMARY KEY,
  "locationId" varchar(36) NOT NULL REFERENCES gmb.locations (id) ON DELETE CASCADE,
  overall      integer     NOT NULL,
  breakdown    jsonb,                            -- {category:{score,max,evidence[],confidence}}
  "computedAt" timestamptz(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX score_loc_idx ON gmb.health_scores ("locationId", "computedAt");

CREATE TABLE gmb.location_issues (
  id                 varchar(36)  PRIMARY KEY,
  "locationId"       varchar(36)  NOT NULL REFERENCES gmb.locations (id) ON DELETE CASCADE,
  category           varchar(48),
  field              varchar(48),                -- structured field key (drives protected-consent)
  severity           varchar(16)  NOT NULL DEFAULT 'warning'
                     CHECK (severity IN ('critical', 'warning', 'info')),
  title              varchar(255) NOT NULL,
  description        text,
  "currentValue"     text,
  "recommendedValue" text,
  rationale          text,
  "expectedEffect"   text,
  protected          boolean      NOT NULL DEFAULT false,
  status             varchar(24)  NOT NULL DEFAULT 'open'
                     CHECK (status IN ('open', 'pending_approval', 'approved', 'published', 'failed', 'dismissed')),
  "approvedByUserId" varchar(36),
  "approvedAt"       timestamptz(3),
  "googleResult"     text,
  "publishedAt"      timestamptz(3),
  "createdAt"        timestamptz(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"        timestamptz(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX issue_loc_idx ON gmb.location_issues ("locationId", status);
CREATE TRIGGER trg_location_issues_updated_at BEFORE UPDATE ON gmb.location_issues
  FOR EACH ROW EXECUTE FUNCTION gmb.set_updated_at();

-- ---------------------------------------------------------------------------
-- Reviews (with sensitive-review classification) — 90-day retention
-- ---------------------------------------------------------------------------
CREATE TABLE gmb.reviews (
  id                   varchar(36)  PRIMARY KEY,
  "locationId"         varchar(36)  NOT NULL REFERENCES gmb.locations (id) ON DELETE CASCADE,
  "googleReviewId"     varchar(191),
  author               varchar(191),
  rating               smallint,
  text                 text,
  "createdAtGoogle"    timestamptz(3),
  sensitive            boolean      NOT NULL DEFAULT false,
  "sensitiveReasons"   varchar(255),             -- one_star|safety|medical|billing
  "replyDraft"         text,
  "replyStatus"        varchar(24)  NOT NULL DEFAULT 'none'
                       CHECK ("replyStatus" IN ('none', 'draft', 'pending_approval', 'published')),
  "repliedByUserId"    varchar(36),
  "repliedAt"          timestamptz(3),
  "retentionExpiresAt" timestamptz(3),           -- syncedAt + 90d
  "syncedAt"           timestamptz(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT review_google_key UNIQUE ("locationId", "googleReviewId")
);
CREATE INDEX review_loc_idx       ON gmb.reviews ("locationId", sensitive);
CREATE INDEX review_retention_idx ON gmb.reviews ("retentionExpiresAt");

-- ---------------------------------------------------------------------------
-- Content ops (Post Generator: posts / photos / Q&A) — approval → publish
-- ---------------------------------------------------------------------------
CREATE TABLE gmb.content_drafts (
  id                   varchar(36) PRIMARY KEY,
  "locationId"         varchar(36) NOT NULL REFERENCES gmb.locations (id) ON DELETE CASCADE,
  type                 varchar(16) NOT NULL CHECK (type IN ('post', 'photo', 'qa')),
  payload              jsonb,                    -- {text,mediaUrl,cta,question,answer,...}
  "policyCheck"        jsonb,                    -- {passed:bool, flags:[...]}
  status               varchar(24) NOT NULL DEFAULT 'draft'
                       CHECK (status IN ('draft', 'pending_approval', 'approved', 'scheduled', 'published', 'failed')),
  "scheduledFor"       timestamptz(3),
  "publishedAt"        timestamptz(3),
  "googleResult"       text,
  "retentionExpiresAt" timestamptz(3),           -- generated drafts: 90d
  "createdByUserId"    varchar(36),
  "approvedByUserId"   varchar(36),
  "createdAt"          timestamptz(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"          timestamptz(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX draft_loc_idx ON gmb.content_drafts ("locationId", status);
CREATE TRIGGER trg_content_drafts_updated_at BEFORE UPDATE ON gmb.content_drafts
  FOR EACH ROW EXECUTE FUNCTION gmb.set_updated_at();

-- QR Generator: review-request standees, etc.
CREATE TABLE gmb.qr_assets (
  id           varchar(36)  PRIMARY KEY,
  "locationId" varchar(36)  NOT NULL REFERENCES gmb.locations (id) ON DELETE CASCADE,
  type         varchar(24)  NOT NULL DEFAULT 'review_request'
               CHECK (type IN ('review_request', 'profile', 'custom')),
  label        varchar(191),
  "targetUrl"  varchar(512) NOT NULL,
  "createdAt"  timestamptz(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX qr_loc_idx ON gmb.qr_assets ("locationId");

-- ---------------------------------------------------------------------------
-- Billing (Razorpay + GST)
-- ---------------------------------------------------------------------------
CREATE TABLE gmb.subscriptions (
  id                       varchar(36)  PRIMARY KEY,
  "orgId"                  varchar(36)  NOT NULL REFERENCES gmb.organizations (id) ON DELETE CASCADE,
  "planId"                 varchar(48)  NOT NULL,
  "razorpaySubscriptionId" varchar(191),
  status                   varchar(16)  NOT NULL DEFAULT 'created'
                           CHECK (status IN ('created', 'active', 'past_due', 'cancelled')),
  "currentPeriodEnd"       timestamptz(3),
  "createdAt"              timestamptz(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"              timestamptz(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX sub_org_idx ON gmb.subscriptions ("orgId");
CREATE TRIGGER trg_subscriptions_updated_at BEFORE UPDATE ON gmb.subscriptions
  FOR EACH ROW EXECUTE FUNCTION gmb.set_updated_at();

CREATE TABLE gmb.invoices (
  id                  varchar(36)  PRIMARY KEY,
  "orgId"             varchar(36)  NOT NULL REFERENCES gmb.organizations (id) ON DELETE CASCADE,
  "subscriptionId"    varchar(36),
  "razorpayInvoiceId" varchar(191),
  "amountInr"         integer      NOT NULL,
  "gstAmountInr"      integer      NOT NULL DEFAULT 0,
  status              varchar(16)  NOT NULL DEFAULT 'issued'
                      CHECK (status IN ('issued', 'paid', 'failed', 'refunded')),
  "pdfUrl"            varchar(512),
  "issuedAt"          timestamptz(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX invoice_org_idx ON gmb.invoices ("orgId");

-- ---------------------------------------------------------------------------
-- Public instant-audit leads (no login). Values come straight from the
-- Google Places API / the visitor and are not truncated by the app → text.
-- ---------------------------------------------------------------------------
CREATE TABLE gmb.public_audits (
  id               varchar(36) PRIMARY KEY,
  "placeId"        text,
  name             text,
  address          text,
  phone            text,
  website          text,
  city             text,
  category         text,
  rating           numeric(2, 1),
  "reviewCount"    integer,
  score            integer,
  issues           jsonb,
  "leadPhone"      text,                         -- if the visitor left a number
  "convertedOrgId" varchar(36),                  -- set if they registered
  "createdAt"      timestamptz(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX pa_place_idx   ON gmb.public_audits ("placeId");
CREATE INDEX pa_created_idx ON gmb.public_audits ("createdAt");

-- ---------------------------------------------------------------------------
-- Immutable audit log (append-only; never UPDATE/DELETE)
-- ---------------------------------------------------------------------------
CREATE TABLE gmb.audit_events (
  id            varchar(36) PRIMARY KEY,
  "orgId"       varchar(36),
  "actorUserId" varchar(36),
  action        varchar(64) NOT NULL,             -- login|consent|edit_publish|review_reply|export|google_connect|...
  "targetType"  varchar(48),
  "targetId"    text,                             -- may be a Google place id (up to 300 chars)
  meta          jsonb,                            -- before/after, google result, etc.
  ip            varchar(64),
  "createdAt"   timestamptz(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX audit_org_idx    ON gmb.audit_events ("orgId", "createdAt");
CREATE INDEX audit_action_idx ON gmb.audit_events (action, "createdAt");
