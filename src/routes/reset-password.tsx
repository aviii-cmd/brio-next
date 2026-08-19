import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button, FormField, Input } from "@/components/brio/ui";
import { resetPasswordSchema } from "@/lib/schemas";
import { useAuth } from "@/hooks/useAuth";

export const Route = createFileRoute("/reset-password")({
  head: () => ({ meta: [{ title: "Choose a new password — Brio" }] }),
  component: ResetPasswordPage,
});

type FormValues = z.infer<typeof resetPasswordSchema>;

function ResetPasswordPage() {
  const navigate = useNavigate();
  const { resetPassword } = useAuth();
  const [serverError, setServerError] = useState("");
  const [updated, setUpdated] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(resetPasswordSchema),
  });

  const onSubmit = async (values: FormValues) => {
    setServerError("");
    const { error } = await resetPassword(values.password);
    if (error) {
      setServerError(error.message);
      return;
    }
    setUpdated(true);
    window.setTimeout(() => navigate({ to: "/login", replace: true }), 1200);
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

        {updated ? (
          <div className="text-center">
            <h1 className="text-[18px] font-medium text-[var(--ink)]">Password updated</h1>
            <p className="mt-2 text-[13px] text-[var(--ink-2)]">
              Your password has been changed. Redirecting you to log in…
            </p>
            <Link
              to="/login"
              className="mt-6 block text-[13px] font-medium text-[var(--accent-warm)]"
            >
              Go to login →
            </Link>
          </div>
        ) : (
          <>
            <h1 className="text-[18px] font-medium text-[var(--ink)]">Choose a new password</h1>
            <p className="mb-6 text-[13px] text-[var(--ink-2)]">
              Use at least 8 characters for your new Brio password.
            </p>

            {serverError && (
              <div className="mb-4 rounded-md bg-[rgba(192,57,43,0.08)] px-3 py-2 text-[13px] text-[var(--error)]">
                This reset link may be invalid or expired. Request a new one and try again.
              </div>
            )}

            <form onSubmit={handleSubmit(onSubmit)}>
              <FormField label="New password" required error={errors.password?.message}>
                <Input
                  type="password"
                  placeholder="At least 8 characters"
                  autoComplete="new-password"
                  error={!!errors.password}
                  {...register("password")}
                />
              </FormField>

              <FormField
                label="Confirm new password"
                required
                error={errors.confirmPassword?.message}
              >
                <Input
                  type="password"
                  placeholder="Repeat your new password"
                  autoComplete="new-password"
                  error={!!errors.confirmPassword}
                  {...register("confirmPassword")}
                />
              </FormField>

              <Button
                type="submit"
                variant="primary"
                size="lg"
                className="w-full"
                loading={isSubmitting}
              >
                Update password
              </Button>
            </form>

            <p className="mt-6 text-center text-[13px] text-[var(--ink-2)]">
              Need a new reset link?{" "}
              <Link to="/forgot-password" className="font-medium text-[var(--accent-warm)]">
                Request one →
              </Link>
            </p>
          </>
        )}
      </div>
    </div>
  );
}
