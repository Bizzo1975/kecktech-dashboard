import { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import { prisma } from "./prisma";
import bcrypt from "bcryptjs";
import { verifyTotp } from "./totp";

export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
        totp: { label: "Authenticator code", type: "text" },
      },
      async authorize(credentials) {
        console.log("[AUTH] Authorize called with:", { email: credentials?.email, hasPassword: !!credentials?.password });
        
        if (!credentials?.email || !credentials?.password) {
          console.log("[AUTH] Missing credentials");
          return null;
        }

        try {
          console.log("[AUTH] Looking for user:", credentials.email);
          const user = await prisma.user.findUnique({
            where: { email: credentials.email },
          });

          console.log("[AUTH] User query result:", user ? "User found" : "User not found");

          if (!user) {
            console.log("[AUTH] User not found:", credentials.email);
            return null;
          }

          console.log("[AUTH] User found, comparing password...");
          console.log("[AUTH] Password hash exists:", !!user.passwordHash);
          
          const isPasswordValid = await bcrypt.compare(
            credentials.password,
            user.passwordHash
          );

          console.log("[AUTH] Password valid:", isPasswordValid);

          if (!isPasswordValid) {
            console.log("[AUTH] Invalid password for user:", credentials.email);
            return null;
          }

          if (user.twoFactorEnabled) {
            const totp = (credentials as { totp?: string }).totp;
            if (!user.twoFactorSecret || !totp || !verifyTotp(user.twoFactorSecret, totp)) {
              console.log("[AUTH] 2FA failed for:", credentials.email);
              return null;
            }
          }

          console.log("[AUTH] Authentication successful for:", credentials.email);
          return {
            id: user.id,
            email: user.email,
            name: user.name,
            role: user.role,
          };
        } catch (error: any) {
          console.error("[AUTH] Auth error:", error);
          console.error("[AUTH] Error stack:", error?.stack);
          return null;
        }
      },
    }),
  ],
  pages: {
    signIn: "/admin/login",
    error: "/admin/login",
  },
  session: {
    strategy: "jwt",
    maxAge: 30 * 24 * 60 * 60, // 30 days
  },
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.role = (user as { role?: string }).role;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string;
        session.user.role = token.role as string;
      }
      return session;
    },
  },
  secret: process.env.NEXTAUTH_SECRET || "fallback-secret-key-for-development-only-change-in-production",
  // Enable debug to see what's happening
  debug: process.env.NODE_ENV === "development",
  logger: {
    error(code, metadata) {
      // Log all errors in development
      if (process.env.NODE_ENV === "development") {
        console.error("[NextAuth Error]", code, metadata);
      }
    },
    warn(code) {
      // Log all warnings in development
      if (process.env.NODE_ENV === "development") {
        console.warn("[NextAuth Warn]", code);
      }
    },
    debug(code) {
      // Log all debug messages in development
      if (process.env.NODE_ENV === "development") {
        console.log("[NextAuth Debug]", code);
      }
    },
  },
};
