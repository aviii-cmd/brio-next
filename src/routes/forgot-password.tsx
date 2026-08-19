import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button, FormField, Input } from "@/components/brio/ui";
import { forgotPasswordSchema } from "@/lib/schemas";
import { useAuth } from "@/hooks/useAuth";

export const Route = createFileRoute("/forgot-password")({
  head: () => ({ meta: [{ title: "Reset password — Brio" }] }),
  component: ForgotPasswordPage,
});

type FormValues = z.infer<typeof forgotPasswordSchema>;

function ForgotPasswordPage() {
  const { forgotPassword } = useAuth();
  const [sent, setSent] = useState(false);
  const [serverError, setServerError] = useState("");

  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<FormValues>({
    resolver: zodResolver(forgotPasswordSchema),
  });

  const onSubmit = async (values: FormValues) => {
    setServerError("");
    const { error } = await forgotPassword(values.email);
    if (error) {
      setServerError(error.message);
      return;
    }
    setSent(true);
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

        {sent ? (
          <div className="text-center">
            <div className="mx-auto mb-4 text-4xl">✉️</div>
            <h1 className="text-[18px] font-medium text-[var(--ink)]">Check your email</h1>
            <p className="mt-2 text-[13px] text-[var(--ink-2)]">
              We've sent a password reset link to your email address.
            </p>
            <Link to="/login" className="mt-6 block text-[13px] font-medium text-[var(--accent-warm)]">
              Back to login →
            </Link>
          </div>
        ) : (
          <>
            <h1 className="text-[18px] font-medium text-[var(--ink)]">Reset your password</h1>
            <p className="mb-6 text-[13px] text-[var(--ink-2)]">
              Enter your email and we'll send you a reset link.
            </p>

            {serverError && (
              <div className="mb-4 rounded-md bg-[rgba(192,57,43,0.08)] px-3 py-2 text-[13px] text-[var(--error)]">
                {serverError}
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
              <Button type="submit" variant="primary" size="lg" className="w-full" loading={isSubmitting}>
                Send reset link
              </Button>
            </form>

            <p className="mt-6 text-center text-[13px] text-[var(--ink-2)]">
              Remember it?{" "}
              <Link to="/login" className="font-medium text-[var(--accent-warm)]">
                Log in →
              </Link>
            </p>
          </>
        )}
      </div>
    </div>
  );
}
