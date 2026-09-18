-- Fixture data for the Gmb (Vite/Express/mysql2) MySQL source. Test data only.
SET NAMES utf8mb4;
INSERT INTO users (id, phone, name, email, isSuperAdmin, lastLoginAt, createdAt, updatedAt) VALUES
 ('11111111-1111-4111-8111-111111111111', '+919812300001', 'Dr. Jane Rao', 'jane@example.com', 0, '2026-03-01 10:00:00.250', '2026-02-01 10:00:00.000', '2026-03-01 10:00:00.250'),
 ('22222222-2222-4222-8222-222222222222', '+919812300002', 'Platform Staff', NULL, 1, NULL, '2026-02-01 10:00:00.000', '2026-02-01 10:00:00.000');

INSERT INTO organizations (id, name, ownerUserId, planId, status, createdAt, updatedAt) VALUES
 ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', 'Rao Dental Group', '11111111-1111-4111-8111-111111111111', 'pro', 'active', '2026-02-01 10:05:00.000', '2026-02-01 10:05:00.000');

INSERT INTO memberships (id, userId, orgId, role, status, createdAt) VALUES
 ('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb', '11111111-1111-4111-8111-111111111111', 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', 'clinic_admin', 'active', '2026-02-01 10:05:00.000');

INSERT INTO otp_codes (id, phone, codeHash, purpose, attempts, expiresAt, consumedAt, createdAt) VALUES
 ('cccccccc-cccc-4ccc-8ccc-cccccccccccc', '+919812300001', 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855', 'login', 0, '2026-03-01 10:05:00.000', '2026-03-01 10:01:00.000', '2026-03-01 10:00:00.000');

INSERT INTO sessions (id, userId, orgId, ip, userAgent, expiresAt, revokedAt, createdAt) VALUES
 ('d0d0d0d0d0d0d0d0d0d0d0d0d0d0d0d0d0d0d0d0d0d0d0d0d0d0d0d0d0d0d0d0', '11111111-1111-4111-8111-111111111111', 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', '203.0.113.5', 'Mozilla/5.0', '2026-04-01 10:00:00.000', NULL, '2026-03-01 10:00:00.000');

INSERT INTO locations (id, orgId, name, primaryCategory, city, locality, address, phone, website, email, googleLocationId, placeId, status, completionScore,
  lastSyncedAt, createdAt, updatedAt, secondaryCategories, latitude, longitude, rating, reviewCount, priceLevel, openingHours, googleMapsUrl, currentlyOpen, businessStatus) VALUES
 ('eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee', 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', 'Rao Dental – Indiranagar', 'categories/gcid:dentist', 'Bengaluru', 'Indiranagar',
  '12, 100 Feet Rd', '+91 80 1234 5678', 'https://raodental.example', 'hello@raodental.example', 'locations/123456789', 'ChIJ_fixture_place_id', 'connected', 78,
  '2026-03-01 11:00:00.000', '2026-02-01 10:10:00.000', '2026-03-01 11:00:00.000', '["categories/gcid:orthodontist","categories/gcid:cosmetic_dentist"]',
  12.97160000, 77.64120000, 4.70, 212, NULL, '{"periods":[{"openDay":"MONDAY","openTime":{"hours":9}}]}', 'https://maps.google.com/?cid=1', 1, 'OPERATIONAL');

INSERT INTO google_connections (id, orgId, locationId, googleAccountId, accessTokenEnc, refreshTokenEnc, scope, expiresAt, status, connectedByUserId, createdAt, updatedAt) VALUES
 ('ffffffff-ffff-4fff-8fff-ffffffffffff', 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', NULL, 'accounts/1', 'iv:cipher:tag', NULL, 'business.manage', '2026-03-01 12:00:00.000', 'active', '11111111-1111-4111-8111-111111111111', '2026-03-01 11:00:00.000', '2026-03-01 11:00:00.000');

INSERT INTO location_issues (id, locationId, category, field, severity, title, description, protected, status, createdAt, updatedAt) VALUES
 ('12121212-1212-4212-8212-121212121212', 'eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee', 'core_profile', 'website', 'warning', 'Add a website', 'Profile has no website', 0, 'open', '2026-03-01 11:05:00.000', '2026-03-01 11:05:00.000');

INSERT INTO reviews (id, locationId, googleReviewId, author, rating, `text`, `sensitive`, sensitiveReasons, replyStatus, syncedAt) VALUES
 ('13131313-1313-4313-8313-131313131313', 'eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee', 'rev-1', 'A patient', 1, 'Billing issue 😞', 1, 'one_star,billing', 'none', '2026-03-01 11:10:00.000');

INSERT INTO public_audits (id, placeId, name, address, phone, website, city, category, rating, reviewCount, score, issues, leadPhone, createdAt) VALUES
 ('14141414-1414-4414-8414-141414141414', 'ChIJ_fixture_place_id', 'Rao Dental', 'Indiranagar, Bengaluru', '+91 80 1234 5678', NULL, 'Bengaluru', 'Dentist', 4.7, 212, 64, '["no_website","few_photos"]', '+919812300001', '2026-01-30 09:00:00.000');

INSERT INTO audit_events (id, orgId, actorUserId, action, targetType, targetId, meta, ip, createdAt) VALUES
 ('15151515-1515-4515-8515-151515151515', 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', '11111111-1111-4111-8111-111111111111', 'login', NULL, NULL, '{"firstLogin":false}', '203.0.113.5', '2026-03-01 10:01:00.000');
