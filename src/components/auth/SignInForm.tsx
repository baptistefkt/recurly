"use client";
import { useAuthActions } from "@convex-dev/auth/react";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { DISPLAY_NAME_MAX_LEN } from "../../../convex/displayNameLimits";

export function SignInForm({
  onForgotPassword,
}: {
  onForgotPassword?: () => void;
}) {
  const { signIn } = useAuthActions();
  const [flow, setFlow] = useState<"signIn" | "signUp">("signIn");
  const [submitting, setSubmitting] = useState(false);

  return (
    <div className="w-full flex flex-col gap-form-field">
      <form
        className="flex flex-col gap-form-field"
        onSubmit={(e) => {
          e.preventDefault();
          setSubmitting(true);
          const formData = new FormData(e.target as HTMLFormElement);
          formData.set("flow", flow);
          void signIn("password", formData).catch((error: Error) => {
            const msg = error.message ?? "";
            if (msg.includes("Invalid password")) {
              toast.error("Invalid password. Please try again.");
            } else if (msg.includes("Display name")) {
              toast.error(msg);
            } else {
              toast.error(
                flow === "signIn"
                  ? "Could not sign in, did you mean to sign up?"
                  : "Could not sign up, did you mean to sign in?"
              );
            }
            setSubmitting(false);
          });
        }}
      >
        <div className="space-y-2">
          <Label htmlFor="signin-email">Email</Label>
          <Input
            id="signin-email"
            type="email"
            name="email"
            placeholder="you@example.com"
            required
            autoComplete="email"
          />
        </div>
        {flow === "signUp" ? (
          <div className="space-y-2">
            <Label htmlFor="signup-display-name">Display name (optional)</Label>
            <Input
              id="signup-display-name"
              type="text"
              name="name"
              maxLength={DISPLAY_NAME_MAX_LEN}
              placeholder="How you appear in the app"
              autoComplete="name"
            />
            <p className="text-xs text-muted-foreground">
              If set, this is shown instead of your email to you and your teammates.
            </p>
          </div>
        ) : null}
        <div className="space-y-2">
          <Label htmlFor="signin-password">Password</Label>
          <Input
            id="signin-password"
            type="password"
            name="password"
            placeholder="••••••••"
            required
            autoComplete={flow === "signIn" ? "current-password" : "new-password"}
          />
        </div>
        <Button type="submit" disabled={submitting}>
          {flow === "signIn" ? "Sign in" : "Sign up"}
        </Button>
        <div className="text-center text-sm text-muted-foreground">
          <span>
            {flow === "signIn"
              ? "Don't have an account? "
              : "Already have an account? "}
          </span>
          <Button
            type="button"
            variant="link"
            onClick={() => setFlow(flow === "signIn" ? "signUp" : "signIn")}
          >
            {flow === "signIn" ? "Sign up instead" : "Sign in instead"}
          </Button>
        </div>
        {flow === "signIn" && onForgotPassword ? (
          <Button type="button" variant="link" onClick={onForgotPassword}>
            Forgot password?
          </Button>
        ) : null}
      </form>
    </div>
  );
}
