import { Resend } from "@convex-dev/resend";
import { v } from "convex/values";
import { components } from "./_generated/api";
import { internalMutation } from "./_generated/server";

export const resend = new Resend(components.resend, {
  testMode: false,
});

/** Queue a transactional email (delivered asynchronously by the Resend component). */
export const send = internalMutation({
  args: {
    to: v.string(),
    subject: v.string(),
    html: v.string(),
    from: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const from =
      args.from ??
      process.env.RESEND_FROM ??
      "Recurly <onboarding@resend.dev>";
    return await resend.sendEmail(ctx, {
      from,
      to: args.to,
      subject: args.subject,
      html: args.html,
    });
  },
});
