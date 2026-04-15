import { Authenticated, Unauthenticated } from "convex/react";
import { useState } from "react";
import { Route, Switch } from "wouter";
import { PasswordResetForm } from "./PasswordResetForm";
import { SignInForm } from "./SignInForm";
import { StatsPage } from "./StatsPage";
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
        <Switch>
          <Route path="/stats">
            <StatsPage />
          </Route>
          <Route path="/">
            <TaskDashboard />
          </Route>
          <Route>
            <TaskDashboard />
          </Route>
        </Switch>
      </Authenticated>
      <Unauthenticated>
        <Switch>
          <Route path="/">
            <LandingPage />
          </Route>
          <Route>
            <LandingPage />
          </Route>
        </Switch>
      </Unauthenticated>
    </div>
  );
}

function LandingPage() {
  const [screen, setScreen] = useState<"signIn" | "reset">("signIn");

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6 bg-background">
      <div className="w-full max-w-sm">
        <Card>
          <CardHeader>
            <div className="text-center">
              <div className="mx-auto flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-2xl bg-black ring-1 ring-border/40">
                <img
                  src="/icon-192.png"
                  alt=""
                  width={56}
                  height={56}
                  className="h-full w-full object-cover"
                  decoding="async"
                />
              </div>
              <CardTitle>Recurly</CardTitle>
              <CardDescription>Track your recurring tasks with ease</CardDescription>
            </div>
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
    </div>
  );
}
