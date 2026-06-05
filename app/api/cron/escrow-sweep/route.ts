import { NextResponse } from "next/server";
import { getStripe, getAdminClient } from "@/lib/stripe/server";
import { isStripeConfigured } from "@/lib/stripe/config";
import { releaseEscrow, refundEscrow, type EscrowRow } from "@/lib/stripe/escrow-ops";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// GET /api/cron/escrow-sweep — runs on a schedule (see vercel.json `crons`).
// Two sweeps:
//   1. Auto-release: delivered escrows whose approval window (auto_release_at)
//      has elapsed → release funds to the collaborator.
//   2. Deadline refund: funded escrows whose delivery deadline (deadline_at)
//      has passed with nothing delivered → refund the owner.
// Vercel attaches `Authorization: Bearer $CRON_SECRET` to scheduled invocations;
// we reject anything without it so the endpoint isn't publicly triggerable.
async function handle(req: Request) {
  const secret = process.env.CRON_SECRET || "";
  const auth = req.headers.get("authorization") || "";
  if (!secret || auth !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  if (!isStripeConfigured()) {
    return NextResponse.json({ error: "not configured" }, { status: 503 });
  }

  const admin = getAdminClient();
  const stripe = getStripe();
  const nowIso = new Date().toISOString();
  const ESCROW_COLS =
    "id, contract_id, status, amount_cents, platform_fee_cents, currency, stripe_payment_intent_id, stripe_transfer_id";

  let released = 0;
  let refunded = 0;
  let skipped = 0;
  const errors: string[] = [];

  try {
    // ── 1. Auto-release due deliveries ──
    const { data: dueRelease, error: relErr } = await admin
      .from("escrows")
      .select(ESCROW_COLS)
      .eq("status", "delivered")
      .lte("auto_release_at", nowIso)
      .limit(200);
    if (relErr) throw relErr;

    const releaseRows = (dueRelease as EscrowRow[]) || [];
    if (releaseRows.length) {
      // Resolve each escrow's collaborator payout account in two batched queries.
      const contractIds = [...new Set(releaseRows.map((e) => e.contract_id))];
      const { data: contracts } = await admin
        .from("contracts")
        .select("id, collaborator_id")
        .in("id", contractIds);
      const collabByContract = new Map((contracts || []).map((c) => [c.id, c.collaborator_id as string]));
      const collabIds = [...new Set((contracts || []).map((c) => c.collaborator_id as string))];
      const { data: profiles } = await admin
        .from("profiles")
        .select("id, stripe_account_id, stripe_account_status")
        .in("id", collabIds.length ? collabIds : ["00000000-0000-0000-0000-000000000000"]);
      const acctById = new Map((profiles || []).map((p) => [p.id as string, p]));

      for (const e of releaseRows) {
        const collabId = collabByContract.get(e.contract_id);
        const acct = collabId ? acctById.get(collabId) : null;
        if (!acct?.stripe_account_id || acct.stripe_account_status !== "verified") {
          skipped++; // can't release until they finish payout setup; leave it for next sweep
          continue;
        }
        try {
          const r = await releaseEscrow(admin, stripe, e, acct.stripe_account_id, null, "auto_release");
          if (r.released) released++;
        } catch (err) {
          errors.push(`release ${e.id}: ${(err as Error)?.message || "error"}`);
        }
      }
    }

    // ── 2. Refund missed-deadline deals ──
    const { data: dueRefund, error: refErr } = await admin
      .from("escrows")
      .select(ESCROW_COLS)
      .eq("status", "funded")
      .not("deadline_at", "is", null)
      .lte("deadline_at", nowIso)
      .limit(200);
    if (refErr) throw refErr;

    for (const e of (dueRefund as EscrowRow[]) || []) {
      try {
        const r = await refundEscrow(admin, stripe, e, null, "deadline_missed");
        if (r.refunded) refunded++;
      } catch (err) {
        errors.push(`refund ${e.id}: ${(err as Error)?.message || "error"}`);
      }
    }
  } catch (e) {
    console.error("[cron] escrow-sweep error", e);
    return NextResponse.json({ error: (e as Error)?.message || "sweep error" }, { status: 500 });
  }

  return NextResponse.json({ ok: true, released, refunded, skipped, errors });
}

export async function GET(req: Request) {
  return handle(req);
}
export async function POST(req: Request) {
  return handle(req);
}
