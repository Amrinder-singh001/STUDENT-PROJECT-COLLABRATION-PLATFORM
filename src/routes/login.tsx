import { createFileRoute, Link } from "@tanstack/react-router";
import { toast } from "sonner";
import { Rocket } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Card, CardContent, CardHeader } from "@/components/ui/card";

export const Route = createFileRoute("/login")({
  head: () => ({
    meta: [
      { title: "Log in — ProjectConnect" },
      {
        name: "description",
        content: "Sign in to ProjectConnect to manage your projects, teams and applications.",
      },
      { property: "og:title", content: "Log in — ProjectConnect" },
      {
        property: "og:description",
        content: "Access your student project dashboard, teams and applications.",
      },
    ],
  }),
  component: LoginPage,
});

function LoginPage() {
  return (
    <div className="container-page grid min-h-[calc(100vh-4rem)] items-center py-12 lg:grid-cols-2 lg:gap-16">
      <section className="hidden lg:block">
        <span className="grid h-12 w-12 place-items-center rounded-2xl bg-primary text-primary-foreground">
          <Rocket className="h-6 w-6" aria-hidden="true" />
        </span>
        <h1 className="mt-6 text-4xl font-bold leading-tight">
          Welcome back to your <span className="text-primary">build crew</span>
        </h1>
        <p className="mt-4 max-w-md leading-relaxed text-muted-foreground">
          Pick up where your team left off — review applications, track milestones and keep
          shipping.
        </p>
        <ul className="mt-8 space-y-3 text-sm text-muted-foreground">
          {[
            "Skill-matched teammate suggestions",
            "One place for roles, milestones and updates",
            "A portfolio that grows with every project",
          ].map((item) => (
            <li key={item} className="flex items-start gap-2">
              <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-primary" />
              {item}
            </li>
          ))}
        </ul>
      </section>

      <Card className="mx-auto w-full max-w-md shadow-lift">
        <CardHeader className="gap-2">
          <h2 className="text-2xl font-bold">Log in</h2>
          <p className="text-sm text-muted-foreground">
            Use your college email to continue.
          </p>
        </CardHeader>
        <CardContent>
          <form
            className="space-y-5"
            onSubmit={(e) => {
              e.preventDefault();
              toast.info("Authentication is coming in the next phase.");
            }}
          >
            <div className="space-y-2">
              <Label htmlFor="login-email">College email</Label>
              <Input
                id="login-email"
                name="email"
                type="email"
                autoComplete="email"
                placeholder="you@college.edu"
                required
              />
            </div>
            <div className="space-y-2">
              <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-2">
                <Label htmlFor="login-password">Password</Label>
                <a href="#" className="text-xs font-medium text-primary hover:underline">
                  Forgot password?
                </a>
              </div>
              <Input
                id="login-password"
                name="password"
                type="password"
                autoComplete="current-password"
                placeholder="••••••••"
                required
              />
            </div>
            <div className="flex items-center gap-2">
              <Checkbox id="remember" />
              <Label htmlFor="remember" className="text-sm font-normal text-muted-foreground">
                Keep me signed in
              </Label>
            </div>
            <Button type="submit" className="w-full" size="lg">
              Log in
            </Button>
          </form>

          <p className="mt-6 text-center text-sm text-muted-foreground">
            New to ProjectConnect?{" "}
            <Link to="/register" className="font-medium text-primary hover:underline">
              Create an account
            </Link>
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
