import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { toast } from "sonner";
import { ArrowLeft, Users, Clock, MapPin, CalendarDays, CheckCircle2, Circle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Progress } from "@/components/ui/progress";
import { Modal } from "@/components/Modal";
import { SkillBadge, SkillBadgeList } from "@/components/SkillBadge";
import { projects } from "@/data/mock";

export const Route = createFileRoute("/projects/$projectId")({
  loader: ({ params }) => {
    const project = projects.find((p) => p.id === params.projectId);
    if (!project) throw notFound();
    return { project };
  },
  head: ({ loaderData }) => {
    if (!loaderData) {
      return {
        meta: [{ title: "Project not found — ProjectConnect" }, { name: "robots", content: "noindex" }],
      };
    }
    const { project } = loaderData;
    const title = `${project.title} — ProjectConnect`;
    return {
      meta: [
        { title },
        { name: "description", content: project.tagline },
        { property: "og:title", content: title },
        { property: "og:description", content: project.tagline },
      ],
    };
  },
  component: ProjectDetailsPage,
});

function ProjectDetailsPage() {
  const { project } = Route.useLoaderData();
  const progress = Math.round(
    (project.milestones.filter((m) => m.done).length / project.milestones.length) * 100,
  );

  return (
    <div className="container-page py-8 lg:py-12">
      <Link
        to="/projects"
        className="inline-flex items-center gap-1.5 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" aria-hidden="true" />
        Back to projects
      </Link>

      <div className="mt-6 grid gap-8 lg:grid-cols-[minmax(0,1fr)_340px]">
        <article className="min-w-0 space-y-8">
          <header className="rounded-3xl border border-border bg-card p-6 shadow-soft sm:p-8">
            <div className="flex flex-wrap items-center gap-2">
              <SkillBadge variant="primary">{project.category}</SkillBadge>
              <SkillBadge variant="accent">{project.status}</SkillBadge>
              <span className="text-xs text-muted-foreground">Posted {project.createdAt}</span>
            </div>
            <h1 className="mt-4 text-3xl font-bold sm:text-4xl">{project.title}</h1>
            <p className="mt-3 text-lg text-muted-foreground">{project.tagline}</p>

            <dl className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {[
                { icon: Users, label: "Team", value: `${project.teamFilled}/${project.teamSize}` },
                { icon: Clock, label: "Commitment", value: project.commitment },
                { icon: CalendarDays, label: "Duration", value: project.duration },
                { icon: MapPin, label: "Mode", value: project.mode },
              ].map((item) => (
                <div key={item.label} className="min-w-0 rounded-xl bg-secondary/60 p-3">
                  <dt className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    <item.icon className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                    {item.label}
                  </dt>
                  <dd className="mt-1 truncate text-sm font-semibold">{item.value}</dd>
                </div>
              ))}
            </dl>
          </header>

          <section aria-labelledby="overview">
            <h2 id="overview" className="text-xl font-bold">
              About this project
            </h2>
            <p className="mt-3 leading-relaxed text-muted-foreground">{project.description}</p>
            <h3 className="mt-6 text-sm font-semibold uppercase tracking-wider text-muted-foreground">
              Tech & skills
            </h3>
            <SkillBadgeList className="mt-3" skills={project.skills} variant="primary" />
          </section>

          <section aria-labelledby="roles">
            <h2 id="roles" className="text-xl font-bold">
              Open roles
            </h2>
            <ul className="mt-4 grid gap-4 sm:grid-cols-2">
              {project.roles.map((role) => (
                <li key={role.title}>
                  <Card className="h-full shadow-soft">
                    <CardHeader className="gap-2">
                      <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-2">
                        <h3 className="truncate text-base font-semibold">{role.title}</h3>
                        <SkillBadge
                          size="sm"
                          variant={role.filled ? "outline" : "accent"}
                          className="shrink-0"
                        >
                          {role.filled ? "Filled" : "Open"}
                        </SkillBadge>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <SkillBadgeList skills={role.skills} size-hint="sm" />
                    </CardContent>
                  </Card>
                </li>
              ))}
            </ul>
          </section>

          <section aria-labelledby="milestones">
            <h2 id="milestones" className="text-xl font-bold">
              Roadmap
            </h2>
            <div className="mt-4 rounded-2xl border border-border bg-card p-6 shadow-soft">
              <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3">
                <Progress value={progress} aria-label="Project progress" />
                <span className="shrink-0 text-sm font-semibold">{progress}%</span>
              </div>
              <ol className="mt-5 space-y-3">
                {project.milestones.map((m) => (
                  <li key={m.label} className="flex items-start gap-3 text-sm">
                    {m.done ? (
                      <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-primary" aria-hidden="true" />
                    ) : (
                      <Circle className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" aria-hidden="true" />
                    )}
                    <span className={m.done ? "text-muted-foreground line-through" : ""}>
                      {m.label}
                    </span>
                  </li>
                ))}
              </ol>
            </div>
          </section>
        </article>

        {/* Sidebar */}
        <aside className="min-w-0 space-y-6 lg:sticky lg:top-24 lg:self-start">
          <Card className="shadow-lift">
            <CardHeader className="gap-1">
              <h2 className="text-base font-semibold">Join this project</h2>
              <p className="text-sm text-muted-foreground">
                {project.teamSize - project.teamFilled > 0
                  ? `${project.teamSize - project.teamFilled} open spots · ${project.applicants} applicants`
                  : "This team is currently full."}
              </p>
            </CardHeader>
            <CardContent className="space-y-3">
              <Modal
                title={`Apply to ${project.title}`}
                description="Tell the team why you're a good fit. Applications open in a later phase."
                trigger={
                  <Button className="w-full" size="lg">
                    Apply to join
                  </Button>
                }
                footer={
                  <Button onClick={() => toast.success("Draft saved locally — applications go live soon.")}>
                    Send application
                  </Button>
                }
              >
                <div className="space-y-2">
                  <Label htmlFor="application-note">Your message</Label>
                  <Textarea
                    id="application-note"
                    rows={5}
                    placeholder="Share relevant work, your availability and the role you want."
                  />
                </div>
              </Modal>
              <Button
                variant="outline"
                className="w-full"
                onClick={() => toast.info("Saved to your bookmarks (UI preview).")}
              >
                Save for later
              </Button>
            </CardContent>
          </Card>

          <Card className="shadow-soft">
            <CardHeader>
              <h2 className="text-base font-semibold">Project lead</h2>
            </CardHeader>
            <CardContent>
              <div className="flex min-w-0 items-center gap-3">
                <span className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-primary/10 font-semibold text-primary">
                  {project.owner.initials}
                </span>
                <span className="min-w-0">
                  <span className="block truncate font-medium">{project.owner.name}</span>
                  <span className="block truncate text-sm text-muted-foreground">
                    {project.owner.role}
                  </span>
                </span>
              </div>
              <p className="mt-4 text-sm text-muted-foreground">{project.college}</p>
              <Button asChild variant="outline" className="mt-4 w-full">
                <Link to="/profile">View profile</Link>
              </Button>
            </CardContent>
          </Card>
        </aside>
      </div>
    </div>
  );
}
