import Google from "next-auth/providers/google";
import Nodemailer from "next-auth/providers/nodemailer";

import type { NextAuthConfig } from "next-auth";
import { db, users } from "./schema";
import { eq } from "drizzle-orm";

export default {
  pages: {
    signIn: "/auth/login",
    verifyRequest: "/auth/verify",
  },
  providers: [
    Google,
    Nodemailer({
      server: process.env.EMAIL_SERVER,
      from: process.env.EMAIL_FROM,
    }),
  ],
  callbacks: {
    async redirect({ url, baseUrl }) {
      if (url.startsWith(baseUrl)) {
        return `${baseUrl}/message`;
      }
      return url;
    },
  },
  events: {
    signIn: async ({ user, account, profile, isNewUser }) => {
      await db
        .update(users)
        .set({ isActive: true })
        .where(eq(users.email, user.email!));
    },
  },
} satisfies NextAuthConfig;
