/* Seed the platform: one PLATFORM super admin + the first clinic (ELD) with an
 * activation key. Run once after the platform `migrate` job has applied the schema:
 *   docker compose --profile tools run --rm engine-seed
 * (needs ADMIN_EMAIL / ADMIN_PASSWORD in the environment).
 * The activation key is printed ONCE — copy it into the clinic's website snippet.
 */
import { PrismaClient } from '@prisma/client';
import { generateActivationKey } from '../src/lib/keys';
import { hashPassword, isLegacyHash, normaliseEmail, verifyPassword } from '../src/lib/password';

const prisma = new PrismaClient();

async function main() {
  const adminEmail = normaliseEmail(process.env.ADMIN_EMAIL || 'admin@growclinic.io');
  const adminPassword = process.env.ADMIN_PASSWORD;
  if (!adminPassword || adminPassword.length < 12) {
    throw new Error('Set ADMIN_PASSWORD (12+ characters) — the seed no longer falls back to a default password.');
  }

  // Platform super admin (clinicId = null → sees everything).
  const existingAdmin = await prisma.user.findUnique({ where: { email: adminEmail } });
  if (!existingAdmin) {
    await prisma.user.create({
      data: { email: adminEmail, passwordHash: await hashPassword(adminPassword), role: 'PLATFORM' },
    });
    console.log(`✔ platform admin created: ${adminEmail}`);
  } else if (isLegacyHash(existingAdmin.passwordHash)) {
    // Upgrade a MySQL-era unsalted SHA-256 hash, but only when the supplied
    // password proves ownership — never silently reset someone's password.
    const { ok } = await verifyPassword(adminPassword, existingAdmin.passwordHash);
    if (ok) {
      await prisma.user.update({
        where: { id: existingAdmin.id },
        data: { passwordHash: await hashPassword(adminPassword) },
      });
      console.log(`✔ platform admin ${adminEmail}: legacy SHA-256 hash upgraded to scrypt`);
    } else {
      console.log(`• platform admin ${adminEmail} has a legacy hash; ADMIN_PASSWORD did not match, left unchanged (it upgrades on next verified login).`);
    }
  } else {
    console.log(`• platform admin already exists: ${adminEmail}`);
  }

  // First clinic — Esthétique Le Divine, seeded on PRO.
  const clinic = await prisma.clinic.upsert({
    where: { slug: 'esthetique-le-divine' },
    update: {},
    create: { name: 'Esthétique Le Divine', slug: 'esthetique-le-divine', plan: 'PRO' },
  });
  console.log(`✔ clinic: ${clinic.name} (${clinic.plan})`);

  // Issue an activation key for the clinic if it has none.
  const existing = await prisma.activationKey.findFirst({ where: { clinicId: clinic.id, revoked: false } });
  if (!existing) {
    const k = generateActivationKey(clinic.slug);
    await prisma.activationKey.create({
      data: {
        clinicId: clinic.id,
        keyHash: k.keyHash,
        label: k.label,
        allowedOrigins: 'esthetiqueledivine.com',
      },
    });
    console.log('\n────────────────────────────────────────────');
    console.log('  ACTIVATION KEY (shown once — copy it now):');
    console.log('  ' + k.plaintext);
    console.log('────────────────────────────────────────────\n');
  } else {
    console.log('• clinic already has an activation key (not regenerated).');
  }
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
