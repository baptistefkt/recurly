"use client";
import { useAuthActions } from "@convex-dev/auth/react";
import { useState } from "react";
import { toast } from "sonner";

type Step = "forgot" | { email: string };

export function PasswordResetForm({ onBack }: { onBack: () => void }) {
  const { signIn } = useAuthActions();
  const [step, setStep] = useState<Step>("forgot");
  const [submitting, setSubmitting] = useState(false);

  if (step === "forgot") {
    return (
      <div className="w-full flex flex-col gap-form-field">
        <form
          className="flex flex-col gap-form-field"
          onSubmit={(e) => {
            e.preventDefault();
            setSubmitting(true);
            const formData = new FormData(e.currentTarget);
            void signIn("password", formData)
              .then(() => {
                setStep({ email: formData.get("email") as string });
                toast.success("Check your email for a reset code.");
              })
              .catch((error: Error) => {
                toast.error(error.message ?? "Could not send reset code.");
              })
              .finally(() => setSubmitting(false));
          }}
        >
          <input
            className="auth-input-field"
            type="email"
            name="email"
            placeholder="Email"
            required
            autoComplete="email"
          />
          <input name="flow" type="hidden" value="reset" />
          <button className="auth-button" type="submit" disabled={submitting}>
            Send code
          </button>
        </form>
        <button
          type="button"
          className="text-center text-sm text-primary hover:text-primary-hover hover:underline font-medium cursor-pointer"
          onClick={onBack}
        >
          Back to sign in
        </button>
      </div>
    );
  }

  return (
    <div className="w-full flex flex-col gap-form-field">
      <form
        className="flex flex-col gap-form-field"
        onSubmit={(e) => {
          e.preventDefault();
          setSubmitting(true);
          const formData = new FormData(e.currentTarget);
          void signIn("password", formData)
            .catch((error: Error) => {
              toast.error(
                error.message.includes("Invalid code") || error.message.includes("verify")
                  ? "Invalid or expired code. Try again or request a new code."
                  : (error.message ?? "Could not reset password."),
              );
            })
            .finally(() => setSubmitting(false));
        }}
      >
        <input
          className="auth-input-field"
          name="code"
          placeholder="Reset code"
          type="text"
          inputMode="numeric"
          autoComplete="one-time-code"
          required
        />
        <input
          className="auth-input-field"
          name="newPassword"
          placeholder="New password"
          type="password"
          autoComplete="new-password"
          required
          minLength={8}
        />
        <input name="email" value={step.email} type="hidden" readOnly />
        <input name="flow" type="hidden" value="reset-verification" />
        <button className="auth-button" type="submit" disabled={submitting}>
          Set new password
        </button>
        <button
          type="button"
          className="auth-button bg-white text-gray-900 border border-gray-200 hover:bg-gray-50"
          onClick={() => setStep("forgot")}
        >
          Request a new code
        </button>
      </form>
      <button
        type="button"
        className="text-center text-sm text-primary hover:text-primary-hover hover:underline font-medium cursor-pointer"
        onClick={onBack}
      >
        Back to sign in
      </button>
    </div>
  );
}
