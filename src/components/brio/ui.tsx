import * as React from "react";
import { cn } from "@/lib/utils";
import { Loader2 } from "lucide-react";

type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "secondary" | "ghost" | "destructive" | "warm";
  size?: "sm" | "md" | "lg";
  loading?: boolean;
  asChild?: boolean;
};

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = "primary", size = "md", loading, children, disabled, ...props }, ref) => {
    const sizes = {
      sm: "h-7 px-3 text-[13px]",
      md: "h-9 px-4 text-[13px]",
      lg: "h-11 px-6 text-[14px]",
    };
    const variants = {
      primary:
        "bg-[var(--ink)] text-white hover:bg-[#2A2A2A] active:scale-[0.98]",
      warm:
        "bg-[var(--accent-warm)] text-white hover:brightness-110 active:scale-[0.98]",
      secondary:
        "border border-[var(--surface-3)] bg-white text-[var(--ink)] hover:bg-[var(--surface-2)]",
      ghost:
        "text-[var(--ink-2)] hover:text-[var(--ink)] hover:bg-[var(--surface-2)]",
      destructive: "bg-[var(--error)] text-white hover:brightness-110",
    };
    return (
      <button
        ref={ref}
        disabled={disabled || loading}
        className={cn(
          "inline-flex items-center justify-center gap-2 rounded-[4px] font-medium tracking-[0.01em] transition-all duration-150 ease-in-out outline-none focus-visible:outline-2 focus-visible:outline-[var(--ink)] focus-visible:outline-offset-2 disabled:opacity-40 disabled:pointer-events-none whitespace-nowrap",
          sizes[size],
          variants[variant],
          className,
        )}
        {...props}
      >
        {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : children}
      </button>
    );
  },
);
Button.displayName = "Button";

export const Input = React.forwardRef<
  HTMLInputElement,
  React.InputHTMLAttributes<HTMLInputElement> & { error?: boolean; icon?: React.ReactNode }
>(({ className, error, icon, ...props }, ref) => (
  <div className="relative w-full">
    {icon && (
      <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[var(--ink-3)]">
        {icon}
      </span>
    )}
    <input
      ref={ref}
      className={cn(
        "h-9 w-full rounded-[4px] border bg-white px-3 text-[15px] text-[var(--ink)] placeholder:text-[var(--ink-3)] outline-none transition-all duration-150",
        "focus:border-[var(--ink)] focus:ring-2 focus:ring-[rgba(10,10,10,0.08)]",
        error
          ? "border-[var(--error)] focus:border-[var(--error)] focus:ring-[rgba(192,57,43,0.12)]"
          : "border-[var(--surface-3)]",
        icon && "pl-9",
        "disabled:bg-[var(--surface-2)] disabled:text-[var(--ink-3)] disabled:cursor-not-allowed",
        className,
      )}
      {...props}
    />
  </div>
));
Input.displayName = "Input";

export const Textarea = React.forwardRef<
  HTMLTextAreaElement,
  React.TextareaHTMLAttributes<HTMLTextAreaElement> & { error?: boolean }
>(({ className, error, ...props }, ref) => (
  <textarea
    ref={ref}
    className={cn(
      "min-h-[88px] w-full rounded-[4px] border bg-white px-3 py-2.5 text-[15px] text-[var(--ink)] placeholder:text-[var(--ink-3)] outline-none transition-all duration-150 resize-y",
      "focus:border-[var(--ink)] focus:ring-2 focus:ring-[rgba(10,10,10,0.08)]",
      error
        ? "border-[var(--error)] focus:border-[var(--error)]"
        : "border-[var(--surface-3)]",
      className,
    )}
    {...props}
  />
));
Textarea.displayName = "Textarea";

export function Label({ children, className, ...props }: React.LabelHTMLAttributes<HTMLLabelElement>) {
  return (
    <label className={cn("mb-1 block text-[13px] font-medium text-[var(--ink-2)]", className)} {...props}>
      {children}
    </label>
  );
}

export function FormField({
  label,
  helper,
  error,
  children,
  required,
}: {
  label: string;
  helper?: string;
  error?: string;
  children: React.ReactNode;
  required?: boolean;
}) {
  return (
    <div className="mb-4">
      <Label>
        {label}
        {required && <span className="ml-0.5 text-[var(--ink-3)]">*</span>}
      </Label>
      {children}
      {helper && !error && (
        <p className="mt-1 text-[11px] text-[var(--ink-3)]">{helper}</p>
      )}
      {error && <p className="mt-1 text-[11px] text-[var(--error)]">{error}</p>}
    </div>
  );
}

export function Badge({
  children,
  variant = "default",
  className,
}: {
  children: React.ReactNode;
  variant?: "default" | "featured" | "skill" | "level-school" | "level-regional" | "level-national" | "level-international";
  className?: string;
}) {
  const variants = {
    default:
      "bg-[var(--surface-2)] border border-[var(--surface-3)] text-[var(--ink-2)]",
    featured:
      "border text-[var(--accent-warm)]",
    skill:
      "bg-[var(--surface-2)] border border-[var(--surface-3)] text-[var(--ink-2)]",
    "level-school": "bg-[var(--surface-3)] text-[var(--ink-2)]",
    "level-regional": "bg-[#D8D6D2] text-[var(--ink)]",
    "level-national": "bg-[#9C9A95] text-white",
    "level-international": "bg-[var(--ink)] text-white",
  };
  const featuredStyle =
    variant === "featured"
      ? { backgroundColor: "rgba(200,98,42,0.10)", borderColor: "rgba(200,98,42,0.20)" }
      : undefined;
  return (
    <span
      style={featuredStyle}
      className={cn(
        "inline-flex items-center rounded-full px-2 py-0.5 text-[11px] tracking-[0.02em]",
        variants[variant],
        className,
      )}
    >
      {children}
    </span>
  );
}

export function Card({ children, className, hover, ...props }: React.HTMLAttributes<HTMLDivElement> & { hover?: boolean }) {
  return (
    <div
      className={cn(
        "rounded-lg border border-[var(--surface-3)] bg-[var(--surface-2)] p-6 transition-all duration-200",
        hover && "hover:bg-white hover:shadow-[0_2px_8px_rgba(0,0,0,0.06)]",
        className,
      )}
      {...props}
    >
      {children}
    </div>
  );
}

export function Avatar({
  size = "md",
  initials,
  className,
}: {
  size?: "sm" | "md" | "lg" | "xl";
  initials: string;
  className?: string;
}) {
  const sizes = {
    sm: "h-6 w-6 text-[10px]",
    md: "h-10 w-10 text-[13px]",
    lg: "h-16 w-16 text-[18px]",
    xl: "h-24 w-24 text-[28px]",
  };
  return (
    <div
      className={cn(
        "inline-flex items-center justify-center rounded-full bg-[var(--surface-3)] font-medium text-[var(--ink-2)] ring-2 ring-white",
        sizes[size],
        className,
      )}
    >
      {initials}
    </div>
  );
}

export function Divider({ label, className }: { label?: string; className?: string }) {
  if (label) {
    return (
      <div className={cn("flex items-center gap-3 my-4", className)}>
        <div className="h-px flex-1 bg-[var(--surface-3)]" />
        <span className="text-[11px] uppercase tracking-[0.04em] text-[var(--ink-3)]">{label}</span>
        <div className="h-px flex-1 bg-[var(--surface-3)]" />
      </div>
    );
  }
  return <div className={cn("h-px w-full bg-[var(--surface-3)]", className)} />;
}

export function Toggle({
  checked,
  onChange,
  disabled,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={cn(
        "relative h-5 w-9 rounded-full transition-colors duration-200 outline-none focus-visible:outline-2 focus-visible:outline-[var(--ink)] focus-visible:outline-offset-2",
        checked ? "bg-[var(--ink)]" : "bg-[var(--surface-3)]",
        disabled && "opacity-40 cursor-not-allowed",
      )}
    >
      <span
        className={cn(
          "absolute top-0.5 left-0.5 h-4 w-4 rounded-full bg-white transition-transform duration-200",
          checked && "translate-x-4",
        )}
      />
    </button>
  );
}

export function EmptyState({
  icon,
  title,
  body,
  cta,
  className,
}: {
  icon: React.ReactNode;
  title: string;
  body: string;
  cta?: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("flex flex-col items-center text-center py-12 px-6", className)}>
      <div className="text-[var(--ink-3)] mb-4">{icon}</div>
      <h3 className="text-[18px] font-medium text-[var(--ink)]">{title}</h3>
      <p className="mt-2 max-w-[280px] text-[13px] text-[var(--ink-2)]">{body}</p>
      {cta && <div className="mt-5">{cta}</div>}
    </div>
  );
}

export function PageHeader({
  title,
  action,
  subtitle,
}: {
  title: string;
  action?: React.ReactNode;
  subtitle?: string;
}) {
  return (
    <div className="mb-8 flex items-end justify-between gap-4 flex-wrap">
      <div>
        <h1 className="text-[24px] font-medium leading-[1.3] tracking-[-0.02em] text-[var(--ink)]">
          {title}
        </h1>
        {subtitle && (
          <p className="mt-1 text-[13px] text-[var(--ink-2)]">{subtitle}</p>
        )}
      </div>
      {action}
    </div>
  );
}