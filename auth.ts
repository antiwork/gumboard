import NextAuth from "next-auth";
import { PrismaAdapter } from "@auth/prisma-adapter";
import Resend from "next-auth/providers/resend";
import GoogleProvider from "next-auth/providers/google";
import GitHubProvider from "next-auth/providers/github";
import { db as prisma } from "@/lib/db";
import { env } from "@/lib/env";

export const { handlers, signIn, signOut, auth } = NextAuth({
  adapter: PrismaAdapter(prisma),
  providers: [
    Resend({
      from: env.EMAIL_FROM,
    }),
    GoogleProvider({
      clientId: env.GOOGLE_CLIENT_ID,
      clientSecret: env.GOOGLE_CLIENT_SECRET,
      allowDangerousEmailAccountLinking: true,
    }),
    GitHubProvider({
      clientId: env.GITHUB_CLIENT_ID,
      clientSecret: env.GITHUB_CLIENT_SECRET,
      allowDangerousEmailAccountLinking: true,
    }),
  ],
  pages: {
    signIn: "/auth/signin",
    verifyRequest: "/auth/verify-request",
    error: "/auth/error",
  },
  trustHost: true,
  callbacks: {
    async signIn() {
      return true;
    },
    async redirect({ url, baseUrl }) {
      // Handle ngrok URLs properly
      const appUrl = env.NEXT_PUBLIC_APP_URL || baseUrl;

      if (url.includes("/invite/accept")) {
        return url.startsWith("/") ? `${appUrl}${url}` : url;
      }
      if (url.startsWith("/")) return `${appUrl}/dashboard`;
      else if (new URL(url).origin === baseUrl || new URL(url).origin === appUrl) return url;
      return `${appUrl}/dashboard`;
    },
  },
});
