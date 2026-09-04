import { createFileRoute, Link } from "@tanstack/react-router";
import { toast } from "sonner";
import { MapPin, GraduationCap, Clock, Mail, Pencil } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Modal } from "@/components/Modal";
import { SkillBadge, SkillBadgeList } from "@/components/SkillBadge";
import { ProjectCard } from "@/components/ProjectCard";
import { currentStudent, projects } from "@/data/mock";

export const Route = createFileRoute("/profile")({
  head: () => ({
    meta: [
      { title: `${currentStudent.name} — Student profile on ProjectConnect` },
      {
        name: "description",
        content:
          "A ProjectConnect student profile: skills, availability, project history and the teams they're building with.",
      },
      { property: "og:title", content: `${currentStudent.name} — ProjectConnect profile` },
      {
        property: "og:description",
        content: "Skills, availability and project history for a student builder.",
      },
    ],
  }),
  component: ProfilePage,
});

function ProfilePage() {
  const involved = projects.slice(0, 2);

  return (
    <div>
      <section className="surface-hero">
        <div className="container-page py-12">
          <div className="grid gap-6 sm:grid-cols-[auto_minmax(0,1fr)_auto] sm:items-center">
            <span className="grid h-20 w-20 shrink-0 place-items-center rounded-2xl bg-ink-foreground/10 font-display text-2xl font-bold">
              {currentStudent.initials}
            </span>
            <div className="min-w-0">
              <h1 className="truncate text-3xl font-bold sm:text-4xl">{currentStudent.name}</h1>
              <p className="mt-2 text-ink-foreground/75">{currentStudent.headline}</p>
              <ul className="mt-4 flex flex-wrap gap-x-5 gap-y-2 text-sm text-ink-foreground/70">
                <li className="flex items-center gap-1.5">
                  <GraduationCap className="h-4 w-4 shrink-0" aria-hidden="true" />
                  {currentStudent.branch}, {currentStudent.year}
                </li>
                <li className="flex items-center gap-1.5">
                  <MapPin className="h-4 w-4 shrink-0" aria-hidden="true" />
                  {currentStudent.location}
                </li>
                <li className="flex items-center gap-1.5">
                  <Clock className="h-4 w-4 shrink-0" aria-hidden="true" />
                  {currentStudent.availability}
                </li>
              </ul>
            </div>
            <div className="flex flex-wrap gap-2 sm:shrink-0">
              <Modal
                title="Edit profile"
                description="Changes are preview-only until accounts go live."
                trigger={
                  <Button variant="secondary">
                    <Pencil className="h-4 w-4" aria-hidden="true" />
                    Edit profile
                  </Button>
                }
                footer={
                  <Button onClick={() => toast.success("Profile preview updated.")}>
                    Save changes
                  </Button>
                }
              >
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="edit-headline">Headline</Label>
                    <Input id="edit-headline" defaultValue={currentStudent.headline} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="edit-bio">Bio</Label>
                    <Textarea id="edit-bio" rows={4} defaultValue={currentStudent.bio} />
                  </div>
                </div>
              </Modal>
              <Button
                variant="outline"
                className="border-ink-foreground/25 bg-transparent text-ink-foreground hover:bg-ink-foreground/10 hover:text-ink-foreground"
                onClick={() => toast.info("Messaging arrives with the collaboration phase.")}
              >
                <Mail className="h-4 w-4" aria-hidden="true" />
                Message
              </Button>
            </div>
          </div>
        </div>
      </section>

      <div className="container-page grid gap-8 py-10 lg:grid-cols-[minmax(0,1fr)_320px]">
        <div className="min-w-0 space-y-8">
          <Card className="shadow-soft">
            <CardHeader>
              <h2 className="text-lg font-bold">About</h2>
            </CardHeader>
            <CardContent>
              <p className="leading-relaxed text-muted-foreground">{currentStudent.bio}</p>
            </CardContent>
          </Card>

          <Card className="shadow-soft">
            <CardHeader>
              <h2 className="text-lg font-bold">Skills</h2>
            </CardHeader>
            <CardContent>
              <ul className="grid gap-3 sm:grid-cols-2">
                {currentStudent.skills.map((skill) => (
                  <li
                    key={skill.name}
                    className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-2 rounded-xl border border-border px-4 py-3"
                  >
                    <span className="truncate text-sm font-medium">{skill.name}</span>
                    <SkillBadge size="sm" variant="primary" className="shrink-0">
                      {skill.level}
                    </SkillBadge>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>

          <Card className="shadow-soft">
            <CardHeader>
              <h2 className="text-lg font-bold">Experience</h2>
            </CardHeader>
            <CardContent>
              <ol className="space-y-6">
                {currentStudent.experience.map((exp) => (
                  <li key={exp.title} className="border-l-2 border-primary/30 pl-4">
                    <h3 className="text-base font-semibold">{exp.title}</h3>
                    <p className="text-sm text-muted-foreground">
                      {exp.org} · {exp.period}
                    </p>
                    <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                      {exp.detail}
                    </p>
                  </li>
                ))}
              </ol>
            </CardContent>
          </Card>

          <section aria-labelledby="profile-projects">
            <h2 id="profile-projects" className="text-lg font-bold">
              Projects
            </h2>
            <div className="mt-4 grid gap-6 sm:grid-cols-2">
              {involved.map((project) => (
                <ProjectCard key={project.id} project={project} />
              ))}
            </div>
          </section>
        </div>

        <aside className="min-w-0 space-y-6">
          <Card className="shadow-soft">
            <CardHeader>
              <h2 className="text-base font-semibold">Activity</h2>
            </CardHeader>
            <CardContent>
              <dl className="grid grid-cols-2 gap-4">
                {currentStudent.stats.map((stat) => (
                  <div key={stat.label} className="rounded-xl bg-secondary/60 p-3">
                    <dt className="text-xs text-muted-foreground">{stat.label}</dt>
                    <dd className="mt-1 font-display text-xl font-bold">{stat.value}</dd>
                  </div>
                ))}
              </dl>
            </CardContent>
          </Card>

          <Card className="shadow-soft">
            <CardHeader>
              <h2 className="text-base font-semibold">Interests</h2>
            </CardHeader>
            <CardContent>
              <SkillBadgeList skills={currentStudent.interests} variant="accent" />
            </CardContent>
          </Card>

          <Card className="shadow-soft">
            <CardHeader className="gap-1">
              <h2 className="text-base font-semibold">Looking for a team?</h2>
              <p className="text-sm text-muted-foreground">
                Browse projects that match your stack.
              </p>
            </CardHeader>
            <CardContent>
              <Button asChild className="w-full">
                <Link to="/projects">Explore projects</Link>
              </Button>
            </CardContent>
          </Card>
        </aside>
      </div>
    </div>
  );
}
