import NextAuth from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import { PrismaAdapter } from "@auth/prisma-adapter";
import { prisma } from "./prisma";
import bcrypt from "bcryptjs";

export const authOptions = {
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
          console.log("Missing credentials");
          return null;
        }

        console.log("Attempting login for username:", credentials.username);

        const user = await prisma.user.findUnique({
          where: {
            username: credentials.username,
          },
        });

        if (!user) {
          console.log("User not found:", credentials.username);
          return null;
        }

        console.log("User found:", user.username, "Active:", user.active);

        // Check if user is active
        if (!user.active) {
          console.log("User is inactive:", credentials.username);
          return null;
        }

        const isPasswordValid = await bcrypt.compare(
          credentials.password,
          user.password
        );

        console.log("Password valid:", isPasswordValid);

        if (!isPasswordValid) {
          console.log("Invalid password for user:", credentials.username);
          return null;
        }

        console.log("Login successful for user:", user.username);

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
        (
          session as { user: { id?: string; role?: string; username?: string } }
        ).user.id = (token as { sub?: string }).sub;
        (
          session as { user: { id?: string; role?: string; username?: string } }
        ).user.role = (token as { role?: string }).role;
        (
          session as { user: { id?: string; role?: string; username?: string } }
        ).user.username = (token as { username?: string }).username;
      }
      return session;
    },
  },
  pages: {
    signIn: "/login",
  },
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const handler = (NextAuth as any)(authOptions);
export default handler;
export { handler };
