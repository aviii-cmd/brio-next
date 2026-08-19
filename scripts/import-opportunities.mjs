// Unified importer for all real opportunity datasets. One shared toolkit
// (SQL helpers, score/grade/cost normalization) + one small `transform()`
// adapter per source file, since the files don't share a schema. Produces
// ONE combined SQL file covering every source, safe to re-run: rows are
// matched on (title, organization) — see migration 004 for why that pair
// is used instead of application_url (real data proved one organizing
// body can legitimately run many distinct opportunities off one URL).
//
// Usage: node scripts/import-opportunities.mjs
// Output: supabase/import-opportunities.sql
//
// Run migration 004 before this file's output (adds career_impact_score
// and the (title, organization) uniqueness this relies on).
import { readFileSync, writeFileSync } from "node:fs";

const UPLOADS = "/mnt/user-data/uploads";

// ============================================================
// SHARED SQL HELPERS
// ============================================================
function sqlStr(s) {
  return "'" + String(s).replace(/'/g, "''") + "'";
}
function sqlNum(n) {
  return n == null ? "null" : String(n);
}
function sqlArr(arr) {
  return "array[" + arr.map(sqlStr).join(",") + "]::text[]";
}
function sqlJson(obj) {
  return sqlStr(JSON.stringify(obj)) + "::jsonb";
}

// ============================================================
// SHARED NORMALIZATION HELPERS
// ============================================================

// Handles the three score formats seen across files: a plain 1-10 number
// (hackathons.json, entrepreneurship, olympiads), a "X/5" string
// (science_fairs, programs — rescaled ×2), or missing entirely (robotics,
// writing_and_MUN — left null, not guessed).
function scoreToTen(raw) {
  if (raw == null) return null;
  if (typeof raw === "number") return raw;
  const m = String(raw).match(/^(\d+(?:\.\d+)?)\s*\/\s*5$/);
  if (m) return Math.round(parseFloat(m[1]) * 2);
  const n = parseFloat(raw);
  return Number.isFinite(n) ? n : null;
}
function bucketDifficulty(score) {
  if (score == null) return "Intermediate";
  if (score <= 3) return "Beginner";
  if (score <= 7) return "Intermediate";
  return "Advanced";
}
function bucketPrestige(score) {
  if (score == null) return "National";
  if (score <= 6) return "Regional";
  if (score <= 8) return "National";
  return "International";
}

// Grade-eligibility text parser — handles "Grades 9-12", "Ages 12-18",
// "High School", "Open to All", "under 18", etc. Falls back to {null,null}
// (open/unknown) rather than guessing on patterns it doesn't recognize —
// see the file header on why an unrecognized pattern must never silently
// narrow eligibility.
function ageToRank(age) {
  return Math.max(9, Math.min(17, age - 5));
}
function parseEligibilityText(text) {
  if (!text) return { min: null, max: null };
  const t = text.toLowerCase();
  if (/open to all|all ages|all students|no restriction/.test(t)) return { min: null, max: null };

  let m = t.match(/grades?\s*(\d+)\s*-\s*(\d+)/);
  if (m) return { min: Math.max(9, +m[1]), max: Math.min(12, +m[2]) };

  m = t.match(/ages?\s*(\d+)\s*-\s*(\d+)/) || t.match(/\((\d+)\s*-\s*(\d+)\)/);
  if (m) return { min: ageToRank(+m[1]), max: ageToRank(+m[2]) };

  m = t.match(/under\s*(\d+)/) || t.match(/(\d+)\s*(?:and|&)\s*(?:under|below)/);
  if (m) return { min: null, max: ageToRank(+m[1]) };

  if (/high school/.test(t)) return { min: 9, max: 12 };
  if (/undergrad|college|university/.test(t)) return { min: 13, max: 16 };
  return { min: null, max: null };
}
function ageRangeToGrade(minAge, maxAge) {
  return {
    min: minAge != null ? ageToRank(minAge) : null,
    max: maxAge != null ? ageToRank(maxAge) : null,
  };
}

// Cost text classifier — preserves the raw text separately in
// eligibility_requirements regardless of this bucketing, so specific
// figures ("$6,650, aid available") are never silently discarded.
function classifyCost(raw) {
  if (!raw) return "Free";
  const t = raw.toLowerCase().trim();
  if (t === "free" || /free \(if selected\)/.test(t)) return "Free";
  if (/\$|inr|rs\.|scaled/.test(t)) return "Paid";
  if (/nominal/.test(t)) return "Fee-required";
  if (/varies/.test(t)) return "Fee-required";
  return "Fee-required";
}

// Well-known organizing platforms — safe to map directly when they show up
// as a tag, since these are real, unambiguous, well-established entities
// (not a guess at a specific one-off host).
const PLATFORM_ORGS = {
  MLH: "Major League Hacking (MLH)",
  Devfolio: "Devfolio",
  ETHGlobal: "ETHGlobal",
  Kaggle: "Kaggle",
  HackerEarth: "HackerEarth",
  Zindi: "Zindi",
  Unstop: "Unstop",
  Microsoft: "Microsoft",
  Google: "Google",
  IBM: "IBM",
  AWS: "Amazon Web Services (AWS)",
  XPRIZE: "XPRIZE Foundation",
  DoraHacks: "DoraHacks",
  TAIKAI: "TAIKAI",
  DrivenData: "DrivenData",
  AIcrowd: "AIcrowd",
  DataCamp: "DataCamp",
  "Hack Club": "Hack Club",
  AngelHack: "AngelHack",
};
// Hand-checked (not string-guessed) pairings for well-known events where
// the host institution is confidently known from general knowledge.
// Anything not listed here and not otherwise inferable falls back to the
// event's own name — see inferOrganization below.
const KNOWN_EVENT_ORGS = {
  HackMIT: "Massachusetts Institute of Technology (MIT)",
  MHacks: "University of Michigan",
  TreeHacks: "Stanford University",
  HackIllinois: "University of Illinois Urbana-Champaign",
  HackPrinceton: "Princeton University",
  HackHarvard: "Harvard University",
  VandyHacks: "Vanderbilt University",
  HackWestern: "Western University",
  DubHacks: "University of Washington",
  BoilerMake: "Purdue University",
  HackGT: "Georgia Institute of Technology",
  "SD Hacks": "UC San Diego",
  BrickHack: "Rochester Institute of Technology (RIT)",
  HackNYU: "New York University (NYU)",
  HackRU: "Rutgers University",
  HackUMass: "University of Massachusetts Amherst",
  McHacks: "McGill University",
  "AngelHack Global Hackathon": "AngelHack",
};

function domainFrom(url) {
  if (!url) return null;
  try {
    const host = new URL(url).hostname.replace(/^www\./, "");
    return host || null;
  } catch {
    return null;
  }
}

function inferOrganization(
  item,
  { organizerField, hostedRegexOn, tags, urlField = "official_url" } = {},
) {
  if (organizerField && item[organizerField]) return item[organizerField];
  if (KNOWN_EVENT_ORGS[item.name]) return KNOWN_EVENT_ORGS[item.name];
  const text = hostedRegexOn ? item[hostedRegexOn] : item.description;
  const m = text && text.match(/(?:hosted|organized) (?:at|by) ([^.]+)/i);
  if (m) return m[1].trim();
  for (const tag of tags ?? []) {
    if (PLATFORM_ORGS[tag]) return PLATFORM_ORGS[tag];
  }
  // Last resort before duplicating the title: the real domain the source
  // data itself points to (e.g. "societyforscience.org") is strictly more
  // informative than repeating the event name, and it's mechanically
  // extracted rather than guessed.
  const domain = domainFrom(item[urlField]);
  if (domain) return domain;
  return item.name;
}

function subjectSkills(text, fallback) {
  const t = (text || "").toLowerCase();
  const table = [
    [/math/, ["Statistics", "Data Analysis"]],
    [/physics/, ["Chemistry", "Statistics"]],
    [/chemistry/, ["Chemistry"]],
    [/bio/, ["Biology"]],
    [/informatics|computer/, ["Python", "Machine Learning"]],
    [/astronomy/, ["Statistics", "Research Writing"]],
    [/econ/, ["Financial Modeling", "Statistics"]],
    [/\bai\b|artificial intelligence/, ["Python", "Machine Learning"]],
    [/environmental/, ["Environmental Science"]],
    [/engineering/, ["Robotics", "Python"]],
  ];
  for (const [re, skills] of table) if (re.test(t)) return skills;
  return fallback;
}

// Generic step templates, reused across every source (none of these files
// provide event-specific steps).
const STEPS = {
  Hackathon: [
    ["Register your team", "Create a free account and register your team."],
    ["Attend the kickoff", "Opening ceremony, theme reveal, and mentor office hours."],
    ["Build and submit", "Ship your project and record a short demo before the deadline."],
    ["Present to judges", "Live demo booth or async video judging."],
  ],
  Competition: [
    ["Register / create an account", "Sign up on the official platform linked below."],
    [
      "Review the rules and requirements",
      "Read the scoring rubric or eligibility details carefully.",
    ],
    ["Prepare and submit your entry", "Follow the required submission format exactly."],
    ["Track results / next rounds", "Many of these run in stages — check for qualifying rounds."],
  ],
  "Research Program": [
    [
      "Prepare your application materials",
      "Transcripts, a statement of interest, and often a recommendation.",
    ],
    [
      "Submit before the window closes",
      "These typically have a specific annual application window — check the official page.",
    ],
    ["Interview (if selected)", "Many selective programs include a short interview stage."],
  ],
  Course: [
    ["Check the enrollment window", "Many of these run on a fixed annual/seasonal schedule."],
    ["Submit your application", "Follow the official page's requirements."],
    ["Confirm your spot", "Complete any onboarding or pre-work once accepted."],
  ],
};

function makeRow({
  title,
  organization,
  category,
  originalCategoryTag,
  description,
  difficultyScore,
  prestigeScore,
  careerImpactScore,
  costType,
  locationType,
  country,
  careerTrack,
  grade,
  extraEligibility = [],
  requiredSkills,
  tags,
  applicationUrl,
  source,
  timeCommitment,
  duration,
}) {
  const allTags = Array.from(new Set([...(tags ?? []), originalCategoryTag].filter(Boolean)));
  const eligibility = [
    {
      label: "Eligible grades/ages",
      value: grade.label ?? "See official page for exact eligibility",
    },
    {
      label: "Location",
      value: country ? `Open to participants in ${country}` : "Open internationally",
    },
    ...extraEligibility,
  ];
  const stepTemplate = STEPS[category] ?? STEPS.Competition;
  const kind =
    category === "Hackathon"
      ? "hackathon"
      : category === "Research Program"
        ? "research program"
        : category === "Course"
          ? "program"
          : "competition";
  const prestigeWord =
    prestigeScore >= 9
      ? "one of the most recognized"
      : prestigeScore >= 7
        ? "a well-recognized"
        : "a solid, credible";
  const whyItMatters = `This is ${prestigeWord} ${kind} in its space — a concrete, third-party-verifiable credential for your applications, not just a self-reported interest.`;

  return `(
    ${sqlStr(title)}, ${sqlStr(organization)}, ${sqlStr(category)},
    ${sqlStr(description.slice(0, 200))}, ${sqlStr(description)}, ${sqlStr(whyItMatters)},
    ${sqlStr(bucketDifficulty(difficultyScore))}, ${sqlStr(bucketPrestige(prestigeScore))}, ${sqlNum(careerImpactScore)},
    ${sqlStr(costType)}, ${sqlStr(timeCommitment)},
    ${sqlStr(duration)}, ${sqlStr(locationType)},
    ${country ? sqlStr(country) : "null"}, null,
    ${sqlStr(careerTrack)},
    ${sqlNum(grade.min)}, ${sqlNum(grade.max)},
    ${sqlJson(eligibility)},
    ${sqlJson(stepTemplate.map(([t, d]) => ({ title: t, description: d })))},
    ${sqlJson(applicationUrl ? [{ title: "Official event page", url: applicationUrl, type: "guide" }] : [])},
    ${sqlArr(requiredSkills)}, ${sqlArr(allTags)},
    ${applicationUrl ? sqlStr(applicationUrl) : "null"},
    null, true,
    0, 0, true, ${sqlStr(source)}
  )`;
}

// ============================================================
// PER-FILE ADAPTERS
// ============================================================
const sources = [
  {
    file: "hackathons.json",
    label: "Hackathons",
    transform(item) {
      const category =
        item.category === "Student Hackathon" || item.category === "High School Hackathon"
          ? "Hackathon"
          : "Competition";
      const grade =
        item.category === "High School Hackathon" || item.tags.includes("High School")
          ? { min: 9, max: 12, label: "Grades 9-12" }
          : item.tags.includes("University") || item.tags.includes("Student")
            ? { min: 13, max: 16, label: "Undergraduate" }
            : { min: null, max: null, label: null };
      const locationType =
        item.mode === "Online" ? "Remote" : item.mode === "In-Person" ? "Onsite" : "Hybrid";
      const country =
        !item.country || /worldwide/i.test(item.country) ? null : item.country.split("/")[0].trim();
      return makeRow({
        title: item.name,
        organization: inferOrganization(item, { tags: item.tags }),
        category,
        originalCategoryTag: null,
        description: item.description,
        difficultyScore: scoreToTen(item.difficulty_score),
        prestigeScore: scoreToTen(item.prestige_score),
        careerImpactScore: scoreToTen(item.career_impact_score),
        costType: "Free",
        locationType,
        country,
        careerTrack: category === "Hackathon" ? "Engineer" : "Researcher",
        grade,
        extraEligibility: [{ label: "Team size", value: `${item.team_size} member(s)` }],
        requiredSkills: subjectSkills(item.tags.join(" "), [
          "Python",
          "JavaScript",
          "Public Speaking",
        ]),
        tags: item.tags,
        applicationUrl: item.official_url,
        source: "import:hackathons.json",
        timeCommitment: category === "Hackathon" ? "One weekend" : "2-6 weeks",
        duration: category === "Hackathon" ? "24-48 hours" : "2-6 weeks",
      });
    },
  },
  {
    file: "robotics.json",
    label: "Robotics",
    transform(item) {
      const grade = parseEligibilityText(item.eligibility);
      return makeRow({
        title: item.name,
        organization: inferOrganization(item, { organizerField: "source" }),
        category: "Competition",
        originalCategoryTag: item.category,
        description: item.description,
        difficultyScore: null,
        prestigeScore: null,
        careerImpactScore: null,
        costType: "Fee-required",
        locationType: "Onsite",
        country: null,
        careerTrack: "Engineer",
        grade: { ...grade, label: item.eligibility },
        requiredSkills: ["Robotics", "Arduino", "Python"],
        tags: [item.category],
        applicationUrl: null,
        source: "import:robotics.json",
        timeCommitment: "Several weeks of build time",
        duration: "Varies by season",
      });
    },
  },
  {
    file: "science_fairs.json",
    label: "Science Fairs",
    transform(item) {
      const grade = parseEligibilityText(item.recommended_for);
      const modeText = (item.mode || "").toLowerCase();
      const locationType = modeText.includes("submission")
        ? "Remote"
        : modeText.includes("/")
          ? "Hybrid"
          : "Onsite";
      const country = !item.country || /global/i.test(item.country) ? null : item.country;
      return makeRow({
        title: item.name,
        organization: inferOrganization(item),
        category: "Competition",
        originalCategoryTag: item.category,
        description: item.description,
        difficultyScore: scoreToTen(item.difficulty_score),
        prestigeScore: scoreToTen(item.prestige_score),
        careerImpactScore: scoreToTen(item.career_impact_score),
        costType: classifyCost(item.cost),
        locationType,
        country,
        careerTrack: "Researcher",
        grade: { ...grade, label: item.recommended_for || null },
        extraEligibility: [
          { label: "Cost", value: item.cost },
          { label: "Typical application window", value: item.application_period },
        ],
        requiredSkills: subjectSkills(item.category, ["Research Writing", "Data Analysis"]),
        tags: [item.category],
        applicationUrl: item.official_url,
        source: "import:science_fairs.json",
        timeCommitment: "Multi-month research project",
        duration: "Varies — see official page",
      });
    },
  },
  {
    file: "writing_and_MUN.json",
    label: "Writing & MUN",
    transform(item) {
      const grade = parseEligibilityText(item.eligibility);
      const isLiveFormat = /mun|debate|public speaking/i.test(item.category);
      const country =
        /india/i.test(item.focus) && !/international/i.test(item.focus) ? "India" : null;
      return makeRow({
        title: item.name,
        organization: inferOrganization(item, { organizerField: "organizer", urlField: "link" }),
        category: "Competition",
        originalCategoryTag: item.category,
        description: `${item.category} — ${item.focus}. ${item.eligibility}.`,
        difficultyScore: null,
        prestigeScore: null,
        careerImpactScore: null,
        costType: "Fee-required",
        locationType: isLiveFormat ? "Onsite" : "Remote",
        country,
        careerTrack: isLiveFormat ? "Advocate" : "Creative",
        grade: { ...grade, label: item.eligibility },
        extraEligibility: [{ label: "Typical timing", value: item.date }],
        requiredSkills: isLiveFormat
          ? ["Public Speaking", "Debate", "Research Writing"]
          : ["Creative Writing", "Research Writing"],
        tags: [item.category, item.focus],
        applicationUrl: item.link,
        source: "import:writing_and_MUN.json",
        timeCommitment: isLiveFormat ? "One weekend conference" : "A few hours to draft and submit",
        duration: isLiveFormat ? "2-3 days" : "N/A — submission-based",
      });
    },
  },
  {
    file: "programs.json",
    label: "Programs",
    transform(item) {
      const grade = parseEligibilityText(item.recommended_for);
      const modeText = (item.mode || "").toLowerCase();
      const locationType =
        modeText.includes("online") && modeText.includes("in-person")
          ? "Hybrid"
          : modeText.includes("online")
            ? "Remote"
            : modeText === "hybrid"
              ? "Hybrid"
              : "Onsite";
      const category = /research/i.test(item.category) ? "Research Program" : "Course";
      const country = !item.country || /global/i.test(item.country) ? null : item.country;
      return makeRow({
        title: item.name,
        organization: inferOrganization(item),
        category,
        originalCategoryTag: item.category,
        description: item.description,
        difficultyScore: scoreToTen(item.difficulty_score),
        prestigeScore: scoreToTen(item.prestige_score),
        careerImpactScore: scoreToTen(item.career_impact_score),
        costType: classifyCost(item.cost),
        locationType,
        country,
        careerTrack: "Researcher",
        grade: { ...grade, label: item.recommended_for || null },
        extraEligibility: [
          { label: "Cost", value: item.cost },
          { label: "Typical application window", value: item.application_period },
        ],
        requiredSkills: subjectSkills(item.category + " " + item.description, [
          "Research Writing",
          "Statistics",
        ]),
        tags: [item.category],
        applicationUrl: item.official_url,
        source: "import:programs.json",
        timeCommitment: "Full-time for the program duration",
        duration: "Varies — see official page",
      });
    },
  },
  {
    file: "entrepreneurship_opportunities.json",
    label: "Entrepreneurship",
    transform(item) {
      const isGlobal = /^global|^international|^worldwide/i.test(item.country || "");
      const country = isGlobal ? null : (item.country || "").split("(")[0].trim() || null;
      return makeRow({
        title: item.name,
        organization: inferOrganization(item),
        category: "Competition",
        originalCategoryTag: null,
        description: item.description,
        difficultyScore: scoreToTen(item.difficulty_score),
        prestigeScore: scoreToTen(item.prestige_score),
        careerImpactScore: scoreToTen(item.career_impact_score),
        costType: "Free",
        locationType: "Remote",
        country,
        careerTrack: "Founder",
        grade: { min: 9, max: 16, label: "High school through undergraduate" },
        extraEligibility: [{ label: "Team size", value: `${item.team_size} member(s)` }],
        requiredSkills: ["Financial Modeling", "Public Speaking", "Leadership"],
        tags: ["Business"],
        applicationUrl: item.official_url,
        source: "import:entrepreneurship_opportunities.json",
        timeCommitment: "Several weeks (pitch decks / business plans)",
        duration: "Varies — see official page",
      });
    },
  },
  {
    file: "olympiads_db.json",
    label: "Olympiads",
    transform(item) {
      const grade = ageRangeToGrade(item.min_age, item.max_age);
      const country = !item.country || /international/i.test(item.country) ? null : item.country;
      return makeRow({
        title: item.name,
        organization: inferOrganization(item),
        category: "Competition",
        originalCategoryTag: item.category,
        description: item.description,
        difficultyScore: scoreToTen(item.difficulty_score),
        prestigeScore: scoreToTen(item.prestige_score),
        careerImpactScore: null,
        costType: "Free",
        locationType: "Hybrid",
        country,
        careerTrack: "Researcher",
        grade: { ...grade, label: `Ages ${item.min_age}-${item.max_age}` },
        requiredSkills: subjectSkills(item.category, ["Research Writing", "Statistics"]),
        tags: item.tags,
        applicationUrl: item.official_url,
        source: "import:olympiads_db.json",
        timeCommitment: "Qualifying rounds over several months",
        duration: "Multi-stage — qualifiers through international final",
      });
    },
  },
];

// ============================================================
// RUN
// ============================================================
let sqlSections = [];
let grandTotal = 0;
const report = [];

for (const src of sources) {
  const items = JSON.parse(readFileSync(`${UPLOADS}/${src.file}`, "utf8"));
  const rows = items.map((item) => src.transform(item));
  grandTotal += rows.length;
  report.push(`${src.label} (${src.file}): ${rows.length} rows`);

  sqlSections.push(`-- ---- ${src.label} (${src.file}, ${rows.length} rows) ----
insert into public.opportunities (
  title, organization, category,
  summary, description, why_it_matters,
  difficulty, prestige_level, career_impact_score,
  cost_type, time_commitment,
  duration, location_type,
  country, city,
  career_track,
  eligibility_grade_min, eligibility_grade_max,
  eligibility_requirements,
  application_steps,
  preparation_resources,
  required_skills, tags,
  application_url,
  application_deadline, rolling_deadline,
  saves_count, views_count, is_active, source
) values
${rows.join(",\n")}
on conflict (title, organization) do update set
  category = excluded.category,
  summary = excluded.summary,
  description = excluded.description,
  why_it_matters = excluded.why_it_matters,
  difficulty = excluded.difficulty,
  prestige_level = excluded.prestige_level,
  career_impact_score = excluded.career_impact_score,
  cost_type = excluded.cost_type,
  location_type = excluded.location_type,
  country = excluded.country,
  career_track = excluded.career_track,
  eligibility_grade_min = excluded.eligibility_grade_min,
  eligibility_grade_max = excluded.eligibility_grade_max,
  eligibility_requirements = excluded.eligibility_requirements,
  required_skills = excluded.required_skills,
  tags = excluded.tags,
  source = excluded.source;
`);
}

const header = `-- ============================================================
-- Brio — Stage 3 Discover: real opportunity data import (all sources)
-- Generated by scripts/import-opportunities.mjs. ${grandTotal} total rows
-- across ${sources.length} source files. Safe to re-run — rows are
-- matched on (title, organization) (unique index from migration 004).
-- A few real opportunities appear in more than one source file (e.g. a
-- national competition listed both on its own and inside a broader
-- "programs" dataset); where that happens with matching organization
-- text they merge into one row instead of duplicating.
--
-- Run migration 004 (adds career_impact_score + the (title, organization)
-- uniqueness) BEFORE this file.
-- ============================================================

`;

writeFileSync("supabase/import-opportunities.sql", header + sqlSections.join("\n"));
console.log(report.join("\n"));
console.log(`\nTotal: ${grandTotal} rows -> supabase/import-opportunities.sql`);
