// One-off generator: produces supabase/seed.sql for local/dev/staging.
// Not part of the app runtime — run manually, review output, then commit
// the generated seed.sql. See SETUP_STAGE3.md for how it's loaded.
import { writeFileSync } from "node:fs";

function rand(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}
function randInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}
function pickN(arr, n) {
  const copy = [...arr];
  const out = [];
  n = Math.min(n, copy.length);
  for (let i = 0; i < n; i++) out.push(copy.splice(randInt(0, copy.length - 1), 1)[0]);
  return out;
}
function sqlStr(s) {
  return "'" + String(s).replace(/'/g, "''") + "'";
}
function sqlArr(arr) {
  return "array[" + arr.map(sqlStr).join(",") + "]::text[]";
}
function slugify(s) {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

const ORGS = [
  "Aurora Climate Foundation",
  "Meridian Robotics Alliance",
  "Blackwell Innovation Labs",
  "Lumen Health Initiative",
  "Vantage Policy Institute",
  "Nimbus AI Collective",
  "Everston Arts Council",
  "Kestrel Space Society",
  "Harborview Ventures",
  "Sable & Finch Studio",
  "Northlight University",
  "Cobalt Data Guild",
  "Riverstone Youth Trust",
  "Argent Biotech Consortium",
  "Fieldnote Journalism Lab",
  "Circuit & Sage Makerspace",
  "Beacon Leadership Network",
  "Tidewater Marine Institute",
  "Grayline Analytics",
  "Wren Foundation for the Arts",
  "Solstice Energy Trust",
  "Ashgrove Enterprise Council",
  "Pinecrest Global Academy",
  "Ironbridge FinTech Guild",
  "Coral & Compass Ocean Project",
];

// domain -> { tags, skills }
const DOMAINS = {
  "Artificial Intelligence": {
    tags: ["AI"],
    skills: ["Python", "Machine Learning", "Statistics", "Data Analysis"],
  },
  "Climate Action": {
    tags: ["Climate"],
    skills: ["Environmental Science", "Data Analysis", "Research Writing", "Community Organizing"],
  },
  Robotics: { tags: ["Robotics"], skills: ["Robotics", "Arduino", "Python", "Machine Learning"] },
  "Public Health": {
    tags: ["Healthcare"],
    skills: ["Biology", "Research Writing", "Data Analysis", "Community Organizing"],
  },
  "Social Impact": {
    tags: ["Social Impact"],
    skills: ["Community Organizing", "Public Speaking", "Leadership", "Creative Writing"],
  },
  Entrepreneurship: {
    tags: ["Business"],
    skills: ["Financial Modeling", "Public Speaking", "Leadership", "Data Analysis"],
  },
  "Space Science": {
    tags: ["Space"],
    skills: ["Statistics", "Python", "Research Writing", "Chemistry"],
  },
  Biotechnology: {
    tags: ["Biotech"],
    skills: ["Biology", "Chemistry", "Research Writing", "Data Analysis"],
  },
  "Financial Technology": {
    tags: ["FinTech"],
    skills: ["Financial Modeling", "Python", "Data Analysis", "Statistics"],
  },
  "Public Policy": {
    tags: ["Policy"],
    skills: ["Research Writing", "Public Speaking", "Debate", "Community Organizing"],
  },
  "Design & Arts": {
    tags: ["Arts"],
    skills: ["Graphic Design", "UI/UX Design", "Video Editing", "Creative Writing"],
  },
  "Journalism & Media": {
    tags: ["Journalism"],
    skills: ["Creative Writing", "Video Editing", "Public Speaking", "Research Writing"],
  },
  "Game Development": {
    tags: ["Gaming"],
    skills: ["Python", "UI/UX Design", "Graphic Design", "Machine Learning"],
  },
  "Sports Science": {
    tags: ["Sports Science"],
    skills: ["Data Analysis", "Statistics", "Biology", "Public Speaking"],
  },
  "Education Access": {
    tags: ["Education"],
    skills: ["Community Organizing", "Public Speaking", "Leadership", "Creative Writing"],
  },
};
const DOMAIN_NAMES = Object.keys(DOMAINS);

const COUNTRIES = [
  null,
  null,
  null,
  "India",
  "India",
  "United States",
  "United Kingdom",
  "Canada",
  "Singapore",
  "United Arab Emirates",
  null,
];

const CATEGORY_CONFIG = {
  Competition: {
    titleTpl: (org, d) => `${org} ${d} Challenge`,
    steps: [
      ["Register your team", "Create a free account and register your team of up to 4 members."],
      [
        "Submit a proposal abstract",
        "Outline your idea, approach, and expected impact in under 500 words.",
      ],
      [
        "Prepare your final submission",
        "Build your prototype/solution and prepare a short demo video.",
      ],
      ["Attend the judging round", "Present live (or async video) to a panel of industry judges."],
    ],
    resources: [
      ["Past winning submissions", "showcase"],
      ["Getting-started guide", "guide"],
    ],
  },
  Internship: {
    titleTpl: (org, d) => `${org} Summer ${d} Internship`,
    steps: [
      [
        "Submit resume and cover letter",
        "Tailor your resume to highlight relevant coursework and projects.",
      ],
      ["Complete the online assessment", "A short technical/aptitude screening (60–90 minutes)."],
      ["Attend the interview round", "1–2 rounds with the team you'd be joining."],
      ["Accept your offer", "Confirm your start date and complete onboarding paperwork."],
    ],
    resources: [
      ["Interview preparation guide", "guide"],
      ["Team AMA recording", "other"],
    ],
  },
  Fellowship: {
    titleTpl: (org, d) => `${org} ${d} Fellows Program`,
    steps: [
      [
        "Submit your application essay",
        "Explain why this fellowship matters to your goals (750 words).",
      ],
      ["Request two references", "Ask a teacher or mentor to submit a short recommendation."],
      ["Complete the panel interview", "A conversational interview with two current fellows."],
    ],
    resources: [
      ["Fellow spotlight stories", "showcase"],
      ["Application FAQ", "guide"],
    ],
  },
  Scholarship: {
    titleTpl: (org, d) => `${org} ${d} Scholarship`,
    steps: [
      [
        "Complete the eligibility form",
        "Confirm your academic standing and financial need (if applicable).",
      ],
      ["Submit transcripts", "Upload an unofficial transcript or report card."],
      [
        "Write your personal statement",
        "500–800 words on your goals and how this scholarship helps.",
      ],
    ],
    resources: [["Personal statement tips", "guide"]],
  },
  "Research Program": {
    titleTpl: (org, d) => `${org} Summer Research Program in ${d}`,
    steps: [
      ["Submit a statement of interest", "Describe a research question you'd like to explore."],
      [
        "Share relevant coursework/projects",
        "Attach any prior lab, project, or coursework evidence.",
      ],
      ["Interview with a faculty mentor", "A 30-minute conversation about fit and availability."],
      ["Confirm placement", "Get matched to a research group for the program dates."],
    ],
    resources: [
      ["Sample research posters", "showcase"],
      ["Intro to research methods (MOOC)", "mooc"],
    ],
  },
  Hackathon: {
    titleTpl: (org, d) => `${org} ${d} Hackathon`,
    steps: [
      ["Register solo or with a team", "Teams of up to 5; solo hackers get matched at kickoff."],
      ["Attend the kickoff", "Opening ceremony, theme reveal, and mentor office hours."],
      ["Build and submit", "Ship your project and record a 2-minute demo before the deadline."],
      ["Present to judges", "Live demo booth or async video judging."],
    ],
    resources: [
      ["Starter kit and APIs", "guide"],
      ["Previous winning projects", "showcase"],
    ],
  },
  Volunteering: {
    titleTpl: (org, d) => `${org} ${d} Volunteer Corps`,
    steps: [
      ["Complete the volunteer form", "Share your availability and areas of interest."],
      ["Attend orientation", "A short virtual or in-person onboarding session."],
      ["Complete your first shift", "Log your hours through the volunteer portal."],
    ],
    resources: [["Volunteer handbook", "guide"]],
  },
  Course: {
    titleTpl: (org, d) => `${org} ${d} Certificate Course`,
    steps: [
      ["Enroll in the course", "Reserve your seat — cohorts are capped for quality."],
      ["Complete weekly modules", "Self-paced lessons with weekly checkpoints."],
      ["Submit the capstone project", "Apply what you learned to a project of your choice."],
    ],
    resources: [["Syllabus and sample lessons", "guide"]],
  },
  Grant: {
    titleTpl: (org, d) => `${org} Young Innovators Grant — ${d}`,
    steps: [
      ["Submit a project proposal", "1–2 pages describing your project and budget."],
      ["Provide a budget breakdown", "Itemize how grant funds would be used."],
      ["Interview with the grant committee", "A short conversation about feasibility and impact."],
    ],
    resources: [
      ["Funded project examples", "showcase"],
      ["Budget template", "guide"],
    ],
  },
  Mentorship: {
    titleTpl: (org, d) => `${org} ${d} Mentorship Circle`,
    steps: [
      ["Complete your mentee profile", "Share your goals so we can match you with a mentor."],
      ["Attend the matching call", "A short intro call to confirm mentor/mentee fit."],
      ["Kick off monthly sessions", "Meet with your mentor monthly for the program duration."],
    ],
    resources: [["Mentee starter guide", "guide"]],
  },
};
const CATEGORIES = Object.keys(CATEGORY_CONFIG);

const CAREER_TRACKS = [
  "Founder",
  "Researcher",
  "Engineer",
  "Creative",
  "Analyst",
  "Leader",
  "Advocate",
];
const DIFFICULTIES = ["Beginner", "Intermediate", "Advanced"];
const COST_TYPES = ["Free", "Free", "Stipend", "Paid", "Fee-required"];
const LOCATION_TYPES = ["Remote", "Remote", "Onsite", "Hybrid"];

function whyItMatters(category, domain) {
  const map = {
    Competition: `Placing well here is a concrete, third-party-validated signal of skill in ${domain.toLowerCase()} — the kind of proof that stands out on a college application or resume, not just a self-reported claim.`,
    Internship: `Real-world ${domain.toLowerCase()} experience early gives you evidence (not just interest) to point to when you apply for more competitive roles later, and often opens the door to a referral.`,
    Fellowship: `Fellowships combine mentorship, a like-minded peer cohort, and a credential — the network you build here tends to matter as much as the program itself.`,
    Scholarship: `Beyond the funding, being selected is an external validation of your potential that you can cite in future applications.`,
    "Research Program": `Hands-on research experience — even a small contribution — is one of the strongest signals for competitive university programs in ${domain.toLowerCase()}.`,
    Hackathon: `A great way to go from "interested in ${domain.toLowerCase()}" to "shipped something in ${domain.toLowerCase()}" in a single weekend, with a working project you can show.`,
    Volunteering: `Sustained volunteering shows genuine commitment (not a one-off), and often becomes the anchor story in your applications.`,
    Course: `A structured, credentialed way to go from curious to competent in ${domain.toLowerCase()} — useful both for the skill itself and as a credential.`,
    Grant: `Funding removes the biggest blocker to actually building your ${domain.toLowerCase()} idea instead of just planning it.`,
    Mentorship: `Direct access to someone a few steps ahead of you in ${domain.toLowerCase()} can compress years of trial-and-error into months.`,
  };
  return (
    map[category] ??
    `A strong way to build real evidence of your interest and ability in ${domain.toLowerCase()}.`
  );
}

function description(category, domain, org) {
  return `${org} runs this ${category.toLowerCase()} for students exploring ${domain.toLowerCase()}. It's designed to be approachable for a first-timer while still being a meaningful credential — you'll work through a structured set of milestones, get feedback along the way, and finish with something concrete to show for it.`;
}

function eligibilityRequirements({ gradeLabel, country, gpa }) {
  const reqs = [];
  reqs.push({ label: "Eligible grade/year", value: gradeLabel });
  if (country) reqs.push({ label: "Location", value: `Open to students in ${country}` });
  else reqs.push({ label: "Location", value: "Open internationally" });
  if (gpa) reqs.push({ label: "Minimum GPA", value: gpa });
  return reqs;
}

const GRADE_LABELS = {
  "9-12": "Grades 9–12 (any high school year)",
  "11-12": "Grades 11–12",
  "13-16": "Undergraduate (any year)",
  "13-14": "Undergraduate, first or second year",
  any: "Open to all students",
};

function gradeRange() {
  const r = Math.random();
  if (r < 0.4) return { min: null, max: null, label: GRADE_LABELS["any"] };
  if (r < 0.62) return { min: 9, max: 12, label: GRADE_LABELS["9-12"] };
  if (r < 0.72) return { min: 11, max: 12, label: GRADE_LABELS["11-12"] };
  if (r < 0.9) return { min: 13, max: 16, label: GRADE_LABELS["13-16"] };
  return { min: 13, max: 14, label: GRADE_LABELS["13-14"] };
}

function deadlineExpr() {
  const r = Math.random();
  if (r < 0.13) return { rolling: true, expr: "null" };
  let days;
  const d = Math.random();
  if (d < 0.3)
    days = randInt(1, 13); // closing soon
  else if (d < 0.55) days = randInt(14, 30);
  else if (d < 0.85) days = randInt(31, 120);
  else days = randInt(121, 270);
  return { rolling: false, expr: `now() + interval '${days} days'` };
}

const rows = [];
const items = []; // { idx, category, domainKey, difficulty, deadlineDays, slug, title }

const TOTAL = 92;

// Stratified domain sequence: shuffle each full pass through DOMAIN_NAMES so
// every domain gets a near-even share of listings (pure per-row randomness
// can otherwise skip a domain entirely by chance, leaving a themed collection
// empty) while keeping the order unpredictable.
function shuffled(arr) {
  const copy = [...arr];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}
const domainSequence = [];
while (domainSequence.length < TOTAL) domainSequence.push(...shuffled(DOMAIN_NAMES));

for (let i = 0; i < TOTAL; i++) {
  const category = CATEGORIES[i % CATEGORIES.length];
  const cfg = CATEGORY_CONFIG[category];
  const org = rand(ORGS);
  const domainKey = domainSequence[i];
  const domainInfo = DOMAINS[domainKey];
  const title = cfg.titleTpl(org, domainKey);
  const difficulty = rand(DIFFICULTIES);
  const prestige = rand([
    "School",
    "Regional",
    "Regional",
    "National",
    "National",
    "International",
  ]);
  const cost = rand(COST_TYPES);
  const locType = rand(LOCATION_TYPES);
  const country = locType === "Remote" && Math.random() < 0.5 ? null : rand(COUNTRIES);
  const careerTrack = Math.random() < 0.75 ? rand(CAREER_TRACKS) : null;
  const grade = gradeRange();
  const gpa =
    Math.random() < 0.3 ? rand(["3.0 / 4.0", "3.3 / 4.0", "3.5 / 4.0", "80% aggregate"]) : null;
  const skills = pickN(domainInfo.skills, randInt(2, 4));
  const secondaryTag =
    Math.random() < 0.25 ? rand(DOMAIN_NAMES.filter((d) => d !== domainKey)) : null;
  const tags = secondaryTag
    ? [...domainInfo.tags, ...DOMAINS[secondaryTag].tags]
    : [...domainInfo.tags];
  const dl = deadlineExpr();
  const slug = slugify(`${title}-${i}`);
  const timeCommitment = rand([
    "2-3 hrs/week for 4 weeks",
    "5-10 hrs/week for 6 weeks",
    "One weekend",
    "10 hrs/week for a summer",
    "1-2 hrs/week, ongoing",
    "Full-time for 8 weeks",
  ]);
  const duration = rand([
    "4 weeks",
    "6 weeks",
    "8 weeks",
    "1 day",
    "1 weekend",
    "10 weeks",
    "3 months",
    "Ongoing",
  ]);

  const eligibility = eligibilityRequirements({ gradeLabel: grade.label, country, gpa });
  const steps = cfg.steps;
  const resources = cfg.resources.map(([title2, type]) => ({
    title: title2,
    type,
    url: `https://www.example.org/prep/${slug}`,
  }));

  const summary = `${category} in ${domainKey.toLowerCase()} — ${grade.label.toLowerCase()}.`;

  rows.push(`(
    ${sqlStr(title)}, ${sqlStr(org)}, ${sqlStr(category)},
    ${sqlStr(summary)}, ${sqlStr(description(category, domainKey, org))}, ${sqlStr(whyItMatters(category, domainKey))},
    ${sqlStr(difficulty)}, ${sqlStr(prestige)}, ${sqlStr(cost)},
    ${sqlStr(timeCommitment)}, ${sqlStr(duration)}, ${sqlStr(locType)},
    ${country ? sqlStr(country) : "null"}, null,
    ${careerTrack ? sqlStr(careerTrack) : "null"},
    ${grade.min ?? "null"}, ${grade.max ?? "null"},
    ${sqlStr(JSON.stringify(eligibility))}::jsonb,
    ${sqlStr(JSON.stringify(steps.map(([t, d]) => ({ title: t, description: d }))))}::jsonb,
    ${sqlStr(JSON.stringify(resources))}::jsonb,
    ${sqlArr(skills)}, ${sqlArr(tags)},
    ${sqlStr(`https://www.example.org/apply/${slug}`)},
    ${dl.expr}, ${dl.rolling},
    0, 0, true, 'seed'
  )`);

  items.push({
    i,
    title,
    category,
    domainKey,
    difficulty,
    prestige,
    cost,
    rolling: dl.rolling,
    deadlineDays: dl.expr,
    gradeMin: grade.min,
    gradeMax: grade.max,
    slug,
  });
}

const insertOpportunities = `-- Auto-generated by gen_seed.mjs. Review before use in any real environment.
insert into public.opportunities (
  title, organization, category,
  summary, description, why_it_matters,
  difficulty, prestige_level, cost_type,
  time_commitment, duration, location_type,
  country, city,
  career_track,
  eligibility_grade_min, eligibility_grade_max,
  eligibility_requirements, application_steps, preparation_resources,
  required_skills, tags,
  application_url,
  application_deadline, rolling_deadline,
  saves_count, views_count, is_active, source
) values
${rows.join(",\n")}
;
`;

// ---- Collections ----
function byPredicate(pred, limit) {
  return items
    .filter(pred)
    .slice(0, limit)
    .map((it) => it.slug);
}

const collectionDefs = [
  {
    slug: "beginner-ai",
    title: "Beginner AI Competitions",
    description: "Low-pressure ways to try applied AI for the first time.",
    icon: "Sparkles",
    slugs: byPredicate(
      (it) => it.domainKey === "Artificial Intelligence" && it.difficulty === "Beginner",
      8,
    ),
  },
  {
    slug: "climate-starters",
    title: "Climate Action Starters",
    description: "Entry points into climate and sustainability work — no experience required.",
    icon: "Leaf",
    slugs: byPredicate((it) => it.domainKey === "Climate Action", 8),
  },
  {
    slug: "free-global-hackathons",
    title: "Free Global Hackathons",
    description: "Remote, free-to-enter hackathons open to students anywhere.",
    icon: "Rocket",
    slugs: byPredicate((it) => it.category === "Hackathon" && it.cost === "Free", 8),
  },
  {
    slug: "research-for-first-timers",
    title: "Research, for First-Timers",
    description: "Structured research programs designed for students with no prior lab experience.",
    icon: "FlaskConical",
    slugs: byPredicate(
      (it) => it.category === "Research Program" && it.difficulty !== "Advanced",
      8,
    ),
  },
  {
    slug: "stretch-international",
    title: "Stretch: International-Level Programs",
    description: "Highly selective, high-prestige programs for students ready to aim high.",
    icon: "Trophy",
    slugs: byPredicate((it) => it.prestige === "International", 8),
  },
  {
    slug: "fully-funded",
    title: "Fully Funded Opportunities",
    description: "Stipend or fully-funded programs — cost should never be the blocker.",
    icon: "Wallet",
    slugs: byPredicate((it) => it.cost === "Stipend", 8),
  },
];

let collectionSql =
  '-- Thematic collections ("playlists") referenced by slug back to the rows inserted above.\n';
collectionSql +=
  "insert into public.opportunity_collections (slug, title, description, icon, sort_order) values\n";
collectionSql += collectionDefs
  .map(
    (c, idx) =>
      `  (${sqlStr(c.slug)}, ${sqlStr(c.title)}, ${sqlStr(c.description)}, ${sqlStr(c.icon)}, ${idx})`,
  )
  .join(",\n");
collectionSql += "\non conflict (slug) do nothing;\n\n";

collectionSql += `insert into public.opportunity_collection_items (collection_id, opportunity_id, sort_order)
select c.id, o.id, x.ord
from (values\n`;
const valueRows = [];
for (const c of collectionDefs) {
  c.slugs.forEach((slug, ord) => {
    valueRows.push(`  (${sqlStr(c.slug)}, ${sqlStr(slug)}, ${ord})`);
  });
}
collectionSql += valueRows.join(",\n");
collectionSql += `
) as x(collection_slug, opportunity_slug, ord)
join public.opportunity_collections c on c.slug = x.collection_slug
join public.opportunities o on o.application_url = 'https://www.example.org/apply/' || x.opportunity_slug
on conflict (collection_id, opportunity_id) do nothing;
`;

const header = `-- ============================================================
-- Brio — Stage 3 Discover: DEMO SEED DATA
-- ============================================================
-- This file is NOT a migration — it is optional starter content for
-- local development, staging, and demos so Discover has something
-- real to search/recommend/track against immediately.
--
-- All organizations below are fictional (deliberately, to avoid
-- misattributing real deadlines/eligibility to real institutions).
-- Links use example.org, the domain IANA reserves for exactly this
-- purpose (RFC 2606) — they intentionally do not resolve anywhere.
-- Deadlines are generated relative to now() so "Closing Soon" always
-- has something to show right after this file is run.
--
-- In production, replace this with your real catalog: bulk-load via
-- CSV import into public.opportunities, or build an admin ingestion
-- pipeline (see SETUP_STAGE3.md). Do not run this file against a
-- production database that already has real opportunities you don't
-- want mixed with demo rows.
-- ============================================================

`;

writeFileSync("supabase/seed.sql", header + insertOpportunities + "\n" + collectionSql);
console.log(
  `Generated ${TOTAL} opportunities and ${collectionDefs.length} collections -> supabase/seed.sql`,
);
