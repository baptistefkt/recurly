"use client";
import { useAuthActions } from "@convex-dev/auth/react";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

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
          <div className="space-y-2">
            <Label htmlFor="reset-email">Email</Label>
            <Input
              id="reset-email"
              type="email"
              name="email"
              placeholder="you@example.com"
              required
              autoComplete="email"
            />
          </div>
          <input name="flow" type="hidden" value="reset" />
          <Button type="submit" className="w-full" disabled={submitting}>
            Send code
          </Button>
        </form>
        <Button type="button" variant="link" className="w-full" onClick={onBack}>
          Back to sign in
        </Button>
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
        <div className="space-y-2">
          <Label htmlFor="reset-code">Reset code</Label>
          <Input
            id="reset-code"
            name="code"
            placeholder="12345678"
            type="text"
            inputMode="numeric"
            autoComplete="one-time-code"
            required
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="reset-new-password">New password</Label>
          <Input
            id="reset-new-password"
            name="newPassword"
            type="password"
            autoComplete="new-password"
            required
            minLength={8}
          />
        </div>
        <input name="email" value={step.email} type="hidden" readOnly />
        <input name="flow" type="hidden" value="reset-verification" />
        <Button type="submit" className="w-full" disabled={submitting}>
          Set new password
        </Button>
        <Button
          type="button"
          variant="outline"
          className="w-full"
          onClick={() => setStep("forgot")}
        >
          Request a new code
        </Button>
      </form>
      <Button type="button" variant="link" className="w-full" onClick={onBack}>
        Back to sign in
      </Button>
    </div>
  );
}
