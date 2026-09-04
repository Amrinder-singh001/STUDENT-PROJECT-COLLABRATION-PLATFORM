import { useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Search, SlidersHorizontal, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ProjectCard } from "@/components/ProjectCard";
import { SkillBadge } from "@/components/SkillBadge";
import { categories, projects, skillFilters } from "@/data/mock";

export const Route = createFileRoute("/projects/")({
  head: () => ({
    meta: [
      { title: "Explore student projects — ProjectConnect" },
      {
        name: "description",
        content:
          "Browse live student projects by skill, category and time commitment, and find a team with open roles that fits you.",
      },
      { property: "og:title", content: "Explore student projects — ProjectConnect" },
      {
        property: "og:description",
        content: "Filter hundreds of student projects by skill, category and open roles.",
      },
    ],
  }),
  component: ProjectsPage,
});

const statuses = ["All statuses", "Recruiting", "In Progress", "Completed"] as const;

function ProjectsPage() {
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState<string>(categories[0] ?? "All categories");
  const [status, setStatus] = useState<string>(statuses[0]);
  const [skills, setSkills] = useState<string[]>([]);

  const toggleSkill = (skill: string) =>
    setSkills((prev) =>
      prev.includes(skill) ? prev.filter((s) => s !== skill) : [...prev, skill],
    );

  const results = useMemo(
    () =>
      projects.filter((p) => {
        const q = query.trim().toLowerCase();
        const matchesQuery =
          !q ||
          p.title.toLowerCase().includes(q) ||
          p.tagline.toLowerCase().includes(q) ||
          p.skills.some((s) => s.toLowerCase().includes(q));
        const matchesCategory = category === (categories[0] ?? "All categories") || p.category === category;
        const matchesStatus = status === statuses[0] || p.status === status;
        const matchesSkills =
          skills.length === 0 ||
          skills.some((s) => p.skills.some((ps) => ps.toLowerCase() === s.toLowerCase()));
        return matchesQuery && matchesCategory && matchesStatus && matchesSkills;
      }),
    [query, category, status, skills],
  );

  const hasFilters = query || category !== (categories[0] ?? "All categories") || status !== statuses[0] || skills.length;

  return (
    <div>
      <section className="border-b border-border bg-secondary/40">
        <div className="container-page py-12 lg:py-16">
          <h1 className="text-3xl font-bold sm:text-4xl">Explore projects</h1>
          <p className="mt-3 max-w-2xl text-muted-foreground">
            {projects.length} student projects looking for teammates right now. Filter by what
            you want to build.
          </p>
        </div>
      </section>

      <div className="container-page grid gap-8 py-10 lg:grid-cols-[280px_minmax(0,1fr)]">
        {/* Filters */}
        <aside aria-label="Project filters" className="min-w-0">
          <div className="rounded-2xl border border-border bg-card p-5 shadow-soft lg:sticky lg:top-24">
            <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-2">
              <h2 className="flex min-w-0 items-center gap-2 text-sm font-semibold uppercase tracking-wider">
                <SlidersHorizontal className="h-4 w-4 shrink-0" aria-hidden="true" />
                Filters
              </h2>
              {hasFilters ? (
                <button
                  type="button"
                  onClick={() => {
                    setQuery("");
                    setCategory(categories[0] ?? "All categories");
                    setStatus(statuses[0]);
                    setSkills([]);
                  }}
                  className="inline-flex shrink-0 items-center gap-1 text-xs font-medium text-primary hover:underline"
                >
                  <X className="h-3 w-3" aria-hidden="true" />
                  Clear
                </button>
              ) : null}
            </div>

            <div className="mt-5 space-y-5">
              <div className="space-y-2">
                <Label htmlFor="project-search">Search</Label>
                <div className="relative">
                  <Search
                    className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
                    aria-hidden="true"
                  />
                  <Input
                    id="project-search"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder="Title, skill, idea…"
                    className="pl-9"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="filter-category">Category</Label>
                <Select value={category} onValueChange={setCategory}>
                  <SelectTrigger id="filter-category">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {categories.map((c) => (
                      <SelectItem key={c} value={c}>
                        {c}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="filter-status">Status</Label>
                <Select value={status} onValueChange={setStatus}>
                  <SelectTrigger id="filter-status">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {statuses.map((s) => (
                      <SelectItem key={s} value={s}>
                        {s}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <fieldset className="space-y-3">
                <legend className="text-sm font-medium">Skills</legend>
                <ul className="flex flex-wrap gap-2">
                  {skillFilters.map((skill) => {
                    const active = skills.includes(skill);
                    return (
                      <li key={skill}>
                        <button
                          type="button"
                          aria-pressed={active}
                          onClick={() => toggleSkill(skill)}
                          className="rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                        >
                          <SkillBadge size="sm" variant={active ? "primary" : "outline"}>
                            {skill}
                          </SkillBadge>
                        </button>
                      </li>
                    );
                  })}
                </ul>
              </fieldset>
            </div>
          </div>
        </aside>

        {/* Results */}
        <section aria-label="Project results" className="min-w-0">
          <p className="text-sm text-muted-foreground">
            Showing <span className="font-medium text-foreground">{results.length}</span> of{" "}
            {projects.length} projects
          </p>

          {results.length ? (
            <div className="mt-5 grid gap-6 sm:grid-cols-2 2xl:grid-cols-3">
              {results.map((project) => (
                <ProjectCard key={project.id} project={project} />
              ))}
            </div>
          ) : (
            <div className="mt-5 rounded-2xl border border-dashed border-border p-12 text-center">
              <h2 className="font-display text-lg font-semibold">No projects match yet</h2>
              <p className="mx-auto mt-2 max-w-sm text-sm text-muted-foreground">
                Try removing a filter or widening your skill selection.
              </p>
              <Button
                className="mt-5"
                variant="outline"
                onClick={() => {
                  setQuery("");
                  setCategory(categories[0] ?? "All categories");
                  setStatus(statuses[0]);
                  setSkills([]);
                }}
              >
                Reset filters
              </Button>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
