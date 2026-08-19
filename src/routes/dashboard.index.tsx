import { createFileRoute, Link } from "@tanstack/react-router";
import { Avatar, Badge, Button, Card, EmptyState } from "@/components/brio/ui";
import { ExternalLink, ChevronRight, Folders, TrendingUp } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import {
  useProjects,
  useProfileCounts,
  useProfileCompletion,
} from "@/hooks/useData";

export const Route = createFileRoute("/dashboard/")({
  head: () => ({ meta: [{ title: "Overview — Brio" }] }),
  component: Overview,
});

function Overview() {
  const { user, profile } = useAuth();
  const userId = user?.id;
  const counts = useProfileCounts(userId);
  const completion = useProfileCompletion(userId);
  const { data: projects = [] } = useProjects(userId);

  const laneCats = [
    { key: "Projects", count: counts.projects, to: "/dashboard/projects" },
    { key: "Experience", count: counts.experience, to: "/dashboard/experience" },
    { key: "Education", count: counts.education, to: "/dashboard/education" },
    { key: "Achievements", count: counts.achievements, to: "/dashboard/achievements" },
    { key: "Skills", count: counts.skills, to: "/dashboard/skills" },
  ];

  // Generate personalized next steps based on what's missing
  const nextActions: { t: string; s: string }[] = [];
  if (counts.projects === 0) nextActions.push({ t: "Add your first project", s: "Projects are the core of your Brio profile." });
  else if (counts.projects === 1) nextActions.push({ t: "Add a second project", s: "Profiles with 2+ projects see stronger recruiter interest." });
  if (counts.experience === 0) nextActions.push({ t: "Add your first experience", s: "Internships, volunteering, and clubs all count." });
  else if (counts.experience === 1) nextActions.push({ t: "Add a second experience entry", s: "Profiles with 3+ experiences see 2× more recruiter views." });
  if (counts.education === 0) nextActions.push({ t: "Add your education", s: "Your institution and program signal context to reviewers." });
  if (counts.achievements === 0) nextActions.push({ t: "Add an achievement or award", s: "Level signals matter in competitive applications." });
  if (!profile?.goal) nextActions.push({ t: "Write your goal statement", s: "Specific goals outperform broad ambitions." });
  if (!profile?.avatar_url) nextActions.push({ t: "Upload a profile photo", s: "Profiles with photos look more credible." });
  if (counts.skills === 0 && counts.projects > 0) nextActions.push({ t: "Add skills to your projects", s: "Skills are derived from evidence — link them to projects." });
  if (completion >= 80) nextActions.push({ t: "Generate your first resume export", s: "Tailor a one-page resume to a target role." });

  const displayActions = nextActions.slice(0, 5);
  const featuredProjects = projects.filter((p) => p.featured);
  const initials = profile?.initials ?? "?";

  return (
    <div className="space-y-10">
      <h1 className="text-[24px] font-medium tracking-[-0.02em] text-[var(--ink)]">Overview</h1>

      {/* Profile card */}
      <div className="rounded-lg border border-[var(--surface-3)] bg-[var(--surface-2)] p-6">
        <div className="flex flex-col sm:flex-row sm:flex-wrap items-start sm:items-center gap-6">
          {profile?.avatar_url ? (
            <img
              src={profile.avatar_url}
              alt={profile.name}
              className="h-24 w-24 rounded-full object-cover ring-2 ring-white"
            />
          ) : (
            <Avatar size="xl" initials={initials} />
          )}
          <div className="min-w-0 flex-1">
            <div className="text-[24px] font-medium text-[var(--ink)]">
              {profile?.name || "Add your name"}
            </div>
            <div className="text-[13px] text-[var(--ink-3)]">
              {[profile?.school, profile?.program, profile?.graduation_year ? `Class of ${profile.graduation_year}` : null]
                .filter(Boolean)
                .join(" · ") || "Add your school and program"}
            </div>
            {profile?.goal ? (
              <div className="mt-3 max-w-[480px] text-[13px] italic text-[var(--ink-2)]">
                "{profile.goal}"
              </div>
            ) : (
              <div className="mt-3 text-[13px] italic text-[var(--ink-3)]">
                Add a goal statement to strengthen your profile.
              </div>
            )}
            <div className="mt-3 flex flex-wrap items-center gap-2">
              {profile?.intent && <Badge>{profile.intent}</Badge>}
              {profile?.location && <Badge>{profile.location}</Badge>}
            </div>
          </div>
          <div className="flex shrink-0 items-center gap-6 sm:gap-8 border-t border-[var(--surface-3)] pt-4 w-full sm:w-auto sm:border-t-0 sm:border-l sm:pt-0 sm:pl-8">
            <div>
              <div className="text-[30px] sm:text-[36px] font-light tracking-[-0.03em] text-[var(--ink)]">
                {counts.projects}
              </div>
              <div className="text-[11px] uppercase tracking-[0.04em] text-[var(--ink-3)]">Projects</div>
            </div>
            <div>
              <div className="text-[30px] sm:text-[36px] font-light tracking-[-0.03em] text-[var(--ink)]">
                {counts.experience}
              </div>
              <div className="text-[11px] uppercase tracking-[0.04em] text-[var(--ink-3)]">Experience</div>
            </div>
          </div>
        </div>
        <div className="mt-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="text-[11px] text-[var(--ink-3)]">Profile {completion}% complete</div>
            <div className="h-1.5 w-32 overflow-hidden rounded-full bg-[var(--surface-3)]">
              <div
                className="h-full rounded-full bg-[var(--ink)] transition-all duration-500"
                style={{ width: `${completion}%` }}
              />
            </div>
          </div>
          <Link to="/settings">
            <Button variant="ghost" size="sm">Edit profile</Button>
          </Link>
        </div>
      </div>

      {/* Profile highlights */}
      <section>
        <h2 className="mb-3 text-[13px] font-medium text-[var(--ink)]">Profile Highlights</h2>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
          {laneCats.map((l) => (
            <Link key={l.key} to={l.to} className="block">
              <div
                className="rounded-lg border border-l-[3px] border-[var(--surface-3)] bg-[var(--surface-2)] p-4 transition-colors hover:bg-white"
                style={{ borderLeftColor: l.count > 0 ? "var(--ink)" : "var(--surface-3)" }}
              >
                <div className="text-[11px] font-medium uppercase tracking-[0.04em] text-[var(--ink-3)]">
                  {l.key}
                </div>
                <div className="mt-2 text-[18px] font-medium text-[var(--ink)]">
                  {l.count > 0 ? `${l.count} ${l.count === 1 ? "item" : "items"}` : "None yet"}
                </div>
                <div className="mt-2 text-[11px] text-[var(--accent-warm)]">
                  {l.count > 0 ? "View all →" : "Add →"}
                </div>
              </div>
            </Link>
          ))}
        </div>
      </section>

      {/* Next steps */}
      {displayActions.length > 0 && (
        <section>
          <h2 className="mb-3 text-[13px] font-medium text-[var(--ink)]">Next steps</h2>
          <div className="overflow-hidden rounded-lg border border-[var(--surface-3)] bg-white">
            {displayActions.map((a, i) => (
              <div
                key={a.t}
                className={`flex items-center gap-4 px-5 py-4 ${i > 0 ? "border-t border-[var(--surface-3)]" : ""}`}
              >
                <ChevronRight className="h-4 w-4 text-[var(--accent-warm)]" />
                <div className="flex-1">
                  <div className="text-[13px] text-[var(--ink)]">{a.t}</div>
                  <div className="text-[11px] text-[var(--ink-3)]">{a.s}</div>
                </div>
                <ChevronRight className="h-4 w-4 text-[var(--ink-3)]" />
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Featured projects */}
      <section>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-[13px] font-medium text-[var(--ink)]">Featured projects</h2>
          <Link
            to="/dashboard/projects"
            className="text-[13px] text-[var(--ink-2)] hover:text-[var(--ink)]"
          >
            View all →
          </Link>
        </div>
        {featuredProjects.length === 0 ? (
          <Card className="border-dashed">
            <EmptyState
              icon={<Folders className="h-6 w-6" />}
              title="No featured projects yet"
              body="Mark a project as featured to highlight your best work here."
              cta={
                <Link to="/dashboard/projects">
                  <Button variant="primary" size="sm">Add a project</Button>
                </Link>
              }
            />
          </Card>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {featuredProjects.map((p) => (
              <Card key={p.id} hover className="bg-white">
                <div className="flex items-start justify-between gap-2">
                  <h3 className="text-[15px] font-medium text-[var(--ink)]">{p.title}</h3>
                  <Badge variant="featured">Featured</Badge>
                </div>
                <div className="mt-1 text-[11px] uppercase tracking-[0.02em] text-[var(--ink-3)]">
                  {p.type}
                </div>
                <p className="mt-3 line-clamp-2 text-[13px] text-[var(--ink-2)]">{p.result}</p>
                <div className="mt-4 flex flex-wrap items-center gap-1.5">
                  {p.skills.slice(0, 3).map((s) => (
                    <Badge key={s}>{s}</Badge>
                  ))}
                  {p.url && <ExternalLink className="h-3.5 w-3.5 text-[var(--ink-3)]" />}
                </div>
              </Card>
            ))}
          </div>
        )}
      </section>

      {/* Profile completion encouragement */}
      {completion === 100 && (
        <div className="flex items-center gap-3 rounded-lg border border-[var(--surface-3)] bg-white px-5 py-4">
          <TrendingUp className="h-5 w-5 text-[var(--success)]" />
          <div>
            <div className="text-[13px] font-medium text-[var(--ink)]">Profile complete!</div>
            <div className="text-[11px] text-[var(--ink-3)]">
              Your profile is fully set up. Export your resume from the Output tab.
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
