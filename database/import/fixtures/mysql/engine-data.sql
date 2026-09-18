-- Fixture data for the Engine (Next.js/Prisma) MySQL source. Test data only.
-- The PLATFORM user's passwordHash is the legacy unsalted SHA-256 of
-- "legacy-fixture-password" — used to test the scrypt upgrade path.
-- ActivationKey ckak_1 is the SHA-256 of "esthetiqueledi_live_fixturekey000000000000".
SET NAMES utf8mb4;
INSERT INTO `Clinic` (id, name, slug, plan, status, createdAt, updatedAt) VALUES
 ('ckcl_eld', 'Esthétique Le Divine', 'esthetique-le-divine', 'PRO', 'ACTIVE', '2026-01-01 00:00:00.000', '2026-01-01 00:00:00.000'),
 ('ckcl_free', 'Free Clinic', 'free-clinic', 'FREE', 'ACTIVE', '2026-01-02 00:00:00.000', '2026-01-02 00:00:00.000');

INSERT INTO `ActivationKey` (id, clinicId, keyHash, label, allowedOrigins, revoked, lastUsedAt, createdAt) VALUES
 ('ckak_1', 'ckcl_eld', '146cd1a8e33ab9ef9f3f9448803e9753194cae0df6223c7014d905812ce1b882', 'esthetiqueledi_live_ab12…', 'esthetiqueledivine.com', 0, '2026-03-01 00:00:00.000', '2026-01-01 00:00:00.000');

INSERT INTO `User` (id, clinicId, email, passwordHash, role, createdAt) VALUES
 ('ckus_platform', NULL, 'platform-admin@example.com', '8bff23aa240352a6feaf04b2c7a4779a6b085f8de25af98a387adc5d9fa5f3b1', 'PLATFORM', '2026-01-01 00:00:00.000'),
 ('ckus_owner', 'ckcl_eld', 'owner@eld.example', 'b6f7c0e4a1d5f2e8c3b9a7d6e5f4c3b2a1d0e9f8c7b6a5d4e3f2c1b0a9d8e7f6', 'OWNER', '2026-01-01 00:00:00.000');

INSERT INTO `Lead` (id, clinicId, name, phone, email, message, treatment, source, status, meta, origin, createdAt) VALUES
 ('ckld_1', 'ckcl_eld', 'Patient One', '+33 6 12 34 56 78', NULL, 'Botox enquiry', 'botox', 'webflow-landing', 'NEW', '{"utm_source":"instagram"}', 'https://esthetiqueledivine.com', '2026-03-02 10:00:00.000'),
 ('ckld_2', 'ckcl_free', 'Patient Two', NULL, 'p2@example.com', NULL, NULL, 'wordpress-cf7', 'CONTACTED', NULL, 'https://free.example', '2026-03-03 10:00:00.000');
