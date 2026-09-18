/**
 * Creates (or resets) the admin user using only runtime dependencies
 * (@prisma/client + bcryptjs) — no tsx / ts-node required.
 *
 * Usage on the server (from the app root):
 *   DEFAULT_ADMIN='admin@growclinic.io' DEFAULT_PASS='your-password' node scripts/create-admin.cjs
 *
 * Requires the database tables to exist first. On the Docker platform they are
 * created by the `migrate` job (prisma migrate deploy) — never `prisma db push`:
 *   docker compose run --rm -e DEFAULT_PASS='…' growclinic-seed node scripts/create-admin.cjs
 */
const { PrismaClient } = require("@prisma/client");
const bcrypt = require("bcryptjs");

const prisma = new PrismaClient();

(async () => {
    const email = process.env.DEFAULT_ADMIN || "admin@growclinic.io";
    const pass = process.env.DEFAULT_PASS;
    if (!pass || pass.length < 12) {
        throw new Error("Set DEFAULT_PASS (12+ characters) — there is no default password.");
    }
    const password = await bcrypt.hash(pass, 10);

    const user = await prisma.user.upsert({
        where: { email },
        update: { password }, // resets the password if the admin already exists
        create: { email, name: "Super Admin", password },
    });

    console.log("✓ Admin ready — log in with:", user.email);
})()
    .catch((e) => {
        console.error("✗ create-admin failed:", e.message);
        process.exitCode = 1;
    })
    .finally(() => prisma.$disconnect());
