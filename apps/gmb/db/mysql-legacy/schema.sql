-- ============================================================================
-- Gmb — multi-tenant schema (MySQL / MariaDB, Hostinger)
-- Target: a dedicated `gmb` database (separate from the audit CRM).
-- Engine: InnoDB, utf8mb4. IDs: app-generated UUIDs (crypto.randomUUID()).
-- Scope: V1 (Overview, Health Score, Review Reply, Post Generator, QR).
--        Keyword tool + geo-grid tables intentionally deferred.
-- NOTE: connect with MYSQL_HOST=127.0.0.1 (NOT localhost) — same host gotcha
--       as the audit tool / website.
-- ============================================================================

-- ---------------------------------------------------------------------------
-- Identity & access
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS `users` (
  `id`           CHAR(36)     NOT NULL,
  `phone`        VARCHAR(20)  NOT NULL,           -- E.164, WhatsApp OTP identity
  `name`         VARCHAR(191) NULL,
  `email`        VARCHAR(191) NULL,
  `isSuperAdmin` TINYINT(1)   NOT NULL DEFAULT 0, -- platform staff (internal)
  `lastLoginAt`  DATETIME(3)  NULL,
  `createdAt`    DATETIME(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt`    DATETIME(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  UNIQUE KEY `users_phone_key` (`phone`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `organizations` (
  `id`          CHAR(36)     NOT NULL,
  `name`        VARCHAR(191) NOT NULL,
  `ownerUserId` CHAR(36)     NULL,
  `planId`      VARCHAR(48)  NULL,
  `status`      ENUM('active','suspended','cancelled') NOT NULL DEFAULT 'active',
  `createdAt`   DATETIME(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt`   DATETIME(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  KEY `org_owner_idx` (`ownerUserId`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- User ↔ Organization with role (RBAC). Super Admin is the platform flag above.
CREATE TABLE IF NOT EXISTS `memberships` (
  `id`        CHAR(36) NOT NULL,
  `userId`    CHAR(36) NOT NULL,
  `orgId`     CHAR(36) NOT NULL,
  `role`      ENUM('clinic_admin','location_manager','content_reviewer','analyst') NOT NULL,
  `status`    ENUM('active','invited','removed') NOT NULL DEFAULT 'active',
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  UNIQUE KEY `membership_user_org` (`userId`,`orgId`),
  KEY `membership_org_idx` (`orgId`),
  CONSTRAINT `fk_membership_user` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_membership_org`  FOREIGN KEY (`orgId`)  REFERENCES `organizations`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- WhatsApp OTP codes (hashed). Purpose separates login vs sensitive re-verify.
CREATE TABLE IF NOT EXISTS `otp_codes` (
  `id`         CHAR(36)    NOT NULL,
  `phone`      VARCHAR(20) NOT NULL,
  `codeHash`   VARCHAR(191) NOT NULL,             -- store hash, never the code
  `purpose`    ENUM('login','sensitive') NOT NULL DEFAULT 'login',
  `attempts`   INT         NOT NULL DEFAULT 0,
  `expiresAt`  DATETIME(3) NOT NULL,
  `consumedAt` DATETIME(3) NULL,
  `createdAt`  DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  KEY `otp_phone_idx` (`phone`,`createdAt`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `sessions` (
  `id`        CHAR(64) NOT NULL,                  -- opaque session token
  `userId`    CHAR(36) NOT NULL,
  `orgId`     CHAR(36) NULL,                      -- active org context
  `ip`        VARCHAR(64)  NULL,
  `userAgent` VARCHAR(255) NULL,
  `expiresAt` DATETIME(3) NOT NULL,
  `revokedAt` DATETIME(3) NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  KEY `session_user_idx` (`userId`),
  CONSTRAINT `fk_session_user` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ---------------------------------------------------------------------------
-- Clinic locations (the GBP profile) + Google connection
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS `locations` (
  `id`               CHAR(36)     NOT NULL,
  `orgId`            CHAR(36)     NOT NULL,
  `name`             VARCHAR(191) NOT NULL,
  `primaryCategory`  VARCHAR(191) NULL,
  `city`             VARCHAR(120) NULL,
  `locality`         VARCHAR(120) NULL,
  `address`          VARCHAR(512) NULL,
  `phone`            VARCHAR(40)  NULL,
  `website`          VARCHAR(512) NULL,
  `email`            VARCHAR(191) NULL,
  `googleLocationId` VARCHAR(191) NULL,           -- Google resource name
  `placeId`          VARCHAR(191) NULL,
  `status`           ENUM('draft','connected','disconnected') NOT NULL DEFAULT 'draft',
  `completionScore`  INT          NULL,
  `lastSyncedAt`     DATETIME(3)  NULL,
  `createdAt`        DATETIME(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt`        DATETIME(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  KEY `location_org_idx` (`orgId`),
  CONSTRAINT `fk_location_org` FOREIGN KEY (`orgId`) REFERENCES `organizations`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Encrypted Google OAuth tokens. On disconnect, DELETE the row (tokens gone).
CREATE TABLE IF NOT EXISTS `google_connections` (
  `id`               CHAR(36)     NOT NULL,
  `orgId`            CHAR(36)     NOT NULL,
  `locationId`       CHAR(36)     NULL,
  `googleAccountId`  VARCHAR(191) NULL,
  `accessTokenEnc`   TEXT         NOT NULL,       -- AES-encrypted
  `refreshTokenEnc`  TEXT         NULL,           -- AES-encrypted
  `scope`            VARCHAR(512) NULL,
  `expiresAt`        DATETIME(3)  NULL,
  `status`           ENUM('active','revoked','expired') NOT NULL DEFAULT 'active',
  `connectedByUserId` CHAR(36)    NULL,
  `createdAt`        DATETIME(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt`        DATETIME(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  KEY `gconn_org_idx` (`orgId`),
  CONSTRAINT `fk_gconn_org` FOREIGN KEY (`orgId`) REFERENCES `organizations`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ---------------------------------------------------------------------------
-- Health Score + prioritized action queue (consent-led edits)
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS `health_scores` (
  `id`         CHAR(36) NOT NULL,
  `locationId` CHAR(36) NOT NULL,
  `overall`    INT      NOT NULL,
  `breakdown`  JSON     NULL,                     -- {category:{score,max,evidence[],confidence}}
  `computedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  KEY `score_loc_idx` (`locationId`,`computedAt`),
  CONSTRAINT `fk_score_loc` FOREIGN KEY (`locationId`) REFERENCES `locations`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `location_issues` (
  `id`               CHAR(36)     NOT NULL,
  `locationId`       CHAR(36)     NOT NULL,
  `category`         VARCHAR(48)  NULL,           -- identity_nap | core_profile | patient_access | trust | content | visibility
  `field`            VARCHAR(48)  NULL,           -- structured field key (drives protected-consent)
  `severity`         ENUM('critical','warning','info') NOT NULL DEFAULT 'warning',
  `title`            VARCHAR(255) NOT NULL,
  `description`      TEXT         NULL,
  `currentValue`     TEXT         NULL,
  `recommendedValue` TEXT         NULL,
  `rationale`        TEXT         NULL,
  `expectedEffect`   TEXT         NULL,
  `protected`        TINYINT(1)   NOT NULL DEFAULT 0, -- name/address/primaryCategory/hours/apptUrl/practitioner
  `status`           ENUM('open','pending_approval','approved','published','failed','dismissed') NOT NULL DEFAULT 'open',
  `approvedByUserId` CHAR(36)     NULL,
  `approvedAt`       DATETIME(3)  NULL,
  `googleResult`     TEXT         NULL,           -- result record from Google API
  `publishedAt`      DATETIME(3)  NULL,
  `createdAt`        DATETIME(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt`        DATETIME(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  KEY `issue_loc_idx` (`locationId`,`status`),
  CONSTRAINT `fk_issue_loc` FOREIGN KEY (`locationId`) REFERENCES `locations`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ---------------------------------------------------------------------------
-- Reviews (with sensitive-review classification) — 90-day retention
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS `reviews` (
  `id`                CHAR(36)     NOT NULL,
  `locationId`        CHAR(36)     NOT NULL,
  `googleReviewId`    VARCHAR(191) NULL,
  `author`            VARCHAR(191) NULL,
  `rating`            TINYINT      NULL,
  `text`              TEXT         NULL,
  `createdAtGoogle`   DATETIME(3)  NULL,
  `sensitive`         TINYINT(1)   NOT NULL DEFAULT 0,
  `sensitiveReasons`  VARCHAR(255) NULL,           -- one_star|safety|medical|billing
  `replyDraft`        TEXT         NULL,
  `replyStatus`       ENUM('none','draft','pending_approval','published') NOT NULL DEFAULT 'none',
  `repliedByUserId`   CHAR(36)     NULL,
  `repliedAt`         DATETIME(3)  NULL,
  `retentionExpiresAt` DATETIME(3) NULL,           -- syncedAt + 90d
  `syncedAt`          DATETIME(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  UNIQUE KEY `review_google_key` (`locationId`,`googleReviewId`),
  KEY `review_loc_idx` (`locationId`,`sensitive`),
  KEY `review_retention_idx` (`retentionExpiresAt`),
  CONSTRAINT `fk_review_loc` FOREIGN KEY (`locationId`) REFERENCES `locations`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ---------------------------------------------------------------------------
-- Content ops (Post Generator: posts / photos / Q&A) — approval → publish
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS `content_drafts` (
  `id`               CHAR(36) NOT NULL,
  `locationId`       CHAR(36) NOT NULL,
  `type`             ENUM('post','photo','qa') NOT NULL,
  `payload`          JSON     NULL,               -- {text,mediaUrl,cta,question,answer,...}
  `policyCheck`      JSON     NULL,               -- {passed:bool, flags:[...]}
  `status`           ENUM('draft','pending_approval','approved','scheduled','published','failed') NOT NULL DEFAULT 'draft',
  `scheduledFor`     DATETIME(3) NULL,
  `publishedAt`      DATETIME(3) NULL,
  `googleResult`     TEXT     NULL,
  `retentionExpiresAt` DATETIME(3) NULL,           -- generated drafts: 90d
  `createdByUserId`  CHAR(36) NULL,
  `approvedByUserId` CHAR(36) NULL,
  `createdAt`        DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt`        DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  KEY `draft_loc_idx` (`locationId`,`status`),
  CONSTRAINT `fk_draft_loc` FOREIGN KEY (`locationId`) REFERENCES `locations`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- QR Generator: review-request standees, etc.
CREATE TABLE IF NOT EXISTS `qr_assets` (
  `id`         CHAR(36) NOT NULL,
  `locationId` CHAR(36) NOT NULL,
  `type`       ENUM('review_request','profile','custom') NOT NULL DEFAULT 'review_request',
  `label`      VARCHAR(191) NULL,
  `targetUrl`  VARCHAR(512) NOT NULL,
  `createdAt`  DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  KEY `qr_loc_idx` (`locationId`),
  CONSTRAINT `fk_qr_loc` FOREIGN KEY (`locationId`) REFERENCES `locations`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ---------------------------------------------------------------------------
-- Billing (Razorpay + GST) — plans can also live in code config
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS `subscriptions` (
  `id`                     CHAR(36) NOT NULL,
  `orgId`                  CHAR(36) NOT NULL,
  `planId`                 VARCHAR(48) NOT NULL,
  `razorpaySubscriptionId` VARCHAR(191) NULL,
  `status`                 ENUM('created','active','past_due','cancelled') NOT NULL DEFAULT 'created',
  `currentPeriodEnd`       DATETIME(3) NULL,
  `createdAt`              DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt`              DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  KEY `sub_org_idx` (`orgId`),
  CONSTRAINT `fk_sub_org` FOREIGN KEY (`orgId`) REFERENCES `organizations`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `invoices` (
  `id`               CHAR(36) NOT NULL,
  `orgId`            CHAR(36) NOT NULL,
  `subscriptionId`   CHAR(36) NULL,
  `razorpayInvoiceId` VARCHAR(191) NULL,
  `amountInr`        INT NOT NULL,
  `gstAmountInr`     INT NOT NULL DEFAULT 0,
  `status`           ENUM('issued','paid','failed','refunded') NOT NULL DEFAULT 'issued',
  `pdfUrl`           VARCHAR(512) NULL,
  `issuedAt`         DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  KEY `invoice_org_idx` (`orgId`),
  CONSTRAINT `fk_invoice_org` FOREIGN KEY (`orgId`) REFERENCES `organizations`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ---------------------------------------------------------------------------
-- Public instant-audit leads (Vizup-style front door). Every business a
-- visitor searches + audits is captured here as a lead — no login required.
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS `public_audits` (
  `id`          CHAR(36)     NOT NULL,
  `placeId`     VARCHAR(191) NULL,
  `name`        VARCHAR(191) NULL,
  `address`     VARCHAR(512) NULL,
  `phone`       VARCHAR(40)  NULL,
  `website`     VARCHAR(512) NULL,
  `city`        VARCHAR(120) NULL,
  `category`    VARCHAR(191) NULL,
  `rating`      DECIMAL(2,1) NULL,
  `reviewCount` INT          NULL,
  `score`       INT          NULL,
  `issues`      JSON         NULL,
  `leadPhone`   VARCHAR(20)  NULL,           -- if the visitor left a number
  `convertedOrgId` CHAR(36)  NULL,           -- set if they registered
  `createdAt`   DATETIME(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  KEY `pa_place_idx` (`placeId`),
  KEY `pa_created_idx` (`createdAt`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ---------------------------------------------------------------------------
-- Immutable audit log (append-only; never UPDATE/DELETE)
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS `audit_events` (
  `id`          CHAR(36) NOT NULL,
  `orgId`       CHAR(36) NULL,
  `actorUserId` CHAR(36) NULL,
  `action`      VARCHAR(64) NOT NULL,             -- login|consent|edit_publish|review_reply|export|google_connect|...
  `targetType`  VARCHAR(48) NULL,
  `targetId`    VARCHAR(64) NULL,
  `meta`        JSON     NULL,                    -- before/after, google result, etc.
  `ip`          VARCHAR(64) NULL,
  `createdAt`   DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  KEY `audit_org_idx` (`orgId`,`createdAt`),
  KEY `audit_action_idx` (`action`,`createdAt`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
