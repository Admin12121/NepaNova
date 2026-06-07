import type { NextAuthConfig, User } from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { LoginSchema } from "@/schemas";
import type { JWT } from "next-auth/jwt";
import type { Session } from "next-auth";
import Google from "next-auth/providers/google";
import { decodeJwt } from "jose";

declare module "next-auth/jwt" {
  interface JWT {
    accessToken?: string;
    refreshToken?: string;
    expires?: number;
    role?: string;
    roles?: string[];
    permissions?: string[];
  }
}

declare module "next-auth" {
  interface Session {
    accessToken?: string;
    refreshToken?: string;
    expires?: Date;
    role?: string;
    roles?: string[];
    permissions?: string[];
  }
}

interface UserWithToken extends User {
  token: {
    access: string;
    refresh: string;
  };
  name: string;
  message?: string;
}

const getApiBaseUrl = () => {
  const apiUrl = process.env.API_URL || process.env.NEXT_PUBLIC_API_URL;
  if (!apiUrl) {
    throw new Error("Authentication API URL is not configured");
  }

  return apiUrl.trim().replace(/^['"]|['"]$/g, "").replace(/\/+$/, "");
};

const parseJsonResponse = async (response: Response) => {
  const contentType = response.headers.get("content-type") || "";
  const text = await response.text();

  if (!contentType.includes("application/json")) {
    throw new Error(
      "Authentication API returned a non-JSON response. Check API_URL/NEXT_PUBLIC_API_URL points to the Django API host.",
    );
  }

  try {
    return JSON.parse(text);
  } catch {
    throw new Error("Authentication API returned invalid JSON");
  }
};

export default {
  pages: {
    signIn: "/auth/login",
    error: "/auth/login",
  },
  providers: [
    Google({
      clientId: process.env.GOOGLE_ID,
      clientSecret: process.env.GOOGLE_SECRET,
    }),
    Credentials({
      async authorize(credentials) {
        const ValidateFields = LoginSchema.safeParse(credentials);
        if (!ValidateFields.success) {
          return null;
        }
        const { email, password } = ValidateFields.data;
        const response = await fetch(
          `${getApiBaseUrl()}/api/accounts/users/login/`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({ email, password }),
          },
        );
        const data = await parseJsonResponse(response);
        if (!response.ok) {
          const errorMessage = data.error || "Failed to log in";
          throw new Error(errorMessage);
        }
        if (data.message === "Acivation link sent to your email") {
          return {
            id: email,
            email: email,
            message: "Activation link sent to your email",
          } as UserWithToken;
        }
        return {
          id: email,
          email: email,
          token: data.token,
          name: data.name,
        } as UserWithToken;
      },
    }),
  ],
  callbacks: {
    async signIn({ user, account, profile }) {
      const userWithToken = user as UserWithToken;
      if (userWithToken?.message === "Activation link sent to your email") {
        throw new Error("Activation link sent to your email");
      }
      if (account?.provider !== "credentials") {
        const response = await fetch(
          `${getApiBaseUrl()}/api/accounts/users/social_login/`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              provider: account?.provider,
              providerId: account?.id,
              email: user.email,
              username: user.name,
              profile: profile || user.image,
            }),
          },
        );

        const data = await parseJsonResponse(response);
        if (!response.ok) {
          throw new Error(
            data.error || "Failed to process social login with Django",
          );
        }

        if (data.token) {
          userWithToken.token = {
            access: data.token.access,
            refresh: data.token.refresh,
          };
        }
      }
      return true;
    },
    async jwt({ token, user }) {
      if (user && "token" in user) {
        const userWithToken = user as UserWithToken;
        token.accessToken = userWithToken.token.access;
        token.refreshToken = userWithToken.token.refresh;
      }
      if (token.accessToken) {
        const decoded = decodeJwt(token.accessToken);
        token.expires = decoded.exp as number;
        token.role = decoded.role as string | undefined;
        token.roles = Array.isArray(decoded.roles)
          ? (decoded.roles as string[])
          : [];
        token.permissions = Array.isArray(decoded.permissions)
          ? (decoded.permissions as string[])
          : [];
      }
      return token;
    },
    async session({ session, token }) {
      session.accessToken = token.accessToken;
      session.refreshToken = token.refreshToken;
      session.role = token.role;
      session.roles = token.roles || [];
      session.permissions = token.permissions || [];
      if (token.expires) {
        session.expires = new Date(token.expires * 1000);
      }
      return session;
    },
  },
} satisfies NextAuthConfig;
