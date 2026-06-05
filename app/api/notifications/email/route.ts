import { NextResponse } from "next/server";
import { getAdminClient } from "@/lib/stripe/server";
import { isEmailConfigured, sendEmail } from "@/lib/email/send";
import { notificationEmail } from "@/lib/email/templates";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// POST /api/notifications/email — Supabase Database Webhook sink. Fires on every
// INSERT into public.notifications, looks up the recipient + context, and emails
// them (respecting their email-notifications preference). One bridge covers all
// notification kinds — escrow, help replies, applications, messages, meetings.
//
// Configure in Supabase → Database → Webhooks: INSERT on public.notifications →
// POST https://www.seshnnn.com/api/notifications/email with header
//   x-webhook-secret: <NOTIFICATIONS_WEBHOOK_SECRET>
// Dormant until RESEND_API_KEY is set, so it's safe to wire early.
const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://www.seshnnn.com";

function urlForKind(kind: string, r: Record<string, string | null>): string {
  if ((kind.startsWith("escrow_") || kind === "review_received") && r.contract_id) return `${SITE_URL}/contract/${r.contract_id}`;
  if (kind === "help_reply" && r.help_thread_id) return `${SITE_URL}/help/${r.help_thread_id}`;
  if (kind.startsWith("application_") && r.gig_id) return `${SITE_URL}/gig/${r.gig_id}`;
  if (kind === "message_received") return `${SITE_URL}/inbox`;
  if (kind.startsWith("meeting_")) return `${SITE_URL}/inbox`;
  return SITE_URL;
}

export async function POST(req: Request) {
  const secret = process.env.NOTIFICATIONS_WEBHOOK_SECRET || "";
  if (!secret || req.headers.get("x-webhook-secret") !== secret) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  if (!isEmailConfigured()) {
    return NextResponse.json({ ok: true, skipped: "email not configured" });
  }

  let record: Record<string, string | null> | null = null;
  try {
    const body = await req.json();
    if (body?.table !== "notifications" || body?.type !== "INSERT") {
      return NextResponse.json({ ok: true, skipped: "not a notifications insert" });
    }
    record = body.record || null;
  } catch {
    return NextResponse.json({ error: "bad payload" }, { status: 400 });
  }
  if (!record?.user_id || !record.kind) {
    return NextResponse.json({ ok: true, skipped: "no recipient" });
  }

  try {
    const admin = getAdminClient();
    const kind = String(record.kind);

    const { data: recipient } = await admin
      .from("profiles")
      .select("username, display_name, notification_prefs")
      .eq("id", record.user_id)
      .maybeSingle();

    const prefs = (recipient?.notification_prefs || {}) as Record<string, boolean>;
    if (prefs.email_enabled === false) {
      return NextResponse.json({ ok: true, skipped: "email disabled by user" });
    }

    const { data: authUser } = await admin.auth.admin.getUserById(String(record.user_id));
    const to = authUser?.user?.email;
    if (!to) return NextResponse.json({ ok: true, skipped: "no email on file" });

    let actorName = "Someone";
    if (record.actor_id) {
      const { data: actor } = await admin
        .from("profiles")
        .select("username, display_name")
        .eq("id", record.actor_id)
        .maybeSingle();
      actorName = actor?.display_name || (actor?.username ? "@" + actor.username : "Someone");
    }

    let gigTitle = "your collaboration";
    if (record.gig_id) {
      const { data: gig } = await admin.from("gigs").select("title").eq("id", record.gig_id).maybeSingle();
      if (gig?.title) gigTitle = gig.title;
    }

    let threadTitle = "";
    if (record.help_thread_id) {
      const { data: th } = await admin.from("help_threads").select("title").eq("id", record.help_thread_id).maybeSingle();
      threadTitle = th?.title || "";
    }

    const recipientName = (recipient?.display_name || "").split(" ")[0] || recipient?.username || "there";
    const email = notificationEmail(kind, {
      recipientName,
      actorName,
      gigTitle,
      threadTitle,
      url: urlForKind(kind, record),
      siteUrl: SITE_URL,
    });
    if (!email) return NextResponse.json({ ok: true, skipped: `no template for ${kind}` });

    await sendEmail({ to, ...email });
    return NextResponse.json({ ok: true, sent: kind });
  } catch (e) {
    // Log and 200 so Supabase doesn't hammer retries on a transient send error.
    console.error("[email] notification bridge error", e);
    return NextResponse.json({ ok: false, error: (e as Error)?.message || "send error" });
  }
}
