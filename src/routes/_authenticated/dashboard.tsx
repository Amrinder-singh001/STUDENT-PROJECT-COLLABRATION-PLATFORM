import { createFileRoute, Link } from "@tanstack/react-router";
import { toast } from "sonner";
import { useEffect, useMemo, useState } from "react";
import { Plus, Bell, TrendingUp, Users2, FolderKanban, Send, Github, Globe, GraduationCap } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { getAvatarUrl, initialsFrom } from "@/lib/avatar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Modal } from "@/components/Modal";
import { ProfilePhotoViewer } from "@/components/ProfilePhotoViewer";
import { ProjectCard } from "@/components/ProjectCard";
import { SkillBadgeList } from "@/components/SkillBadge";
import {
  dashboardActivity,
  projects,
  suggestedTeammates,
} from "@/data/mock";

export const Route = createFileRoute("/_authenticated/dashboard")({
  head: () => ({
    meta: [
      { title: "Dashboard — ProjectConnect" },
      {
        name: "description",
        content:
          "Track your projects, applications, teammate matches and milestones from one student dashboard.",
      },
      { property: "og:title", content: "Dashboard — ProjectConnect" },
      {
        property: "og:description",
        content: "Your projects, applications and teammate matches in one place.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: DashboardPage,
});

function DashboardPage() {
  const { profile, skills, user } = useAuth();
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    void getAvatarUrl(profile?.avatar_url ?? null).then((u) => {
      if (active) setAvatarUrl(u);
    });
    return () => {
      active = false;
    };
  }, [profile?.avatar_url]);

  const displayName = profile?.full_name || user?.email?.split("@")[0] || "there";
  const firstName = displayName.split(" ")[0];

  const strength = useMemo(() => {
    const checks = [
      profile?.full_name,
      profile?.bio,
      profile?.college,
      profile?.course,
      profile?.semester,
      profile?.github_url,
      profile?.portfolio_url,
      profile?.avatar_url,
      skills.length >= 3 ? "ok" : null,
    ];
    const done = checks.filter(Boolean).length;
    return { pct: Math.round((done / checks.length) * 100), missing: checks.length - done };
  }, [profile, skills.length]);

  const stats = [
    { icon: FolderKanban, label: "Active projects", value: "3", delta: "+1 this month" },
    { icon: Send, label: "Applications sent", value: "11", delta: "4 pending" },
    { icon: Users2, label: "Skills listed", value: String(skills.length), delta: skills.length ? "shown on your profile" : "add your first skill" },
    {
      icon: TrendingUp,
      label: "Profile strength",
      value: `${strength.pct}%`,
      delta: strength.missing ? `${strength.missing} item${strength.missing > 1 ? "s" : ""} to complete` : "profile complete",
    },
  ];

  const myProjects = projects.slice(0, 2);
  const applied = projects.slice(2, 5);

  return (
    <div className="container-page py-10">
      <header className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-4 sm:flex sm:flex-wrap sm:justify-between">
        <div className="min-w-0">
          <p className="text-sm text-muted-foreground">Welcome back</p>
          <h1 className="truncate text-2xl font-bold sm:text-3xl">
            {firstName}, here's your build log
          </h1>
        </div>
        <Modal
          title="Create a new project"
          description="Post an idea and start collecting teammates. Saving goes live in a later phase."
          trigger={
            <Button className="shrink-0">
              <Plus className="h-4 w-4" aria-hidden="true" />
              New project
            </Button>
          }
          footer={
            <Button onClick={() => toast.success("Project draft captured (UI preview).")}>
              Publish project
            </Button>
          }
        >
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="new-title">Project title</Label>
              <Input id="new-title" placeholder="e.g. CampusPool" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="new-tagline">One-line pitch</Label>
              <Input id="new-tagline" placeholder="What does it do, in one line?" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="new-description">Description</Label>
              <Textarea id="new-description" rows={4} placeholder="Scope, stack and the roles you need." />
            </div>
          </div>
        </Modal>
      </header>

      <section aria-label="Your profile" className="mt-8">
        <Card className="shadow-soft">
          <CardContent className="grid gap-5 pt-6 md:grid-cols-[auto_minmax(0,1fr)_auto] md:items-center">
            {avatarUrl ? (
              <ProfilePhotoViewer
                src={avatarUrl}
                name={displayName}
                className="h-16 w-16 rounded-full"
              />
            ) : (
              <span
                aria-hidden="true"
                className="grid h-16 w-16 shrink-0 place-items-center rounded-full bg-secondary text-lg font-semibold"
              >
                {initialsFrom(displayName)}
              </span>
            )}
            <div className="min-w-0 space-y-2">
              <h2 className="truncate text-lg font-semibold">{displayName}</h2>
              {(profile?.course || profile?.college || profile?.semester) && (
                <p className="flex items-start gap-1.5 text-sm text-muted-foreground">
                  <GraduationCap className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
                  <span className="min-w-0">
                    {[profile?.course, profile?.semester, profile?.college].filter(Boolean).join(" · ")}
                  </span>
                </p>
              )}
              <p className="text-sm text-muted-foreground">
                {profile?.bio || "Add a short bio so teammates know what you're about."}
              </p>
              {skills.length > 0 ? (
                <SkillBadgeList skills={skills.map((s) => s.name)} max={10} variant="primary" />
              ) : (
                <p className="text-sm text-muted-foreground">No skills yet — add some on your profile.</p>
              )}
              {(profile?.github_url || profile?.portfolio_url) && (
                <div className="flex flex-wrap gap-4 pt-1 text-sm">
                  {profile?.github_url && (
                    <a
                      href={profile.github_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 hover:text-primary"
                    >
                      <Github className="h-4 w-4" aria-hidden="true" /> GitHub
                    </a>
                  )}
                  {profile?.portfolio_url && (
                    <a
                      href={profile.portfolio_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 hover:text-primary"
                    >
                      <Globe className="h-4 w-4" aria-hidden="true" /> Portfolio
                    </a>
                  )}
                </div>
              )}
            </div>
            <Button asChild variant="outline">
              <Link to="/profile">Edit profile</Link>
            </Button>
          </CardContent>
        </Card>
      </section>

      <ul className="mt-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {stats.map((s) => (
          <li key={s.label}>
            <Card className="shadow-soft">
              <CardContent className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 pt-6">
                <div className="min-w-0">
                  <p className="truncate text-sm text-muted-foreground">{s.label}</p>
                  <p className="mt-1 font-display text-2xl font-bold">{s.value}</p>
                  <p className="mt-1 truncate text-xs text-muted-foreground">{s.delta}</p>
                </div>
                <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-primary/10 text-primary">
                  <s.icon className="h-5 w-5" aria-hidden="true" />
                </span>
              </CardContent>
            </Card>
          </li>
        ))}
      </ul>

      <div className="mt-8 grid gap-8 lg:grid-cols-[minmax(0,1fr)_320px]">
        <section className="min-w-0" aria-label="Your projects">
          <Tabs defaultValue="my-projects">
            <TabsList>
              <TabsTrigger value="my-projects">My projects</TabsTrigger>
              <TabsTrigger value="applications">Applications</TabsTrigger>
            </TabsList>

            <TabsContent value="my-projects" className="mt-6 space-y-6">
              <div className="grid gap-6 sm:grid-cols-2">
                {myProjects.map((project) => (
                  <ProjectCard key={project.id} project={project} />
                ))}
              </div>
              <Card className="shadow-soft">
                <CardHeader>
                  <h2 className="text-base font-semibold">Milestone progress</h2>
                </CardHeader>
                <CardContent className="space-y-5">
                  {myProjects.map((project) => {
                    const pct = Math.round(
                      (project.milestones.filter((m) => m.done).length /
                        project.milestones.length) *
                        100,
                    );
                    return (
                      <div key={project.id}>
                        <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-2">
                          <span className="truncate text-sm font-medium">{project.title}</span>
                          <span className="shrink-0 text-xs text-muted-foreground">{pct}%</span>
                        </div>
                        <Progress
                          value={pct}
                          className="mt-2"
                          aria-label={`${project.title} progress`}
                        />
                      </div>
                    );
                  })}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="applications" className="mt-6">
              <Card className="shadow-soft">
                <CardHeader>
                  <h2 className="text-base font-semibold">Applications sent</h2>
                </CardHeader>
                <CardContent>
                  <ul className="divide-y divide-border">
                    {applied.map((project, i) => (
                      <li
                        key={project.id}
                        className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 py-4 first:pt-0 last:pb-0"
                      >
                        <div className="min-w-0">
                          <Link
                            to="/projects/$projectId"
                            params={{ projectId: project.id }}
                            className="truncate font-medium hover:text-primary"
                          >
                            {project.title}
                          </Link>
                          <p className="truncate text-xs text-muted-foreground">
                            {project.category} · applied {project.createdAt}
                          </p>
                        </div>
                        <span className="shrink-0 rounded-full border border-border bg-secondary px-3 py-1 text-xs font-medium">
                          {["Pending", "Shortlisted", "Accepted"][i % 3]}
                        </span>
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </section>

        <aside className="min-w-0 space-y-6">
          <Card className="shadow-soft">
            <CardHeader className="flex-row items-center gap-2">
              <Bell className="h-4 w-4 shrink-0 text-primary" aria-hidden="true" />
              <h2 className="text-base font-semibold">Recent activity</h2>
            </CardHeader>
            <CardContent>
              <ul className="space-y-4">
                {dashboardActivity.map((a) => (
                  <li key={a.text} className="flex gap-3">
                    <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-primary" />
                    <span className="min-w-0">
                      <span className="block text-sm">{a.text}</span>
                      <span className="block text-xs text-muted-foreground">{a.time}</span>
                    </span>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>

          <Card className="shadow-soft">
            <CardHeader>
              <h2 className="text-base font-semibold">Suggested teammates</h2>
            </CardHeader>
            <CardContent>
              <ul className="space-y-4">
                {suggestedTeammates.map((t) => (
                  <li key={t.name} className="grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-3">
                    <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-secondary text-xs font-semibold">
                      {t.initials}
                    </span>
                    <span className="min-w-0">
                      <span className="block truncate text-sm font-medium">{t.name}</span>
                      <span className="block truncate text-xs text-muted-foreground">{t.role}</span>
                      <SkillBadgeList className="mt-1.5" skills={t.skills} variant="outline" />
                    </span>
                    <span className="shrink-0 text-xs font-semibold text-primary">{t.match}%</span>
                  </li>
                ))}
              </ul>
              <Button
                variant="outline"
                className="mt-5 w-full"
                onClick={() => toast.info("Teammate matching arrives in the next phase.")}
              >
                See all matches
              </Button>
            </CardContent>
          </Card>
        </aside>
      </div>
    </div>
  );
}
