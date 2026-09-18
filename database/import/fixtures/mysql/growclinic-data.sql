-- Fixture data for the GrowClinic website (apps/GrowClinic-main, Prisma/MySQL) source. Test data only.
SET NAMES utf8mb4;
INSERT INTO `User` (id, name, email, password, image, role, createdAt, updatedAt) VALUES
 ('cku_admin_1', 'Super Admin', 'Admin@GrowClinic.io',
  '$2b$10$e0NRnYrXK6G8b6bZkZr9ZOwqzv1lq0xQkq1v3JvXH4m7c3dYx5c2S', NULL, 'admin', '2026-01-10 08:00:00.000', '2026-03-01 09:30:00.123'),
 ('cku_editor_1', 'Content Manager', 'editor@growclinic.io',
  '$2b$10$e0NRnYrXK6G8b6bZkZr9ZOwqzv1lq0xQkq1v3JvXH4m7c3dYx5c2S', NULL, 'manager', '2026-02-10 08:00:00.000', '2026-02-10 08:00:00.000');

INSERT INTO `Tag` (id, name, slug) VALUES
 ('ckt_1', 'Dental SEO', 'dental-seo'),
 ('ckt_2', 'Google Business Profile', 'google-business-profile');

INSERT INTO `Post` (id, title, slug, content, excerpt, featuredImage, category, published, scheduledFor, publishedAt, authorId, createdAt, updatedAt,
                    metaDescription, focusKeyword, secondaryKeywords, canonicalUrl, ogTitle, ogDescription, ogImage, noIndex) VALUES
 ('ckp_1', 'How clinics win local search 🦷', 'how-clinics-win-local-search',
  '<p>Long HTML body with “smart quotes”, emoji 🚀 and <strong>markup</strong>.</p>', 'Excerpt', 'https://ik.imagekit.io/growclinic/a.png', 'Insights', 1,
  NULL, '2026-02-01 10:00:00.000', 'cku_admin_1', '2026-02-01 10:00:00.000', '2026-02-02 11:00:00.500',
  'How clinics rank in the local map pack.', 'local seo for clinics', 'gbp, map pack', NULL, 'Win local search', 'OG description', NULL, 0),
 ('ckp_2', 'Draft post', 'draft-post', '<p>draft</p>', NULL, NULL, NULL, 0,
  NULL, NULL, 'cku_admin_1', '2026-02-03 10:00:00.000', '2026-02-03 10:00:00.000',
  NULL, NULL, NULL, NULL, NULL, NULL, NULL, 0),
 ('ckp_3', 'Scheduled post', 'scheduled-post', '<p>coming soon</p>', 'Soon', NULL, 'Local SEO', 0,
  '2026-12-01 04:30:00.000', NULL, 'cku_editor_1', '2026-03-10 10:00:00.000', '2026-03-10 10:00:00.000',
  NULL, NULL, NULL, 'https://www.growclinic.io/blog/scheduled-post', NULL, NULL, NULL, 1);

INSERT INTO `_PostToTag` (A, B) VALUES ('ckp_1', 'ckt_1'), ('ckp_1', 'ckt_2');

INSERT INTO `Media` (id, filename, url, fileType, size, createdAt) VALUES
 ('ckd_1', 'hero.webp', 'https://ik.imagekit.io/growclinic/blog/hero.webp', 'image/webp', 184233, '2026-02-01 09:55:00.000');

INSERT INTO `Lead` (id, name, email, phone, source, notes, createdAt) VALUES
 ('ckl_1', 'Dr. Mehta', 'mehta@example.com', '+91 98100 00001', 'Website Form', NULL, '2026-03-05 12:00:00.000');

INSERT INTO `ContactMessage` (id, name, email, phone, source, message, createdAt) VALUES
 ('ckc_1', 'Dr. Rao', 'rao@example.com', NULL, 'contact-page', 'Need help with GMB — नमस्ते 🙏', '2026-03-06 07:15:00.000');

INSERT INTO `ConsultationBooking` (id, name, email, phone, clinicName, clinicType, challenge, preferredDate, preferredTime, createdAt) VALUES
 ('ckb_1', 'Dr. Iyer', 'iyer@example.com', '+91 98100 00002', 'Iyer Eye Care', 'Ophthalmologist', 'Few new patients', '2026-03-20', '10:30 AM', '2026-03-07 09:00:00.000');

INSERT INTO `Project` (id, title, slug, detail, growth, logoUrl, doctorName, website, specialty, published, createdAt, updatedAt) VALUES
 ('ckj_1', 'Smile Studio growth', 'smile-studio', 'Case study detail', 'From 20 to 150 patients', NULL, 'Dr. Kapoor', 'https://smile.example', 'Dental', 1,
  '2026-01-15 00:00:00.000', '2026-01-16 00:00:00.000');

INSERT INTO `ClinicAudit` (id, fullName, clinicName, specialization, city, phone, website, pinCode, status, seoScore, competitorRank, estimatedLeads,
                           localVisibilityScore, websiteHealthScore, googleBusinessStatus, clickId, utmSource, utmCampaign, referrer,
                           webhookStatus, webhookCode, webhookError, webhookAt, createdAt, updatedAt) VALUES
 ('cka_1', 'Dr. Shah', 'Shah Derma', 'Dermatologist', 'Mumbai', '+91 98100 00003', NULL, '400001', 'pending', 34, 18, 5600, 22, 0, 'Partially Claimed',
  'gclid-abc123', 'google', 'derma-mumbai', 'https://www.google.com/',
  'success', 200, NULL, '2026-03-08 06:00:01.250', '2026-03-08 06:00:00.000', '2026-03-08 06:00:01.250'),
 ('cka_2', 'Dr. Nair', 'Nair Dental', 'Dentist', 'Kochi', '+91 98100 00004', 'https://nair.example', '', 'pending', NULL, NULL, NULL, NULL, NULL, NULL,
  NULL, NULL, NULL, NULL,
  'failed', 0, 'The operation was aborted due to timeout', '2026-03-09 06:00:08.000', '2026-03-09 06:00:00.000', '2026-03-09 06:00:08.000');

INSERT INTO `Testimonial` (id, name, role, company, content, avatarUrl, rating, featured, published, createdAt, updatedAt) VALUES
 ('ckm_1', 'Dr. Bose', 'Founder', 'Bose Clinic', 'Great results!', NULL, 5, 1, 1, '2026-01-20 00:00:00.000', '2026-01-20 00:00:00.000');

INSERT INTO `SiteSettings` (id, headerScripts, footerScripts, ga4Id, gtmId, metaPixelId, updatedAt) VALUES
 ('global', '<script>/* custom header */</script>', NULL, 'G-TEST123456', 'GTM-TEST1234', '1234567890123456', '2026-03-01 00:00:00.000');

INSERT INTO `ClientLogo` (id, name, logoUrl, website, `order`, published, createdAt, updatedAt) VALUES
 ('ckg_1', 'Smile Dental', '/api/uploads/smile.png', 'https://smile.example', 1, 1, '2026-01-25 00:00:00.000', '2026-01-25 00:00:00.000'),
 ('ckg_2', 'Hidden Clinic', NULL, NULL, 2, 0, '2026-01-26 00:00:00.000', '2026-01-26 00:00:00.000');

INSERT INTO `CaseStudy` (id, title, slug, clientName, category, services, location, specialty, challenge, solution, results, metrics,
                         clientQuote, clientQuoteAuthor, imageUrl, metaDescription, focusKeyword, createdAt, updatedAt, published) VALUES
 ('cks_1', 'Derma clinic triples bookings', 'derma-clinic-triples-bookings', 'Glow Skin Clinic', 'seo', 'seo,google-ads,gbp', 'Pune', 'Dermatology',
  'Low visibility', 'Local SEO + ads', 'Bookings x3', '2,356 | Conversations\n3x | Bookings',
  'They changed our practice.', 'Dr. Ankit Potdar, Founder', 'https://ik.imagekit.io/growclinic/cs.webp', 'Case study summary', 'dermatology marketing pune',
  '2026-02-15 00:00:00.000', '2026-02-16 00:00:00.000', 1);
