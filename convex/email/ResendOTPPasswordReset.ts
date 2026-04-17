import Resend from "@auth/core/providers/resend";
import { Resend as ResendAPI } from "resend";
import { RandomReader, generateRandomString } from "@oslojs/crypto/random";

const apiKey = () =>
  process.env.RESEND_API_KEY ?? process.env.AUTH_RESEND_KEY ?? "";

const fromAddress = () =>
  process.env.RESEND_FROM ?? "Recurly <onboarding@resend.dev>";

export const ResendOTPPasswordReset = Resend({
  id: "resend-otp",
  apiKey: apiKey(),
  from: fromAddress(),
  async generateVerificationToken() {
    const random: RandomReader = {
      read(bytes) {
        crypto.getRandomValues(bytes);
      },
    };
    const alphabet = "0123456789";
    const length = 8;
    return generateRandomString(random, alphabet, length);
  },
  async sendVerificationRequest({ identifier: email, provider, token }) {
    const key = provider.apiKey ?? apiKey();
    if (!key) {
      throw new Error("Missing RESEND_API_KEY (or AUTH_RESEND_KEY) for password reset emails.");
    }
    const resend = new ResendAPI(key);
    const { error } = await resend.emails.send({
      from: provider.from ?? fromAddress(),
      to: [email],
      subject: "Reset your password in Recurly",
      text: `Your password reset code is ${token}`,
    });
    if (error) {
      throw new Error(error.message);
    }
  },
});
