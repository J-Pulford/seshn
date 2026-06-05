import { NextResponse } from "next/server";
import { getStripe, getAdminClient, userFromRequest } from "@/lib/stripe/server";
import { isStripeConfigured } from "@/lib/stripe/config";
import { releaseEscrow } from "@/lib/stripe/escrow-ops";
import { rateLimit } from "@/lib/rate-limit";

export const runtime = "nodejs";

// POST /api/stripe/escrow/release — the owner approves the delivery and releases
// the escrow. We Transfer (fee − platform fee) from Seshn's platform balance to
// the collaborator's connected account, mark the escrow released, and complete
// the contract. Seshn keeps the platform fee (which absorbs Stripe's processing
// cost). The owner can release while the escrow is 'funded' or 'delivered'.
//
// A future cron sweep will call the same transition for auto-release when an
// approval window lapses; for now release is owner-initiated.
export async function POST(req: Request) {
  if (!isStripeConfigured()) {
    return NextResponse.json({ error: "Payments aren't set up yet." }, { status: 503 });
  }
  const user = await userFromRequest(req);
  if (!user) return NextResponse.json({ error: "Not signed in" }, { status: 401 });

  const rl = rateLimit(`stripe:release:${user.id}`, 10, 60_000);
  if (!rl.ok) {
    return NextResponse.json(
      { error: "Too many requests — please wait a moment and try again." },
      { status: 429, headers: { "Retry-After": String(rl.retryAfter) } },
    );
  }

  let contractId = "";
  try {
    const body = await req.json();
    contractId = String(body?.contractId || "");
  } catch {
    /* fall through */
  }
  if (!contractId) return NextResponse.json({ error: "Missing contractId" }, { status: 400 });

  try {
    const stripe = getStripe();
    const admin = getAdminClient();

    const { data: contract, error: cErr } = await admin
      .from("contracts")
      .select("id, owner_id, collaborator_id, status")
      .eq("id", contractId)
      .maybeSingle();
    if (cErr) throw cErr;
    if (!contract) return NextResponse.json({ error: "Contract not found" }, { status: 404 });
    if (contract.owner_id !== user.id) {
      return NextResponse.json({ error: "Only the contract owner can release the escrow." }, { status: 403 });
    }

    const { data: escrow, error: eErr } = await admin
      .from("escrows")
      .select("id, contract_id, status, amount_cents, platform_fee_cents, currency, stripe_payment_intent_id, stripe_transfer_id")
      .eq("contract_id", contractId)
      .maybeSingle();
    if (eErr) throw eErr;
    if (!escrow) return NextResponse.json({ error: "No escrow found for this contract." }, { status: 404 });
    if (escrow.status === "released") {
      return NextResponse.json({ ok: true, alreadyReleased: true });
    }
    if (escrow.status !== "funded" && escrow.status !== "delivered") {
      return NextResponse.json(
        { error: `Escrow can't be released from status ${escrow.status}.` },
        { status: 409 },
      );
    }

    const { data: collab } = await admin
      .from("profiles")
      .select("stripe_account_id, stripe_account_status")
      .eq("id", contract.collaborator_id)
      .maybeSingle();
    if (!collab?.stripe_account_id || collab.stripe_account_status !== "verified") {
      return NextResponse.json(
        { error: "The collaborator's payout account isn't ready — can't release yet." },
        { status: 409 },
      );
    }

    await releaseEscrow(admin, stripe, escrow, collab.stripe_account_id, user.id, "owner_approved");
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("[stripe] escrow release error", e);
    return NextResponse.json({ error: (e as Error)?.message || "Stripe error" }, { status: 500 });
  }
}
