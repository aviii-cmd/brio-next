// Brio — Stage 3 Discover: Weekly Digest (PRD §9/§11, Should-Have)
//
// A Supabase Edge Function (Deno runtime) that, for every student with an
// email on file, computes:
//   - their top personalized recommendations (via the same
//     public.recommend_opportunities() SQL function the app itself uses —
//     one source of truth, no duplicated scoring logic)
//   - opportunities closing in the next 14 days
// ...and emails a short digest via Resend (https://resend.com).
//
// This function does the real computation and a real send; the only things
// that need to be supplied are secrets and a schedule (see SETUP_STAGE3.md).
//
// Deploy:
//   supabase functions deploy weekly-digest
//
// Required secrets (`supabase secrets set NAME=value`):
//   RESEND_API_KEY       - from https://resend.com/api-keys
//   DIGEST_FROM_ADDRESS  - e.g. "Brio <digest@yourdomain.com>" (must be a
//                          domain verified in Resend)
//   APP_URL              - e.g. "https://app.yourbrio.com" (used to build
//                          links back into the app)
//   DIGEST_CRON_SECRET   - any random string; the scheduled trigger must
//                          send it back as the `x-cron-secret` header so
//                          this endpoint can't be spammed by strangers
// SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are already available
// automatically inside every Edge Function — do not set them yourself.
//
// Schedule: see SETUP_STAGE3.md for the pg_cron + pg_net snippet that
// calls this function weekly.

import { createClient, type SupabaseClient } from "npm:@supabase/supabase-js@2";

interface OpportunityStub {
  id: string;
  title: string;
  organization: string;
}

interface DigestSummary {
  recommended: OpportunityStub[];
  closingSoon: (OpportunityStub & { application_deadline: string })[];
}

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY") ?? "";
const FROM_ADDRESS = Deno.env.get("DIGEST_FROM_ADDRESS") ?? "Brio <digest@example.com>";
const APP_URL = Deno.env.get("APP_URL") ?? "https://app.example.com";
const CRON_SECRET = Deno.env.get("DIGEST_CRON_SECRET") ?? "";
const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";

Deno.serve(async (req: Request) => {
  if (CRON_SECRET && req.headers.get("x-cron-secret") !== CRON_SECRET) {
    return new Response("Unauthorized", { status: 401 });
  }
  if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
    return jsonResponse({ error: "Missing SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY" }, 500);
  }

  const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

  try {
    const { data: profiles, error: profilesError } = await supabase
      .from("profiles")
      .select("id, name, email")
      .not("email", "is", null);
    if (profilesError) throw profilesError;

    const results: { userId: string; sent: boolean; reason?: string }[] = [];

    for (const profile of profiles ?? []) {
      const summary = await buildDigestForUser(supabase, profile.id as string);
      const hasContent = summary.recommended.length > 0 || summary.closingSoon.length > 0;

      if (!hasContent) {
        results.push({ userId: profile.id as string, sent: false, reason: "nothing to report" });
        continue;
      }
      if (!RESEND_API_KEY || !profile.email) {
        results.push({
          userId: profile.id as string,
          sent: false,
          reason: "no RESEND_API_KEY or email",
        });
        continue;
      }

      const sent = await sendDigestEmail(
        profile.email as string,
        (profile.name as string) ?? "",
        summary,
      );
      results.push({ userId: profile.id as string, sent });
    }

    return jsonResponse({
      processed: results.length,
      sent: results.filter((r) => r.sent).length,
      results,
    });
  } catch (err) {
    console.error("weekly-digest failed:", err);
    return jsonResponse({ error: err instanceof Error ? err.message : String(err) }, 500);
  }
});

async function buildDigestForUser(
  supabase: SupabaseClient,
  userId: string,
): Promise<DigestSummary> {
  const fourteenDaysFromNow = new Date(Date.now() + 14 * 86_400_000).toISOString();

  const [recommendationRpc, closingSoonQuery] = await Promise.all([
    supabase.rpc("recommend_opportunities", { p_user_id: userId, p_limit: 5 }),
    supabase
      .from("opportunities")
      .select("id, title, organization, application_deadline")
      .eq("is_active", true)
      .eq("rolling_deadline", false)
      .not("application_deadline", "is", null)
      .gt("application_deadline", new Date().toISOString())
      .lte("application_deadline", fourteenDaysFromNow)
      .order("application_deadline", { ascending: true })
      .limit(5),
  ]);

  if (recommendationRpc.error) throw recommendationRpc.error;
  if (closingSoonQuery.error) throw closingSoonQuery.error;

  let recommended: OpportunityStub[] = [];
  const recRows = (recommendationRpc.data ?? []) as { opportunity_id: string }[];
  if (recRows.length > 0) {
    const ids = recRows.map((r) => r.opportunity_id);
    const { data: opportunities, error } = await supabase
      .from("opportunities")
      .select("id, title, organization")
      .in("id", ids);
    if (error) throw error;
    const byId = new Map((opportunities ?? []).map((o) => [o.id as string, o as OpportunityStub]));
    recommended = recRows
      .map((r) => byId.get(r.opportunity_id))
      .filter((o): o is OpportunityStub => Boolean(o));
  }

  const closingSoon = (closingSoonQuery.data ?? []) as (OpportunityStub & {
    application_deadline: string;
  })[];

  return { recommended, closingSoon };
}

async function sendDigestEmail(to: string, name: string, summary: DigestSummary): Promise<boolean> {
  const html = renderDigestHtml(name, summary);

  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${RESEND_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: FROM_ADDRESS,
      to,
      subject: "Your weekly Brio digest",
      html,
    }),
  });

  if (!res.ok) {
    console.error("Resend send failed:", res.status, await res.text());
    return false;
  }
  return true;
}

function renderDigestHtml(name: string, summary: DigestSummary): string {
  const section = (title: string, items: OpportunityStub[]) => {
    if (items.length === 0) return "";
    const rows = items
      .map(
        (item) =>
          `<li style="margin-bottom:6px;font-size:14px;line-height:1.4;">` +
          `<a href="${APP_URL}/dashboard/discover/${item.id}" style="color:#0a0a0a;text-decoration:underline;">${escapeHtml(item.title)}</a>` +
          ` — ${escapeHtml(item.organization)}</li>`,
      )
      .join("");
    return `<h3 style="font-size:13px;text-transform:uppercase;letter-spacing:0.04em;color:#6b6b6b;margin:20px 0 8px;">${title}</h3><ul style="padding-left:18px;margin:0;">${rows}</ul>`;
  };

  return `<!DOCTYPE html>
<html>
  <body style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;background:#faf9f7;padding:24px;">
    <div style="max-width:520px;margin:0 auto;background:#ffffff;border:1px solid #e5e2dc;border-radius:8px;padding:28px;">
      <p style="font-size:15px;color:#0a0a0a;margin:0 0 4px;">Hi ${escapeHtml(name || "there")},</p>
      <p style="font-size:14px;color:#6b6b6b;margin:0;">Here's what's worth a look on Brio this week.</p>
      ${section("Closing soon", summary.closingSoon)}
      ${section("Matched to you", summary.recommended)}
      <a href="${APP_URL}/dashboard/discover" style="display:inline-block;margin-top:24px;font-size:13px;font-weight:500;color:#ffffff;background:#0a0a0a;padding:10px 16px;border-radius:6px;text-decoration:none;">Open Discover</a>
    </div>
  </body>
</html>`;
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}
