import type { ProjectTaskPriority } from "@/types/database";

export type ProjectTemplateBlueprint = {
  label: string;
  description: string;
  milestones: string[];
  tasks: { title: string; priority: ProjectTaskPriority }[];
};

export const PROJECT_TEMPLATE_BLUEPRINTS: Record<string, ProjectTemplateBlueprint> = {
  blank: {
    label: "Blank project",
    description: "Start with a clean workspace and add your own steps.",
    milestones: [],
    tasks: [],
  },
  hackathon: {
    label: "Hackathon",
    description: "Move from prompt to prototype, demo, and reflection.",
    milestones: [
      "Understand the prompt",
      "Choose the solution",
      "Build the prototype",
      "Demo and reflect",
    ],
    tasks: [
      { title: "Write the problem and target user", priority: "high" },
      { title: "Define the smallest useful prototype", priority: "high" },
      { title: "Assign team responsibilities", priority: "medium" },
      { title: "Capture the demo result and feedback", priority: "medium" },
    ],
  },
  internship: {
    label: "Internship",
    description: "Document context, contribution, outcomes, and learning.",
    milestones: [
      "Understand the team context",
      "Own a piece of work",
      "Ship or improve something",
      "Record feedback",
    ],
    tasks: [
      { title: "Record the team or organization context", priority: "medium" },
      { title: "Define your personal responsibility", priority: "high" },
      { title: "Capture the shipped outcome or improvement", priority: "high" },
      { title: "Add feedback or learning notes", priority: "medium" },
    ],
  },
  course: {
    label: "Course project",
    description: "Turn an assignment into a clear case study.",
    milestones: [
      "Define the question",
      "Research and plan",
      "Create the work",
      "Present the outcome",
    ],
    tasks: [
      { title: "Write the project question or objective", priority: "high" },
      { title: "Save the brief, rubric, or constraints", priority: "medium" },
      { title: "Record the main work and decisions", priority: "medium" },
      { title: "Add the final result and what you learned", priority: "high" },
    ],
  },
  research: {
    label: "Research",
    description: "Track question, method, findings, and limitations.",
    milestones: [
      "Frame the research question",
      "Collect evidence",
      "Analyze findings",
      "Share the conclusion",
    ],
    tasks: [
      { title: "Define the research question", priority: "high" },
      { title: "Document the method and sources", priority: "high" },
      { title: "Record the main finding", priority: "high" },
      { title: "Write limitations and next questions", priority: "medium" },
    ],
  },
};

export const PROJECT_TEMPLATE_OPTIONS = Object.entries(PROJECT_TEMPLATE_BLUEPRINTS).map(
  ([value, blueprint]) => ({
    value,
    label: blueprint.label,
    description: blueprint.description,
  }),
);
