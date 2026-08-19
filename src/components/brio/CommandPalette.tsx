import * as React from "react";
import { useNavigate } from "@tanstack/react-router";
import { Folders, Plus, FileText, Search } from "lucide-react";
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { useAuth } from "@/hooks/useAuth";
import { useProjects } from "@/hooks/useData";

/**
 * Global command palette — Ctrl/Cmd+K opens a minimal search across
 * projects by title, type, or skill, plus a shortcut to create a new
 * project (PRD §5.3, §6.3, AC4).
 */
export function CommandPalette({ onCreateProject }: { onCreateProject: () => void }) {
  const [open, setOpen] = React.useState(false);
  const navigate = useNavigate();
  const { user } = useAuth();
  const { data: projects = [] } = useProjects(user?.id);

  React.useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setOpen((v) => !v);
      }
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, []);

  const goToProjects = React.useCallback(() => {
    setOpen(false);
    navigate({ to: "/dashboard/projects" });
  }, [navigate]);

  const goToProject = React.useCallback(
    (id: string) => {
      setOpen(false);
      navigate({ to: "/dashboard/projects/$projectId", params: { projectId: id } });
    },
    [navigate],
  );

  return (
    <CommandDialog open={open} onOpenChange={setOpen}>
      <CommandInput placeholder="Search projects, or type a command…" />
      <CommandList>
        <CommandEmpty>No results found.</CommandEmpty>
        <CommandGroup heading="Actions">
          <CommandItem
            onSelect={() => {
              setOpen(false);
              onCreateProject();
            }}
          >
            <Plus className="mr-2 h-4 w-4" /> New project
          </CommandItem>
          <CommandItem onSelect={goToProjects}>
            <Folders className="mr-2 h-4 w-4" /> Go to Projects Home
          </CommandItem>
        </CommandGroup>
        {projects.length > 0 && (
          <CommandGroup heading="Projects">
            {projects.map((p) => (
              <CommandItem
                key={p.id}
                value={`${p.title} ${p.type} ${p.skills.join(" ")}`}
                onSelect={() => goToProject(p.id)}
              >
                <FileText className="mr-2 h-4 w-4" />
                <span className="truncate">{p.title}</span>
                <span className="ml-auto shrink-0 text-[11px] text-[var(--ink-3)]">{p.type}</span>
              </CommandItem>
            ))}
          </CommandGroup>
        )}
      </CommandList>
    </CommandDialog>
  );
}

/** Small trigger button used in the Projects Home page header on desktop. */
export function CommandPaletteTrigger({ onClick }: { onClick: () => void }) {
  const isMac = typeof navigator !== "undefined" && /Mac/.test(navigator.platform);
  return (
    <button
      type="button"
      onClick={onClick}
      className="hidden items-center gap-2 rounded-[4px] border border-[var(--surface-3)] bg-white px-3 h-9 text-[13px] text-[var(--ink-3)] hover:text-[var(--ink)] hover:border-[var(--ink-3)] transition-colors sm:flex"
    >
      <Search className="h-3.5 w-3.5" />
      Search
      <kbd className="ml-2 rounded border border-[var(--surface-3)] bg-[var(--surface-2)] px-1.5 py-0.5 text-[10px] font-medium text-[var(--ink-3)]">
        {isMac ? "⌘K" : "Ctrl K"}
      </kbd>
    </button>
  );
}
