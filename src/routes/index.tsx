import * as React from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Link } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/brio/ui";
import { ChevronDown, ChevronUp, ArrowRight } from "lucide-react";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Brio — Build your professional identity before graduation" },
      {
        name: "description",
        content:
          "Brio is the professional profile for ambitious students. Log every project, achievement, and experience in one place. Generate tailored resumes and portfolios in minutes.",
      },
      {
        property: "og:title",
        content: "Brio — Build your professional identity before graduation",
      },
      {
        property: "og:description",
        content: "One profile. Every output. Built for ambitious students.",
      },
    ],
  }),
  component: Index,
});

function Index() {
  const [scrolled, setScrolled] = useState(false);
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <div className="min-h-dvh bg-[var(--surface)]">
      <TopNav scrolled={scrolled} />
      <Hero />
      <WhatYouStore />
      <HowItWorks />
      <FeatureNarrative />
      <WhyItMatters />
      <TrustSignals />
      <FinalCTA />
      <FAQ />
      <Footer />
    </div>
  );
}

function TopNav({ scrolled }: { scrolled: boolean }) {
  const [open, setOpen] = useState(false);
  return (
    <header
      className="fixed inset-x-0 top-0 z-50 backdrop-blur-md transition-all duration-200"
      style={{
        backgroundColor: "rgba(250,250,249,0.85)",
        borderBottom: scrolled ? "1px solid var(--surface-3)" : "1px solid transparent",
      }}
    >
      <div className="mx-auto flex h-14 max-w-[1100px] items-center justify-between px-6">
        <Link
          to="/"
          className="font-serif text-[18px] font-semibold tracking-[-0.02em] text-[var(--ink)]"
        >
          Brio
        </Link>
        <nav className="hidden items-center gap-7 md:flex">
          {[
            { label: "How it works", href: "#how-it-works" },
            { label: "What you store", href: "#what-you-store" },
            { label: "FAQ", href: "#faq" },
          ].map((l) => (
            <a
              key={l.label}
              href={l.href}
              className="text-[13px] text-[var(--ink-2)] transition-colors duration-150 hover:text-[var(--ink)]"
            >
              {l.label}
            </a>
          ))}
        </nav>
        <div className="hidden items-center gap-2 md:flex">
          <Link to="/login">
            <Button variant="ghost" size="sm">
              Log in
            </Button>
          </Link>
          <Link to="/signup">
            <Button variant="warm" size="sm">
              Start free
            </Button>
          </Link>
        </div>
        <button
          onClick={() => setOpen(!open)}
          className="flex h-11 w-11 items-center justify-center rounded-md text-[var(--ink)] hover:bg-[var(--surface-2)] transition-colors md:hidden focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ink)] focus-visible:ring-offset-1"
          aria-label={open ? "Close menu" : "Open menu"}
          aria-expanded={open}
        >
          {open ? (
            <ChevronUp className="h-5 w-5" aria-hidden="true" />
          ) : (
            <ChevronDown className="h-5 w-5" aria-hidden="true" />
          )}
        </button>
      </div>
      {open && (
        <div className="border-t border-[var(--surface-3)] bg-[var(--surface)] px-6 py-4 md:hidden">
          {[
            { label: "How it works", href: "#how-it-works" },
            { label: "What you store", href: "#what-you-store" },
            { label: "FAQ", href: "#faq" },
          ].map((l) => (
            <a
              key={l.label}
              href={l.href}
              className="flex min-h-[44px] items-center text-[16px] text-[var(--ink)] hover:text-[var(--ink-2)] transition-colors"
              onClick={() => setOpen(false)}
            >
              {l.label}
            </a>
          ))}
          <div className="mt-4 flex gap-2">
            <Link to="/login" className="flex-1" onClick={() => setOpen(false)}>
              <Button variant="secondary" size="md" className="w-full">
                Log in
              </Button>
            </Link>
            <Link to="/signup" className="flex-1" onClick={() => setOpen(false)}>
              <Button variant="warm" size="md" className="w-full">
                Start free
              </Button>
            </Link>
          </div>
        </div>
      )}
    </header>
  );
}

function Hero() {
  const [shown, setShown] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => setShown(true), 100);
    return () => clearTimeout(t);
  }, []);
  return (
    <section className="px-4 pb-20 pt-[120px] sm:px-5 sm:pb-24">
      <div className="mx-auto max-w-[960px] text-center">
        <p className="mb-4 text-[13px] font-medium uppercase tracking-[0.04em] text-[var(--ink-3)]">
          For ambitious students
        </p>
        <h1 className="mx-auto max-w-[820px] font-serif font-normal text-[var(--ink)] text-[36px] leading-[1.1] tracking-[-0.03em] sm:text-[44px] sm:leading-[1.05] sm:tracking-[-0.04em] md:text-[72px] md:leading-[1.0] md:tracking-[-0.05em]">
          Your achievements deserve
          <br />
          more than a spreadsheet.
        </h1>
        <p className="mx-auto mt-5 max-w-[580px] text-[16px] leading-[1.6] tracking-[-0.01em] text-[var(--ink-2)] sm:mt-6 sm:text-[18px]">
          Brio is a structured profile that organises every project, experience, and achievement in
          one place — and turns them into the exact resume a recruiter needs.
        </p>
        <div className="mt-6 flex flex-col items-center justify-center gap-3 sm:mt-8 sm:flex-row">
          <Link to="/signup" className="w-full sm:w-auto">
            <Button variant="warm" size="lg" className="w-full sm:w-auto">
              Build your profile free
            </Button>
          </Link>
          <a href="#how-it-works" className="w-full sm:w-auto">
            <Button variant="secondary" size="lg" className="w-full sm:w-auto">
              See how it works
            </Button>
          </a>
        </div>
        <p className="mt-3 text-[11px] text-[var(--ink-3)]">
          Free to start. No credit card required.
        </p>

        <div
          className="mx-auto mt-12 max-w-[900px] overflow-hidden rounded-lg border border-[var(--surface-3)] bg-white text-left transition-all duration-[600ms] sm:mt-16"
          style={{
            boxShadow: "0 16px 64px rgba(0,0,0,0.08)",
            opacity: shown ? 1 : 0,
            transform: shown ? "translateY(0)" : "translateY(16px)",
          }}
        >
          <ProductPreviewMock />
        </div>
      </div>
    </section>
  );
}

function ProductPreviewMock() {
  return (
    <div className="grid grid-cols-[56px_1fr] sm:grid-cols-[200px_1fr]">
      <div className="hidden border-r border-[var(--surface-3)] bg-[var(--surface)] p-4 sm:block">
        <div className="mb-6 flex items-center gap-2">
          <div className="h-8 w-8 shrink-0 rounded-full bg-[var(--surface-3)]" />
          <div>
            <div className="h-2.5 w-20 rounded bg-[var(--surface-3)]" />
            <div className="mt-1 h-2 w-14 rounded bg-[var(--surface-3)]" />
          </div>
        </div>
        {["Overview", "Projects", "Experience", "Education", "Skills"].map((l, i) => (
          <div
            key={l}
            className={`mb-1 h-7 rounded px-2 text-[12px] leading-7 ${i === 0 ? "bg-[var(--surface-2)] text-[var(--ink)] font-medium" : "text-[var(--ink-2)]"}`}
          >
            {l}
          </div>
        ))}
      </div>
      {/* Narrow placeholder sidebar on mobile */}
      <div className="sm:hidden border-r border-[var(--surface-3)] bg-[var(--surface)]" />
      <div className="overflow-hidden p-4 sm:p-6 md:p-8">
        <div className="text-[18px] font-medium text-[var(--ink)] sm:text-[20px]">Alex Rivera</div>
        <div className="text-[12px] text-[var(--ink-3)] sm:text-[13px]">
          UC Berkeley · CS · Class of 2026
        </div>
        <div className="mt-2 text-[12px] text-[var(--ink-2)] italic sm:mt-3 sm:text-[13px]">
          "Seeking a product management internship at a consumer tech company."
        </div>
        <div className="mt-4 grid grid-cols-1 gap-3 sm:mt-6 sm:grid-cols-2 lg:grid-cols-3">
          {["CalRoute", "Climate Dashboard", "react-query-devtools-lite"].map((p) => (
            <div
              key={p}
              className="rounded-md border border-[var(--surface-3)] bg-[var(--surface)] p-3 sm:p-4"
            >
              <div className="text-[12px] font-medium text-[var(--ink)] sm:text-[13px]">{p}</div>
              <div className="mt-1 text-[10px] uppercase tracking-[0.02em] text-[var(--ink-3)] sm:text-[11px]">
                Project
              </div>
              <div className="mt-2 h-2 w-full rounded bg-[var(--surface-3)]" />
              <div className="mt-1 h-2 w-3/4 rounded bg-[var(--surface-3)]" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function WhatYouStore() {
  const categories = [
    {
      label: "Projects",
      items: ["Side projects", "Hackathon builds", "Research work", "Open source contributions"],
    },
    {
      label: "Experience",
      items: ["Internships", "Part-time roles", "Freelance work", "Teaching & tutoring"],
    },
    {
      label: "Leadership",
      items: ["Club officerships", "Event organising", "Team captaincy", "Community initiatives"],
    },
    {
      label: "Achievements",
      items: ["Competitions", "Scholarships", "Publications", "Dean's list"],
    },
    {
      label: "Education",
      items: ["Degrees", "Relevant coursework", "Study abroad", "Online certifications"],
    },
    {
      label: "Skills",
      items: ["Technical skills", "Languages", "Tools", "Derived from your work"],
    },
  ];

  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(
      (entries) => entries.forEach((e) => e.isIntersecting && setVisible(true)),
      { threshold: 0.1 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  return (
    <section id="what-you-store" className="bg-[var(--surface-2)] px-4 py-16 sm:px-5 sm:py-24">
      <div className="mx-auto max-w-[960px]">
        <div className="mb-10 sm:mb-14">
          <h2 className="font-serif text-[28px] font-normal tracking-[-0.03em] text-[var(--ink)] sm:text-[36px]">
            Everything that makes you stand out.
          </h2>
          <p className="mt-3 max-w-[540px] text-[15px] leading-[1.6] text-[var(--ink-2)]">
            Students miss opportunities because their best work is scattered across notes, docs, and
            emails. Brio gives all of it a permanent home.
          </p>
        </div>
        <div
          ref={ref}
          className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 transition-all duration-[500ms] ease-out"
          style={{
            opacity: visible ? 1 : 0,
            transform: visible ? "translateY(0)" : "translateY(20px)",
          }}
        >
          {categories.map((cat) => (
            <div
              key={cat.label}
              className="rounded-md border border-[var(--surface-3)] bg-white p-5"
            >
              <div className="mb-3 text-[12px] font-semibold uppercase tracking-[0.06em] text-[var(--ink-3)]">
                {cat.label}
              </div>
              <ul className="space-y-1.5">
                {cat.items.map((item) => (
                  <li
                    key={item}
                    className="flex items-center gap-2 text-[14px] text-[var(--ink-2)]"
                  >
                    <span className="text-[var(--accent-warm)] text-[10px]">●</span>
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function HowItWorks() {
  const steps = [
    {
      number: "01",
      heading: "Log your work as it happens.",
      body: "Add projects, roles, and achievements using a simple structured form. Brio prompts you with the right fields — what was the problem, what did you do, what was the result.",
    },
    {
      number: "02",
      heading: "Build a verified skills profile.",
      body: "Every skill must be linked to real work. No self-rated stars. Brio surfaces your skills automatically from the experiences you log — so recruiters see evidence, not claims.",
    },
    {
      number: "03",
      heading: "Export exactly what the moment requires.",
      body: "One-page resume for an internship application. Portfolio link for a design role. Application snippets for a scholarship. One profile, every output.",
    },
  ];

  return (
    <section id="how-it-works" className="px-4 py-16 sm:px-5 sm:py-24">
      <div className="mx-auto max-w-[960px]">
        <h2 className="mb-10 font-serif text-[28px] font-normal tracking-[-0.03em] text-[var(--ink)] sm:mb-14 sm:text-[36px]">
          How Brio works.
        </h2>
        <div className="grid gap-8 md:grid-cols-3">
          {steps.map((step) => (
            <HowItWorksStep key={step.number} {...step} />
          ))}
        </div>
      </div>
    </section>
  );
}

function HowItWorksStep({
  number,
  heading,
  body,
}: {
  number: string;
  heading: string;
  body: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(
      (entries) => entries.forEach((e) => e.isIntersecting && setVisible(true)),
      { threshold: 0.2 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  return (
    <div
      ref={ref}
      className="transition-all duration-[400ms] ease-out"
      style={{
        opacity: visible ? 1 : 0,
        transform: visible ? "translateY(0)" : "translateY(20px)",
      }}
    >
      <div className="mb-4 font-serif text-[40px] font-normal tracking-[-0.04em] text-[var(--surface-3)]">
        {number}
      </div>
      <h3 className="text-[17px] font-medium tracking-[-0.02em] text-[var(--ink)]">{heading}</h3>
      <p className="mt-2 text-[14px] leading-[1.7] text-[var(--ink-2)]">{body}</p>
    </div>
  );
}

function FeatureBlock({
  reverse,
  heading,
  body,
  detail,
  mock,
}: {
  reverse?: boolean;
  heading: string;
  body: string;
  detail: string;
  mock: React.ReactNode;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(
      (entries) => entries.forEach((e) => e.isIntersecting && setVisible(true)),
      { threshold: 0.2 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);
  return (
    <div
      ref={ref}
      className={`grid items-center gap-10 md:grid-cols-2 ${reverse ? "md:[&>div:first-child]:order-2" : ""} transition-all duration-[400ms] ease-out`}
      style={{
        opacity: visible ? 1 : 0,
        transform: visible ? "translateY(0)" : "translateY(24px)",
      }}
    >
      <div>
        <h3 className="text-[20px] font-medium tracking-[-0.02em] text-[var(--ink)] sm:text-[24px]">
          {heading}
        </h3>
        <p className="mt-3 text-[15px] leading-[1.7] text-[var(--ink-2)]">{body}</p>
        <p className="mt-4 text-[13px] text-[var(--ink-3)]">{detail}</p>
      </div>
      <div>{mock}</div>
    </div>
  );
}

function FeatureNarrative() {
  return (
    <section className="bg-[var(--surface-2)] px-4 py-16 sm:px-5 sm:py-24">
      <div className="mx-auto max-w-[960px]">
        <h2 className="mb-10 text-center font-serif text-[28px] font-normal tracking-[-0.03em] text-[var(--ink)] sm:mb-12 sm:text-[36px]">
          One profile. Every output.
        </h2>
        <div className="space-y-16 sm:space-y-20">
          <FeatureBlock
            heading="Enter your work once. Use it everywhere."
            body="Brio organises every project, role, course, and award into a single identity graph. Update it once and every resume, portfolio, and application snippet reflects your latest work."
            detail="The graph stays canonical. You stay current."
            mock={<MockProjectForm />}
          />
          <FeatureBlock
            reverse
            heading="Evidence-backed skills only."
            body="Every skill must be linked to a real project or experience. No self-rated stars. No empty claims. Just evidence a recruiter can read in 30 seconds."
            detail="Skills derive automatically from the work you log."
            mock={<MockSkillsPanel />}
          />
          <FeatureBlock
            heading="Export exactly what the moment requires."
            body="Generate a one-page resume tailored to a specific role, share a portfolio link, or copy ready-made application snippets — all from the same profile."
            detail="One source of truth. Many outputs."
            mock={<MockExportPanel />}
          />
        </div>
      </div>
    </section>
  );
}

function MockProjectForm() {
  return (
    <div
      className="rounded-md border border-[var(--surface-3)] bg-white p-5"
      style={{ boxShadow: "0 4px 16px rgba(0,0,0,0.05)" }}
    >
      <div className="text-[11px] uppercase tracking-[0.04em] text-[var(--ink-3)]">New project</div>
      <div className="mt-2 text-[15px] font-medium text-[var(--ink)]">
        CalRoute — Campus Navigation App
      </div>
      <div className="mt-4 space-y-3">
        {[
          {
            l: "Problem",
            v: "Freshmen kept arriving late to class because campus maps ignored elevation.",
          },
          {
            l: "Action",
            v: "Shipped an iOS app in Swift with accessible routing and live elevation data.",
          },
          { l: "Result", v: "1,800 active users, 32% fewer late arrivals reported." },
        ].map((r) => (
          <div key={r.l} className="border-l-2 border-[var(--surface-3)] pl-3">
            <div className="text-[10px] uppercase tracking-[0.04em] text-[var(--ink-3)]">{r.l}</div>
            <div className="text-[13px] text-[var(--ink-2)]">{r.v}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

function MockSkillsPanel() {
  return (
    <div
      className="rounded-md border border-[var(--surface-3)] bg-white p-5"
      style={{ boxShadow: "0 4px 16px rgba(0,0,0,0.05)" }}
    >
      <div className="text-[11px] uppercase tracking-[0.04em] text-[var(--ink-3)]">Technical</div>
      <div className="mt-2 flex flex-wrap gap-1.5">
        {["Swift", "TypeScript", "React", "Python", "D3"].map((s) => (
          <span
            key={s}
            className="inline-flex rounded-full border border-[var(--surface-3)] bg-[var(--surface-2)] px-2 py-0.5 text-[11px] text-[var(--ink-2)]"
          >
            {s}
          </span>
        ))}
      </div>
      <div className="mt-4 text-[11px] uppercase tracking-[0.04em] text-[var(--ink-3)]">
        Soft Skills
      </div>
      <div className="mt-2 flex flex-wrap gap-1.5">
        {["User Research", "Product Design"].map((s) => (
          <span
            key={s}
            className="inline-flex rounded-full border border-[var(--surface-3)] bg-[var(--surface-2)] px-2 py-0.5 text-[11px] text-[var(--ink-2)]"
          >
            {s}
          </span>
        ))}
      </div>
      <div className="mt-4 text-[11px] text-[var(--ink-3)]">
        Derived from CalRoute · Linear Internship
      </div>
    </div>
  );
}

function MockExportPanel() {
  return (
    <div
      className="rounded-md border border-[var(--surface-3)] bg-white p-5"
      style={{ boxShadow: "0 4px 16px rgba(0,0,0,0.05)" }}
    >
      <div className="text-[11px] uppercase tracking-[0.04em] text-[var(--ink-3)]">
        Choose a format
      </div>
      <div className="mt-2 space-y-2">
        {[
          { t: "Resume — One Page", a: true },
          { t: "Portfolio View" },
          { t: "Application Snippets" },
        ].map((o) => (
          <div
            key={o.t}
            className={`rounded-md border p-3 text-[13px] ${o.a ? "border-[var(--ink)] bg-[var(--surface-2)] font-medium text-[var(--ink)]" : "border-[var(--surface-3)] text-[var(--ink-2)]"}`}
          >
            {o.t}
          </div>
        ))}
      </div>
    </div>
  );
}

function WhyItMatters() {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(
      (entries) => entries.forEach((e) => e.isIntersecting && setVisible(true)),
      { threshold: 0.15 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  const points = [
    {
      heading: "Recruiters spend 7 seconds on a resume.",
      body: "Every bullet you write needs to earn its place. Brio's PAR structure — Problem, Action, Result — forces you to quantify your impact before you apply.",
    },
    {
      heading: "Most students forget half their work.",
      body: "A hackathon win from sophomore year, a paper you co-authored, a workshop you led. By the time you need them, the details are gone. Brio logs them when they're fresh.",
    },
    {
      heading: "Generic resumes lose to tailored ones.",
      body: "One static document can't win a product role and an engineering role. Brio lets you export versions emphasising different skills from the same underlying record.",
    },
  ];

  return (
    <section className="px-4 py-16 sm:px-5 sm:py-24">
      <div className="mx-auto max-w-[960px]">
        <h2 className="mb-10 font-serif text-[28px] font-normal tracking-[-0.03em] text-[var(--ink)] sm:mb-14 sm:text-[36px]">
          Why this matters now.
        </h2>
        <div
          ref={ref}
          className="grid gap-8 md:grid-cols-3 transition-all duration-[500ms] ease-out"
          style={{
            opacity: visible ? 1 : 0,
            transform: visible ? "translateY(0)" : "translateY(20px)",
          }}
        >
          {points.map((p) => (
            <div key={p.heading}>
              <h3 className="text-[15px] font-semibold tracking-[-0.01em] text-[var(--ink)]">
                {p.heading}
              </h3>
              <p className="mt-2 text-[14px] leading-[1.7] text-[var(--ink-2)]">{p.body}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function TrustSignals() {
  return (
    <section className="bg-[var(--surface-2)] px-4 py-16 sm:px-5 sm:py-24">
      <div className="mx-auto max-w-[960px]">
        <h2 className="text-center text-[14px] font-medium uppercase tracking-[0.06em] text-[var(--ink-3)]">
          Early users from
        </h2>
        <div className="mx-auto mt-6 grid max-w-[820px] grid-cols-2 gap-x-6 gap-y-4 text-center sm:grid-cols-3 md:flex md:items-center md:justify-between">
          {["BERKELEY", "STANFORD", "MIT", "OXFORD", "Y COMBINATOR", "NEO SCHOLARS"].map((u) => (
            <span
              key={u}
              className="text-[12px] font-medium tracking-[0.06em] text-[var(--ink-3)] sm:text-[13px]"
            >
              {u}
            </span>
          ))}
        </div>
        <div className="mt-10 grid gap-4 sm:mt-14 sm:gap-5 md:grid-cols-2">
          {[
            {
              q: "I rewrote my resume four times for four different internships. With Brio I logged everything once and exported tailored versions in minutes.",
              a: "Sarah K. — CS sophomore, UC Berkeley",
            },
            {
              q: "PAR narratives forced me to actually explain what I did, not just where I was. Hiring managers started replying.",
              a: "Marcus T. — Pre-med junior, Johns Hopkins",
            },
          ].map((t) => (
            <div
              key={t.a}
              className="rounded-md border border-[var(--surface-3)] bg-white p-5 sm:p-6"
            >
              <p className="text-[14px] italic leading-[1.6] text-[var(--ink)] sm:text-[15px]">
                "{t.q}"
              </p>
              <p className="mt-3 text-[12px] text-[var(--ink-3)] sm:text-[13px]">{t.a}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function FinalCTA() {
  const ref = useRef<HTMLElement>(null);
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(
      (entries) => entries.forEach((e) => e.isIntersecting && setVisible(true)),
      { threshold: 0.3 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  return (
    <section ref={ref} className="px-4 py-20 sm:px-5 sm:py-28">
      <div
        className="mx-auto max-w-[700px] text-center transition-all duration-[500ms] ease-out"
        style={{
          opacity: visible ? 1 : 0,
          transform: visible ? "translateY(0)" : "translateY(20px)",
        }}
      >
        <h2 className="font-serif text-[32px] font-normal tracking-[-0.03em] text-[var(--ink)] sm:text-[48px]">
          Start before you need it.
        </h2>
        <p className="mx-auto mt-4 max-w-[480px] text-[15px] leading-[1.6] text-[var(--ink-2)] sm:text-[17px]">
          The best time to log a project is right after you finish it. The second-best time is now.
        </p>
        <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
          <Link to="/signup" className="w-full sm:w-auto">
            <Button variant="warm" size="lg" className="w-full gap-2 sm:w-auto">
              Build your profile free
              <ArrowRight className="h-4 w-4" />
            </Button>
          </Link>
        </div>
        <p className="mt-3 text-[11px] text-[var(--ink-3)]">
          Free to start. No credit card required.
        </p>
      </div>
    </section>
  );
}

function FAQItem({ q, a }: { q: string; a: string }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="border-b border-[var(--surface-3)]">
      <button
        onClick={() => setOpen(!open)}
        className="flex w-full items-center justify-between py-5 text-left min-h-[44px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ink)] focus-visible:ring-offset-1 rounded-sm"
      >
        <span className="text-[15px] font-medium text-[var(--ink)]">{q}</span>
        <span className="text-[var(--ink-3)] text-[18px] leading-none">{open ? "−" : "+"}</span>
      </button>
      <div
        className="overflow-hidden transition-all duration-[250ms] ease-in-out"
        style={{ maxHeight: open ? 200 : 0 }}
      >
        <p className="pb-5 text-[15px] leading-[1.6] text-[var(--ink-2)]">{a}</p>
      </div>
    </div>
  );
}

function FAQ() {
  const items = [
    {
      q: "Is Brio only for university students?",
      a: "No. Brio is built for ambitious high-school and university students. The structure works the same way at either stage — projects, experiences, education, achievements, and evidence-backed skills.",
    },
    {
      q: "How is this different from LinkedIn?",
      a: "LinkedIn is a social network. Brio is a structured identity graph designed for output: tailored resumes, portfolios, and application snippets. We require evidence behind every claim.",
    },
    {
      q: "What is a PAR narrative?",
      a: "Problem, Action, Result. Every project asks you to describe the challenge you addressed, the specific steps you took, and the measurable outcome. It's how recruiters read your work in 30 seconds.",
    },
    {
      q: "Can I export my profile as a PDF?",
      a: "Yes. Generate a one-page resume tailored to a target role, or export a longer portfolio view. Your shareable URL always reflects your live profile.",
    },
    {
      q: "Who can see my profile?",
      a: "Your profile is private by default. You control whether it appears in search and whether your shareable link is public, link-only, or limited to specific reviewers.",
    },
    {
      q: "Is Brio free?",
      a: "Yes, Brio is free to start. Premium exports and program features are available on paid plans.",
    },
  ];
  return (
    <section id="faq" className="px-4 py-16 sm:px-5 sm:py-24">
      <div className="mx-auto max-w-[720px]">
        <h2 className="mb-6 font-serif text-[28px] font-normal tracking-[-0.03em] text-[var(--ink)] sm:mb-8 sm:text-[36px]">
          Common questions
        </h2>
        <div>
          {items.map((i) => (
            <FAQItem key={i.q} {...i} />
          ))}
        </div>
      </div>
    </section>
  );
}

function Footer() {
  return (
    <footer className="border-t border-[var(--surface-3)] bg-[var(--surface)] px-4 py-10 sm:px-5 sm:py-12">
      <div className="mx-auto grid max-w-[1100px] gap-8 sm:grid-cols-2 md:grid-cols-3">
        <div>
          <div className="font-serif text-[18px] font-semibold tracking-[-0.02em] text-[var(--ink)]">
            Brio
          </div>
          <p className="mt-2 text-[13px] text-[var(--ink-3)]">
            Professional identity, built from day one.
          </p>
          <p className="mt-6 text-[11px] text-[var(--ink-3)]">© 2025 Brio</p>
        </div>
        <div className="space-y-2">
          {["Privacy", "Terms", "Contact"].map((l) => (
            <a
              key={l}
              href="#"
              className="block text-[13px] text-[var(--ink-2)] hover:text-[var(--ink)] min-h-[44px] flex items-center transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ink)] rounded-sm"
            >
              {l}
            </a>
          ))}
        </div>
        <div>
          <Link
            to="/signup"
            className="text-[13px] font-medium text-[var(--accent-warm)] hover:text-[var(--ink)] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ink)] rounded-sm"
          >
            Build your profile free →
          </Link>
        </div>
      </div>
    </footer>
  );
}
