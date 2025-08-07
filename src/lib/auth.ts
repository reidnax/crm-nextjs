import NextAuth, { type NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import { PrismaAdapter } from "@auth/prisma-adapter";
import { prisma } from "./prisma";
import bcrypt from "bcryptjs";
import { cookies } from "next/headers";

export const authOptions: NextAuthOptions = {
  adapter: PrismaAdapter(prisma),
  providers: [
    CredentialsProvider({
      name: "credentials",
      credentials: {
        username: { label: "Username", type: "text" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.username || !credentials?.password) {
          return null;
        }

        const user = await prisma.user.findUnique({
          where: {
            username: credentials.username,
          },
        });

        if (!user) {
          return null;
        }

        // Check if user is active
        if (!user.active) {
          return null;
        }

        const isPasswordValid = await bcrypt.compare(
          credentials.password,
          user.password
        );

        if (!isPasswordValid) {
          return null;
        }

        return {
          id: user.id.toString(),
          username: user.username,
          name: user.name,
          email: user.email,
          role: user.role,
        };
      },
    }),
  ],
  session: {
    strategy: "jwt" as const,
  },
  callbacks: {
    async jwt({ token, user }: { token: unknown; user: unknown }) {
      if (user) {
        (token as { role?: string; username?: string }).role = (
          user as { role?: string }
        ).role;
        (token as { role?: string; username?: string }).username = (
          user as { username?: string }
        ).username;
      }
      return token;
    },
    async session({ session, token }: { session: unknown; token: unknown }) {
      if (token) {
        const sessionObj = session as {
          user: {
            id?: string;
            role?: string;
            username?: string;
            name?: string;
            email?: string;
            isImpersonated?: boolean;
            realUserId?: string;
            realUserRole?: string;
          };
        };

        sessionObj.user.id = (token as { sub?: string }).sub;
        sessionObj.user.role = (token as { role?: string }).role;
        sessionObj.user.username = (token as { username?: string }).username;

        // Check for dev mode impersonation
        try {
          const cookieStore = await cookies();
          const impersonationCookie = cookieStore.get("dev_impersonation");

          if (impersonationCookie && sessionObj.user.role === "Admin-Dev") {
            const impersonationData = JSON.parse(impersonationCookie.value);
            const { targetUserId, realUserId, timestamp } = impersonationData;

            // Check if impersonation is still valid (24 hours)
            const isValid = Date.now() - timestamp < 24 * 60 * 60 * 1000;

            if (isValid && targetUserId) {
              // Fetch the impersonated user's data
              const impersonatedUser = await prisma.user.findFirst({
                where: { id: targetUserId, active: true },
                select: {
                  id: true,
                  name: true,
                  email: true,
                  username: true,
                  role: true,
                },
              });

              if (impersonatedUser) {
                // Store the real admin user info before impersonation
                const realUserRole = sessionObj.user.role;
                const realUserId = sessionObj.user.id;

                // Override session with impersonated user data
                sessionObj.user.id = impersonatedUser.id.toString();
                sessionObj.user.name = impersonatedUser.name || undefined;
                sessionObj.user.email = impersonatedUser.email;
                sessionObj.user.username = impersonatedUser.username;
                sessionObj.user.role = impersonatedUser.role || undefined;
                sessionObj.user.isImpersonated = true;
                sessionObj.user.realUserId = realUserId;
                sessionObj.user.realUserRole = realUserRole; // Preserve original role for dev mode checks
              }
            }
          }
        } catch (error) {
          // Silently ignore impersonation errors to avoid breaking normal sessions
        }
      }

      return session;
    },
  },
  pages: {
    signIn: "/login",
  },
};

// NextAuth configuration is exported as authOptions
// The handler is created in the API route file
