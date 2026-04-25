import { convexAuth, getAuthUserId } from "@convex-dev/auth/server";
import { Password } from "@convex-dev/auth/providers/Password";
import type { Value } from "convex/values";
import { query } from "./_generated/server";
import { ResendOTPPasswordReset } from "./email/ResendOTPPasswordReset";
import { DISPLAY_NAME_MAX_LEN } from "./displayNameLimits";
import { normalizeEmail } from "./teamAccess";

function passwordProfile(params: Record<string, Value | undefined>) {
  const rawEmail = params.email;
  if (typeof rawEmail !== "string" || !rawEmail.trim()) {
    throw new Error("Missing email");
  }
  const email = normalizeEmail(rawEmail);
  const flow = params.flow;

  if (flow === "signUp") {
    const rawName = params.name;
    if (typeof rawName === "string") {
      const trimmed = rawName.trim();
      if (trimmed.length > DISPLAY_NAME_MAX_LEN) {
        throw new Error(`Display name must be at most ${DISPLAY_NAME_MAX_LEN} characters`);
      }
      if (trimmed) {
        return { email, name: trimmed };
      }
    }
    return { email };
  }

  return { email };
}

export const { auth, signIn, signOut, store, isAuthenticated } = convexAuth({
  providers: [
    Password({
      reset: ResendOTPPasswordReset,
      profile: (params) =>
        passwordProfile(params as Record<string, Value | undefined>) as Record<string, Value> & {
          email: string;
        },
    }),
  ],
});

export const loggedInUser = query({
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      return null;
    }
    const user = await ctx.db.get("users", userId);
    if (!user) {
      return null;
    }
    return user;
  },
});
