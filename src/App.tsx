import { Authenticated, Unauthenticated } from "convex/react";
import { useState } from "react";
import { PasswordResetForm } from "./PasswordResetForm";
import { SignInForm } from "./SignInForm";
import { Toaster } from "sonner";
import { TaskDashboard } from "./TaskDashboard";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export default function App() {
  return (
    <div className="min-h-screen flex flex-col bg-muted/40">
      <Toaster position="top-center" />
      <Authenticated>
        <TaskDashboard />
      </Authenticated>
      <Unauthenticated>
        <LandingPage />
      </Unauthenticated>
    </div>
  );
}

function LandingPage() {
  const [screen, setScreen] = useState<"signIn" | "reset">("signIn");

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6 bg-background">
      <Card className="w-full max-w-sm border shadow-md">
        <CardHeader className="text-center space-y-3">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-primary text-primary-foreground">
            <svg className="h-7 w-7" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
              />
            </svg>
          </div>
          <CardTitle className="text-2xl font-bold tracking-tight">Recurly</CardTitle>
          <CardDescription>Track your recurring tasks with ease</CardDescription>
        </CardHeader>
        <CardContent>
          {screen === "signIn" ? (
            <SignInForm onForgotPassword={() => setScreen("reset")} />
          ) : (
            <PasswordResetForm onBack={() => setScreen("signIn")} />
          )}
        </CardContent>
      </Card>
    </div>
  );
}
