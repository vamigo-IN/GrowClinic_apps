import NextAuth from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";

export const { handlers, signIn, signOut, auth } = NextAuth({
  providers: [
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" }
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          return null;
        }

        try {
          const user = await prisma.user.findUnique({
            where: { email: credentials.email as string }
          });

          if (!user || !user.password) {
            return null; // user missing, or has no password set
          }

          const isPasswordValid = await bcrypt.compare(
            credentials.password as string,
            user.password as string
          );

          if (!isPasswordValid) {
            return null;
          }

          return {
            id: user.id,
            name: user.name,
            email: user.email,
            role: user.role,
          };
        } catch (e) {
          // A thrown error here (e.g. missing table / DB unreachable) otherwise
          // surfaces as an opaque ?error=default. Log it and treat as a failed
          // login so the user sees a clear message and we see the real cause.
          console.error("Admin authorize() failed — DB/schema issue?", e);
          return null;
        }
      }
    })
  ],
  pages: {
    signIn: "/admin/login",
  },
  callbacks: {
    async session({ session, token }) {
      if (token?.sub) {
        session.user.id = token.sub;
      }
      session.user.role = (token.role as string) || "viewer";
      return session;
    },
    async jwt({ token, user }) {
      if (user) {
        token.sub = user.id;
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        token.role = (user as any).role || "viewer";
        token.checkedAt = Date.now();
        return token;
      }
      // JWT sessions are otherwise trusted until they expire: re-read the account
      // at most once a minute so a deleted user loses access and a role change
      // (e.g. admin → viewer) takes effect without waiting for a re-login.
      const checkedAt = typeof token.checkedAt === "number" ? token.checkedAt : 0;
      if (token.sub && Date.now() - checkedAt > 60_000) {
        const current = await prisma.user
          .findUnique({ where: { id: token.sub }, select: { role: true } })
          .catch(() => undefined); // DB blip: keep the session, retry next time
        if (current === null) return null; // account deleted → signed out
        if (current) {
          token.role = current.role;
          token.checkedAt = Date.now();
        }
      }
      return token;
    }
  },
  session: {
    strategy: "jwt",
    // 7 days instead of the 30-day default for an admin-only login.
    maxAge: 7 * 24 * 60 * 60,
  },
});
