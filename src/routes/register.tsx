import { useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { toast } from "sonner";
import { Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { SkillBadge } from "@/components/SkillBadge";
import { skillFilters } from "@/data/mock";

export const Route = createFileRoute("/register")({
  head: () => ({
    meta: [
      { title: "Create your account — ProjectConnect" },
      {
        name: "description",
        content:
          "Build a student profile on ProjectConnect, list your skills and get matched with project teams on your campus and beyond.",
      },
      { property: "og:title", content: "Create your account — ProjectConnect" },
      {
        property: "og:description",
        content: "List your skills and get matched with student project teams.",
      },
    ],
  }),
  component: RegisterPage,
});

function RegisterPage() {
  const [selected, setSelected] = useState<string[]>(["React", "TypeScript"]);

  const toggle = (skill: string) =>
    setSelected((prev) =>
      prev.includes(skill) ? prev.filter((s) => s !== skill) : [...prev, skill],
    );

  return (
    <div className="container-page py-12 lg:py-16">
      <div className="mx-auto max-w-3xl">
        <div className="text-center">
          <h1 className="text-3xl font-bold sm:text-4xl">Create your student profile</h1>
          <p className="mx-auto mt-3 max-w-lg text-muted-foreground">
            Two minutes now means the right teams can find you later.
          </p>
        </div>

        <Card className="mt-10 shadow-lift">
          <CardHeader>
            <h2 className="text-lg font-semibold">Account details</h2>
          </CardHeader>
          <CardContent>
            <form
              className="space-y-8"
              onSubmit={(e) => {
                e.preventDefault();
                toast.success("Profile preview saved. Accounts go live in the next phase.");
              }}
            >
              <fieldset className="space-y-5">
                <legend className="sr-only">Personal information</legend>
                <div className="grid gap-5 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="first-name">First name</Label>
                    <Input id="first-name" name="firstName" autoComplete="given-name" required />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="last-name">Last name</Label>
                    <Input id="last-name" name="lastName" autoComplete="family-name" required />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email">College email</Label>
                  <Input
                    id="email"
                    name="email"
                    type="email"
                    autoComplete="email"
                    placeholder="you@college.edu"
                    required
                  />
                  <p className="text-xs text-muted-foreground">
                    We use this to verify you're a student. It stays private.
                  </p>
                </div>
                <div className="grid gap-5 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="password">Password</Label>
                    <Input
                      id="password"
                      name="password"
                      type="password"
                      autoComplete="new-password"
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="confirm-password">Confirm password</Label>
                    <Input
                      id="confirm-password"
                      name="confirmPassword"
                      type="password"
                      autoComplete="new-password"
                      required
                    />
                  </div>
                </div>
              </fieldset>

              <fieldset className="space-y-5">
                <legend className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
                  Academic details
                </legend>
                <div className="grid gap-5 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="college">College / University</Label>
                    <Input id="college" name="college" placeholder="e.g. NIT Trichy" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="branch">Branch</Label>
                    <Input id="branch" name="branch" placeholder="e.g. Computer Science" />
                  </div>
                </div>
                <div className="grid gap-5 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="year">Year of study</Label>
                    <Select>
                      <SelectTrigger id="year">
                        <SelectValue placeholder="Select year" />
                      </SelectTrigger>
                      <SelectContent>
                        {["1st Year", "2nd Year", "3rd Year", "4th Year", "Postgraduate"].map(
                          (y) => (
                            <SelectItem key={y} value={y}>
                              {y}
                            </SelectItem>
                          ),
                        )}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="availability">Weekly availability</Label>
                    <Select>
                      <SelectTrigger id="availability">
                        <SelectValue placeholder="Select hours" />
                      </SelectTrigger>
                      <SelectContent>
                        {["1-3 hrs", "4-6 hrs", "7-10 hrs", "10+ hrs"].map((h) => (
                          <SelectItem key={h} value={h}>
                            {h}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </fieldset>

              <fieldset className="space-y-4">
                <legend className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
                  Your skills
                </legend>
                <p className="text-sm text-muted-foreground">
                  Pick the skills you want to be matched on.
                </p>
                <ul className="flex flex-wrap gap-2">
                  {skillFilters.map((skill) => {
                    const active = selected.includes(skill);
                    return (
                      <li key={skill}>
                        <button
                          type="button"
                          aria-pressed={active}
                          onClick={() => toggle(skill)}
                          className="focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-full"
                        >
                          <SkillBadge variant={active ? "primary" : "outline"}>
                            {active && <Check className="h-3 w-3" aria-hidden="true" />}
                            {skill}
                          </SkillBadge>
                        </button>
                      </li>
                    );
                  })}
                </ul>
                <div className="space-y-2">
                  <Label htmlFor="bio">Short bio</Label>
                  <Textarea
                    id="bio"
                    name="bio"
                    rows={4}
                    placeholder="What do you like building? What are you looking for in a team?"
                  />
                </div>
              </fieldset>

              <div className="flex items-start gap-2">
                <Checkbox id="terms" className="mt-0.5" />
                <Label htmlFor="terms" className="text-sm font-normal text-muted-foreground">
                  I agree to the community code of conduct and terms of use.
                </Label>
              </div>

              <Button type="submit" size="lg" className="w-full">
                Create account
              </Button>

              <p className="text-center text-sm text-muted-foreground">
                Already have an account?{" "}
                <Link to="/login" className="font-medium text-primary hover:underline">
                  Log in
                </Link>
              </p>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
