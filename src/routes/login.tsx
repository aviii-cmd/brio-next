import { createFileRoute, Link, useNavigate, useSearch } from "@tanstack/react-router";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button, FormField, Input } from "@/components/brio/ui";
import { Eye, EyeOff } from "lucide-react";
import { loginSchema } from "@/lib/schemas";
import { useAuth } from "@/hooks/useAuth";
import { AuthGuard } from "@/components/brio/AuthGuard";
import { supabase } from "@/lib/supabase";

type LoginFormValues = z.infer<typeof loginSchema>;

const searchSchema = z.object({ redirect: z.string().optional() });

export const Route = createFileRoute("/login")({
  head: () => ({ meta: [{ title: "Log in — Brio" }] }),
  validateSearch: searchSchema,
  component: LoginPageWrapper,
});

function LoginPageWrapper() {
  return (
    <AuthGuard redirectIfAuthenticated>
      <LoginPage />
    </AuthGuard>
  );
}

function LoginPage() {
  const [show, setShow] = useState(false);
  const [serverError, setServerError] = useState("");
  const [emailNotConfirmed, setEmailNotConfirmed] = useState("");
  const [resendSent, setResendSent] = useState(false);
  const [resendLoading, setResendLoading] = useState(false);
  const { signIn } = useAuth();
  const navigate = useNavigate();
  const { redirect } = useSearch({ from: "/login" });

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
  });

  const onSubmit = async (values: LoginFormValues) => {
    setServerError("");
    setEmailNotConfirmed("");
    setResendSent(false);

    const { error } = await signIn(values.email, values.password);
    if (error) {
      if (error.message.toLowerCase().includes("email not confirmed")) {
        setEmailNotConfirmed(values.email);
      } else {
        setServerError(
          error.message.includes("Invalid login credentials")
            ? "Invalid email or password."
            : error.message,
        );
      }
      return;
    }
    navigate({ to: (redirect as string) ?? "/dashboard" });
  };

  const handleResendConfirmation = async () => {
    if (!emailNotConfirmed) return;
    setResendLoading(true);
    await supabase.auth.resend({ type: "signup", email: emailNotConfirmed });
    setResendLoading(false);
    setResendSent(true);
  };

  return (
    <div className="flex min-h-dvh items-center justify-center bg-[var(--surface)] px-4 py-10 sm:px-5 sm:py-12">
      <div
        className="w-full max-w-[400px] rounded-md border border-[var(--surface-3)] bg-white p-6 sm:p-10"
        style={{ boxShadow: "0 4px 24px rgba(0,0,0,0.06)" }}
      >
        <div className="mb-6 text-center font-serif text-[24px] font-semibold tracking-[-0.02em] text-[var(--ink)]">
          <Link to="/">Brio</Link>
        </div>

        <h1 className="text-[18px] font-medium text-[var(--ink)]">Welcome back</h1>
        <p className="mb-6 text-[13px] text-[var(--ink-2)]">Log in to your professional profile.</p>

        {serverError && (
          <div className="mb-4 rounded-md bg-[rgba(192,57,43,0.08)] px-3 py-2 text-[13px] text-[var(--error)]">
            {serverError}
          </div>
        )}

        {emailNotConfirmed && !resendSent && (
          <div className="mb-4 rounded-md border border-[var(--surface-3)] bg-[var(--surface-2)] px-4 py-3">
            <p className="text-[13px] font-medium text-[var(--ink)]">Email not confirmed</p>
            <p className="mt-1 text-[12px] text-[var(--ink-2)]">
              Check your inbox for a confirmation link, or resend it below.
            </p>
            <button
              onClick={handleResendConfirmation}
              disabled={resendLoading}
              className="mt-2 text-[12px] font-medium text-[var(--accent-warm)] hover:underline disabled:opacity-50"
            >
              {resendLoading ? "Sending…" : "Resend confirmation email →"}
            </button>
          </div>
        )}

        {resendSent && (
          <div className="mb-4 rounded-md bg-[rgba(39,174,96,0.08)] px-3 py-2 text-[13px] text-[#1a7a40]">
            Confirmation email sent — check your inbox.
          </div>
        )}

        <form onSubmit={handleSubmit(onSubmit)}>
          <FormField label="Email address" required error={errors.email?.message}>
            <Input
              type="email"
              placeholder="you@school.edu"
              autoComplete="email"
              error={!!errors.email}
              {...register("email")}
            />
          </FormField>
          <FormField label="Password" required error={errors.password?.message}>
            <div className="relative">
              <Input
                type={show ? "text" : "password"}
                autoComplete="current-password"
                error={!!errors.password}
                {...register("password")}
              />
              <button
                type="button"
                onClick={() => setShow(!show)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--ink-3)]"
                aria-label="Toggle password visibility"
              >
                {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </FormField>

          <div className="mb-4 -mt-2 text-right">
            <Link
              to="/forgot-password"
              className="text-[13px] text-[var(--ink-2)] hover:text-[var(--ink)]"
            >
              Forgot password?
            </Link>
          </div>

          <Button
            type="submit"
            variant="primary"
            size="lg"
            className="w-full"
            loading={isSubmitting}
          >
            Log in
          </Button>
        </form>

        <p className="mt-6 text-center text-[13px] text-[var(--ink-2)]">
          Don't have an account?{" "}
          <Link to="/signup" className="font-medium text-[var(--accent-warm)]">
            Start free →
          </Link>
        </p>
      </div>
    </div>
  );
}
