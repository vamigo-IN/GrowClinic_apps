-- ============================================================================
-- GrowClinic Audit — MySQL-era schema (REFERENCE ONLY, not used by the platform)
--
-- Reconstructed verbatim from the pre-PostgreSQL apps/audit/db.js, which built
-- the schema at boot with CREATE TABLE IF NOT EXISTS plus ~40 defensive
-- `ALTER TABLE … ADD COLUMN` calls. This file is the FINAL column set of that
-- process (the shape a long-running production database converged to).
--
-- Used by: database/import (source mapping) and the import fixture test.
-- The PostgreSQL schema is database/migrations/audit/0001_init.sql.
-- ============================================================================

CREATE TABLE IF NOT EXISTS leads (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name          VARCHAR(255),
    clinicName    VARCHAR(255),
    clinicType    VARCHAR(255),
    city          VARCHAR(255),
    website       VARCHAR(512),
    phone         VARCHAR(64),
    googleTraffic VARCHAR(64),
    ads           VARCHAR(64),
    monthlyVolume VARCHAR(64),
    primaryGoal   VARCHAR(512),
    auditScore    INT DEFAULT 0,
    reportUrl     VARCHAR(512),
    createdAt     DATETIME DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS settings (
    keyName   VARCHAR(128) PRIMARY KEY,
    keyValue  TEXT,
    updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS chat_sessions (
    sessionId       VARCHAR(64) PRIMARY KEY,
    startedAt       DATETIME DEFAULT CURRENT_TIMESTAMP,
    lastActivityAt  DATETIME DEFAULT CURRENT_TIMESTAMP,
    completed       TINYINT DEFAULT 0,
    userMsgCount    INT DEFAULT 0,
    aiMsgCount      INT DEFAULT 0,
    clinicName      VARCHAR(255),
    userName        VARCHAR(255),
    city            VARCHAR(255),
    phone           VARCHAR(64),
    websiteUrl      VARCHAR(512),
    leadCaptured    TINYINT DEFAULT 0,
    reportUrl       VARCHAR(512),
    transcript      MEDIUMTEXT,
    ipHash          VARCHAR(64),
    userAgent       VARCHAR(255),
    source          VARCHAR(64),
    channel         VARCHAR(64),
    campaign        VARCHAR(128),
    verified        TINYINT DEFAULT 0,
    otpSent         TINYINT DEFAULT 0,
    returningClient TINYINT DEFAULT 0,
    reportViewed    TINYINT DEFAULT 0,
    crmStatus       VARCHAR(24),
    crmNotes        TEXT,
    crmUpdatedAt    DATETIME,
    crmFollowUpAt   DATETIME,
    email           VARCHAR(255),
    country         VARCHAR(64),
    specialty       VARCHAR(120),
    crmRating       VARCHAR(8),
    crmDealValue    INT,
    crmRemarks      MEDIUMTEXT,
    crmTags         VARCHAR(255),
    lostReason      VARCHAR(64),
    crmAiSummary    MEDIUMTEXT,
    gcalEventId     VARCHAR(128),
    ownerId         INT NULL,
    assignedAt      DATETIME NULL,
    phoneE164       VARCHAR(20),
    gclid           VARCHAR(128),
    fbclid          VARCHAR(128),
    landingPage     VARCHAR(512),
    referrer        VARCHAR(512),
    adGroup         VARCHAR(128),
    keyword         VARCHAR(128),
    INDEX idx_chat_started (startedAt),
    INDEX idx_chat_completed (completed),
    INDEX idx_phone_e164 (phoneE164)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS admin_sessions (
    token     VARCHAR(64) PRIMARY KEY,
    createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
    expiresAt BIGINT NOT NULL,
    ipHash    VARCHAR(64),
    userId    INT NULL,
    role      VARCHAR(20) NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS admin_login_attempts (
    id          INT AUTO_INCREMENT PRIMARY KEY,
    ipHash      VARCHAR(64) NOT NULL,
    attemptedAt DATETIME DEFAULT CURRENT_TIMESTAMP,
    success     TINYINT DEFAULT 0,
    INDEX idx_admin_attempts (ipHash, attemptedAt)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS admin_users (
    id            INT AUTO_INCREMENT PRIMARY KEY,
    username      VARCHAR(64) UNIQUE NOT NULL,
    passwordHash  VARCHAR(255) NOT NULL,
    role          VARCHAR(20) NOT NULL DEFAULT 'caller',
    active        TINYINT DEFAULT 1,
    createdAt     DATETIME DEFAULT CURRENT_TIMESTAMP,
    lastLoginAt   DATETIME NULL,
    email         VARCHAR(255),
    totpSecret    VARCHAR(64) NULL,
    totpEnabled   TINYINT DEFAULT 0,
    totpPending   VARCHAR(64) NULL,
    inviteToken   VARCHAR(64) NULL,
    inviteExpires BIGINT NULL,
    displayName   VARCHAR(120) NULL,
    avatarUrl     VARCHAR(512) NULL,
    designation   VARCHAR(120) NULL,
    department    VARCHAR(120) NULL,
    linkedin      VARCHAR(255) NULL,
    phone         VARCHAR(40) NULL,
    location      VARCHAR(120) NULL,
    joinDate      DATE NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS popup_leads (
    id        INT AUTO_INCREMENT PRIMARY KEY,
    name      VARCHAR(255),
    phone     VARCHAR(64),
    email     VARCHAR(255),
    source    VARCHAR(32),
    sessionId VARCHAR(64),
    utmSource VARCHAR(128),
    utmCampaign VARCHAR(128),
    referrer  VARCHAR(512),
    converted TINYINT DEFAULT 0,
    ipHash    VARCHAR(64),
    createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_popup_created (createdAt),
    INDEX idx_popup_session (sessionId)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS admin_logs (
    id        INT AUTO_INCREMENT PRIMARY KEY,
    action    VARCHAR(64) NOT NULL,
    detail    VARCHAR(512),
    ipHash    VARCHAR(64),
    createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_admin_logs (createdAt)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS api_usage (
    id               INT AUTO_INCREMENT PRIMARY KEY,
    provider         VARCHAR(64) NOT NULL,
    model            VARCHAR(128),
    operation        VARCHAR(64),
    sessionId        VARCHAR(64),
    promptTokens     INT DEFAULT 0,
    completionTokens INT DEFAULT 0,
    totalTokens      INT DEFAULT 0,
    requests         INT DEFAULT 1,
    success          TINYINT DEFAULT 1,
    error            TEXT,
    loggedAt         DATETIME DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_usage_logged (loggedAt),
    INDEX idx_usage_provider (provider, loggedAt)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS lead_tasks (
    id        INT AUTO_INCREMENT PRIMARY KEY,
    sessionId VARCHAR(64),
    title     VARCHAR(255),
    dueAt     DATETIME NULL,
    doneAt    DATETIME NULL,
    createdBy VARCHAR(40),
    createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_task_session (sessionId),
    INDEX idx_task_due (dueAt)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS lead_events (
    id        INT AUTO_INCREMENT PRIMARY KEY,
    sessionId VARCHAR(64),
    type      VARCHAR(32),
    detail    VARCHAR(512),
    actor     VARCHAR(40),
    at        DATETIME DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_event_session (sessionId)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS raw_events (
    id         INT AUTO_INCREMENT PRIMARY KEY,
    channel    VARCHAR(32),
    sessionId  VARCHAR(64) NULL,
    payload    MEDIUMTEXT,
    status     VARCHAR(16) DEFAULT 'ok',
    receivedAt DATETIME DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_raw_channel (channel, receivedAt)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS automation_rules (
    id         INT AUTO_INCREMENT PRIMARY KEY,
    name       VARCHAR(120),
    trigger_   VARCHAR(32),
    conditions MEDIUMTEXT,
    actions    MEDIUMTEXT,
    enabled    TINYINT DEFAULT 1,
    createdBy  VARCHAR(40),
    createdAt  DATETIME DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS automation_runs (
    id        INT AUTO_INCREMENT PRIMARY KEY,
    ruleId    INT,
    sessionId VARCHAR(64),
    trigger_  VARCHAR(32),
    result    VARCHAR(255),
    dryRun    TINYINT DEFAULT 0,
    at        DATETIME DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_auto_runs (ruleId, at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS failed_crm_events (
    id INT AUTO_INCREMENT PRIMARY KEY,
    event VARCHAR(64) NOT NULL,
    sessionId VARCHAR(64) NOT NULL,
    target VARCHAR(32) NOT NULL,
    payload MEDIUMTEXT NOT NULL,
    attempts INT DEFAULT 0,
    nextRetryAt DATETIME NOT NULL,
    lastError VARCHAR(512),
    createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_crm_retry (nextRetryAt)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS xp_ledger (
    id        INT AUTO_INCREMENT PRIMARY KEY,
    userId    INT NOT NULL,
    event     VARCHAR(48) NOT NULL,
    points    INT NOT NULL,
    refId     VARCHAR(96) NULL,
    createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_xp_user (userId, createdAt)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS checkins (
    id          INT AUTO_INCREMENT PRIMARY KEY,
    userId      INT NOT NULL,
    checkinDate DATE NOT NULL,
    checkinType VARCHAR(10) NOT NULL,
    payload     TEXT NULL,
    createdAt   DATETIME DEFAULT CURRENT_TIMESTAMP,
    UNIQUE KEY uniq_checkin (userId, checkinDate, checkinType),
    INDEX idx_checkin_user (userId, checkinDate)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS notification_prefs (
    userId    INT NOT NULL,
    notifKey  VARCHAR(48) NOT NULL,
    enabled   TINYINT(1) NOT NULL DEFAULT 1,
    updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (userId, notifKey),
    INDEX idx_notif_key (notifKey)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
