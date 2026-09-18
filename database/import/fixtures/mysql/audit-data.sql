-- Fixture data for the Audit (Express/mysql2) MySQL source. Test data only.
SET NAMES utf8mb4;
-- Allow one legacy zero-date row (old MariaDB/MySQL installs without NO_ZERO_DATE).
SET SESSION sql_mode = '';

INSERT INTO admin_users (id, username, passwordHash, role, active, createdAt, lastLoginAt, email, totpEnabled, displayName, joinDate) VALUES
 (1, 'admin', 'scrypt$00112233445566778899aabbccddeeff$0000', 'admin', 1, '2026-01-01 00:00:00', '2026-03-10 08:00:00', 'owner@example.com', 0, 'Owner', '2025-12-01'),
 (2, 'Caller.Two', 'scrypt$ffeeddccbbaa99887766554433221100$1111', 'caller', 1, '2026-01-05 00:00:00', NULL, NULL, 1, NULL, NULL);

INSERT INTO settings (keyName, keyValue, updatedAt) VALUES
 ('GA4_ID', 'G-TEST12345', '2026-02-01 00:00:00'),
 ('MAINTENANCE_MODE', 'off', '2026-02-01 00:00:00');

INSERT INTO leads (id, name, clinicName, clinicType, city, website, phone, ads, primaryGoal, auditScore, reportUrl, createdAt) VALUES
 (1, 'Dr. Nair', 'Nair Dental', 'Dentist', 'Kochi', 'https://nair.example', '+91 98470 00001', 'google', 'more patients', 62, '/api/report/sess0001', '2026-02-10 10:00:00'),
 (7, 'Dr. Gill', 'Gill Ortho', 'Orthopedic', 'Ludhiana', '', '9876500007', '', 'growclinic-site', 0, '', '2026-02-11 11:00:00');

INSERT INTO chat_sessions (sessionId, startedAt, lastActivityAt, completed, userMsgCount, aiMsgCount, clinicName, userName, city, phone, websiteUrl,
  leadCaptured, reportUrl, transcript, ipHash, userAgent, source, channel, campaign, verified, otpSent, returningClient, reportViewed,
  crmStatus, crmNotes, crmUpdatedAt, crmFollowUpAt, email, country, specialty, crmRating, crmDealValue, crmRemarks, crmTags, lostReason,
  crmAiSummary, gcalEventId, ownerId, assignedAt, phoneE164, gclid, landingPage, referrer) VALUES
 ('sess0001', '2026-02-10 09:50:00', '2026-02-10 10:05:00', 1, 9, 10, 'Nair Dental', 'Dr. Nair', 'Kochi', '+91 98470 00001', 'https://nair.example',
  1, '/api/report/sess0001', 'user: hi\nassistant: hello 👋', 'abc123', 'Mozilla/5.0', 'growclinic-site', 'direct', 'spring', 1, 1, 0, 1,
  'meeting_scheduled', 'Call Tuesday', '2026-02-12 08:00:00', '2026-02-14 05:30:00', 'nair@example.com', 'IN', 'Dentist', 'hot', 25000,
  '[{"by":"admin","at":"2026-02-12T08:00:00.000Z","text":"interested"}]', 'vip,dental', NULL,
  '{"at":"2026-02-12","summary":"warm lead"}', 'gcal_evt_1', 2, '2026-02-11 00:00:00', '919847000001', 'gclid-xyz', '/?utm_source=google', 'https://google.com'),
 ('sess0002', '2026-02-11 12:00:00', '2026-02-11 12:01:00', 0, 0, 0, NULL, NULL, NULL, NULL, NULL,
  0, NULL, NULL, 'def456', 'curl/8', 'meta', 'meta_ads', NULL, 0, 0, 0, 0,
  NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL,
  NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL);

INSERT INTO admin_sessions (token, createdAt, expiresAt, ipHash, userId, role) VALUES
 ('0f0e0d0c0b0a09080706050403020100ffeeddccbbaa99887766554433221100', '2026-03-10 08:00:00', 1773129600000, 'abc123', 1, 'admin');

INSERT INTO admin_login_attempts (id, ipHash, attemptedAt, success) VALUES (1, 'abc123', '2026-03-10 07:59:00', 0), (2, 'abc123', '2026-03-10 08:00:00', 1);

INSERT INTO popup_leads (id, name, phone, email, source, sessionId, utmSource, utmCampaign, referrer, converted, ipHash, createdAt) VALUES
 (1, 'Popup Person', '9000000001', 'pop@example.com', 'entry_popup', 'sess0002', 'meta', 'spring', 'https://facebook.com', 0, 'def456', '2026-02-11 12:00:30');

INSERT INTO admin_logs (id, action, detail, ipHash, createdAt) VALUES (1, 'login', 'admin', 'abc123', '2026-03-10 08:00:00');

INSERT INTO api_usage (id, provider, model, operation, sessionId, promptTokens, completionTokens, totalTokens, requests, success, error, loggedAt) VALUES
 (1, 'gemini', 'gemini-2.5-flash', 'chat', 'sess0001', 1200, 300, 1500, 1, 1, NULL, '2026-02-10 09:55:00'),
 (2, 'openai', 'gpt-4.1', 'report', 'sess0001', 5000, 2000, 7000, 1, 0, 'rate limited', '2026-02-10 10:00:00');

-- dueAt zero-date: must import as NULL (reported)
INSERT INTO lead_tasks (id, sessionId, title, dueAt, doneAt, createdBy, createdAt) VALUES
 (1, 'sess0001', 'Send proposal', '2026-02-15 06:00:00', NULL, 'admin', '2026-02-12 08:00:00'),
 (2, 'sess0001', 'Legacy task', '0000-00-00 00:00:00', NULL, 'admin', '2026-02-12 08:01:00');

INSERT INTO lead_events (id, sessionId, type, detail, actor, at) VALUES
 (1, 'sess0001', 'created', 'growclinic-site', 'system', '2026-02-10 10:00:00'),
 (2, 'sess_deleted', 'update', 'history kept after lead deletion (soft reference)', 'system', '2026-01-01 00:00:00');

INSERT INTO raw_events (id, channel, sessionId, payload, status, receivedAt) VALUES
 (1, 'meta', NULL, '{"leadgen_id":"123"}', 'ok', '2026-02-11 12:00:00');

INSERT INTO automation_rules (id, name, trigger_, conditions, actions, enabled, createdBy, createdAt) VALUES
 (1, 'Hot lead alert', 'lead.created', '{"rating":"hot"}', '[{"type":"email"}]', 1, 'admin', '2026-01-20 00:00:00');
INSERT INTO automation_runs (id, ruleId, sessionId, trigger_, result, dryRun, at) VALUES
 (1, 1, 'sess0001', 'lead.created', 'ok', 0, '2026-02-10 10:00:01');

INSERT INTO failed_crm_events (id, event, sessionId, target, payload, attempts, nextRetryAt, lastError, createdAt) VALUES
 (1, 'lead.created', 'sess0001', 'n8n', '{"a":1}', 2, '2026-03-11 00:00:00', 'ECONNREFUSED', '2026-03-10 00:00:00');

-- userId 99 does not exist: a legacy orphan that must be preserved and reported
INSERT INTO xp_ledger (id, userId, event, points, refId, createdAt) VALUES
 (1, 1, 'checkin_morning', 5, '2026-03-10:morning', '2026-03-10 04:00:00'),
 (2, 99, 'task_complete', 10, 'ref-old', '2025-12-01 00:00:00');

INSERT INTO checkins (id, userId, checkinDate, checkinType, payload, createdAt) VALUES
 (1, 1, '2026-03-10', 'morning', '{"plan":"calls"}', '2026-03-10 04:00:00');

INSERT INTO notification_prefs (userId, notifKey, enabled, updatedAt) VALUES (1, 'daily_digest', 1, '2026-03-01 00:00:00'), (2, 'new_lead', 0, '2026-03-01 00:00:00');
