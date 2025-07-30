import NextAuth from "next-auth"
import { PrismaAdapter } from "@auth/prisma-adapter"
import Resend from "next-auth/providers/resend"
import { PrismaClient } from "@prisma/client"

const prisma = new PrismaClient()

export const { handlers, signIn, signOut, auth } = NextAuth({
  adapter: PrismaAdapter(prisma),
  providers: [
    Resend({
      from: "noreply@gumboard.com",
    }),
  ],
  pages: {
    signIn: "/auth/signin",
    verifyRequest: "/auth/verify-request",
    error: "/auth/error",
  },
  callbacks: {
    async signIn() {
      return true
    },
    async redirect({ url, baseUrl }) {
      // Handle invite callback URLs
      if (url.includes("/invite/accept")) {
        return url.startsWith("/") ? `${baseUrl}${url}` : url
      }
      
      // Redirect to dashboard after successful sign in
      if (url.startsWith("/")) return `${baseUrl}/dashboard`
      else if (new URL(url).origin === baseUrl) return url
      return `${baseUrl}/dashboard`
    },
  },
})
