import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button, FormField, Input } from "@/components/brio/ui";
import { Eye, EyeOff } from "lucide-react";
import { signupSchema } from "@/lib/schemas";
import { useAuth } from "@/hooks/useAuth";
import { AuthGuard } from "@/components/brio/AuthGuard";

export const Route = createFileRoute("/signup")({
  head: () => ({ meta: [{ title: "Sign up — Brio" }] }),
  component: SignupPageWrapper,
});

type SignupFormValues = z.infer<typeof signupSchema>;

function SignupPageWrapper() {
  return (
    <AuthGuard redirectIfAuthenticated>
      <SignupPage />
    </AuthGuard>
  );
}

function SignupPage() {
  const [show, setShow] = useState(false);
  const [serverError, setServerError] = useState("");
  const { signUp } = useAuth();
  const navigate = useNavigate();

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<SignupFormValues>({
    resolver: zodResolver(signupSchema),
  });

  const onSubmit = async (values: SignupFormValues) => {
    setServerError("");
    const { error } = await signUp(values.email, values.password, values.name);
    if (error) {
      if (error.message.includes("already registered") || error.message.includes("already exists")) {
        setServerError("An account with this email already exists. Try logging in.");
      } else {
        setServerError(error.message);
      }
      return;
    }
    navigate({ to: "/onboarding" });
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

        <h1 className="text-[18px] font-medium text-[var(--ink)]">Create your profile</h1>
        <p className="mb-6 text-[13px] text-[var(--ink-2)]">Start building your professional identity.</p>

        {serverError && (
          <div className="mb-4 rounded-md bg-[rgba(192,57,43,0.08)] px-3 py-2 text-[13px] text-[var(--error)]">
            {serverError}
          </div>
        )}

        <form onSubmit={handleSubmit(onSubmit)}>
          <FormField label="Full name" required error={errors.name?.message}>
            <Input
              placeholder="Your name as it appears on your resume"
              autoComplete="name"
              error={!!errors.name}
              {...register("name")}
            />
          </FormField>
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
                placeholder="At least 8 characters"
                autoComplete="new-password"
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

          <Button type="submit" variant="primary" size="lg" className="mt-2 w-full" loading={isSubmitting}>
            Create account
          </Button>
        </form>

        <p className="mt-6 text-center text-[13px] text-[var(--ink-2)]">
          Already have an account?{" "}
          <Link to="/login" className="font-medium text-[var(--accent-warm)]">
            Log in →
          </Link>
        </p>

        <p className="mt-4 text-center text-[11px] text-[var(--ink-3)]">
          By creating an account, you agree to our Terms of Service and Privacy Policy.
        </p>
      </div>
    </div>
  );
}
