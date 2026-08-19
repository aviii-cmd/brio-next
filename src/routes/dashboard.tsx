import { createFileRoute } from "@tanstack/react-router";
import { DashboardShell } from "@/components/brio/DashboardShell";

export const Route = createFileRoute("/dashboard")({
  head: () => ({ meta: [{ title: "Dashboard — Brio" }] }),
  component: DashboardShell,
});