import { NextResponse } from "next/server";
import { getStripe, getAdminClient, userFromRequest } from "@/lib/stripe/server";
import { isStripeConfigured, computeCharge } from "@/lib/stripe/config";
import { rateLimit } from "@/lib/rate-limit";

export const runtime = "nodejs";

// POST /api/stripe/escrow/fund — the owner funds the escrow for an active
// contract. We ensure an escrow row exists (status awaiting_funds), then open a
// Stripe Checkout session for the agreed fee. The charge settles onto Seshn's
// platform balance (no transfer at checkout) — that IS the escrow hold. Funds
// move to the collaborator later via a Transfer in /api/stripe/escrow/release.
// The webhook (checkout.session.completed) flips the escrow to 'funded'.
export async function POST(req: Request) {
  if (!isStripeConfigured()) {
    return NextResponse.json({ error: "Payments aren't set up yet." }, { status: 503 });
  }
  const user = await userFromRequest(req);
  if (!user) return NextResponse.json({ error: "Not signed in" }, { status: 401 });

  const rl = rateLimit(`stripe:fund:${user.id}`, 10, 60_000);
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
    /* fall through to validation */
  }
  if (!contractId) return NextResponse.json({ error: "Missing contractId" }, { status: 400 });

  try {
    const stripe = getStripe();
    const admin = getAdminClient();

    // Load the contract (service role — bypasses RLS; we authorize by hand).
    const { data: contract, error: cErr } = await admin
      .from("contracts")
      .select("id, owner_id, collaborator_id, status, terms, gig:gigs(title)")
      .eq("id", contractId)
      .maybeSingle();
    if (cErr) throw cErr;
    if (!contract) return NextResponse.json({ error: "Contract not found" }, { status: 404 });
    if (contract.owner_id !== user.id) {
      return NextResponse.json({ error: "Only the contract owner can fund the escrow." }, { status: 403 });
    }
    if (contract.status !== "active") {
      return NextResponse.json(
        { error: `Contract must be active to fund (it's ${contract.status}).` },
        { status: 409 },
      );
    }

    const terms = (contract.terms || {}) as {
      fee_cents?: number;
      currency?: string;
      deliverable?: { deliver_by?: string };
    };
    const feeCents = Math.round(Number(terms.fee_cents || 0));
    const currency = String(terms.currency || "AUD").toUpperCase();
    if (!feeCents || feeCents < 100) {
      return NextResponse.json({ error: "Contract fee is missing or below the $1 minimum." }, { status: 422 });
    }
    if (!/^[A-Z]{3}$/.test(currency)) {
      return NextResponse.json({ error: "Contract currency is invalid." }, { status: 422 });
    }

    // The collaborator must be able to receive payouts, or funds would be stuck
    // in escrow with nowhere to release to.
    const { data: collab } = await admin
      .from("profiles")
      .select("stripe_account_id, stripe_account_status, username")
      .eq("id", contract.collaborator_id)
      .maybeSingle();
    if (!collab?.stripe_account_id || collab.stripe_account_status !== "verified") {
      return NextResponse.json(
        {
          error:
            "The collaborator hasn't finished payout setup yet, so funds couldn't be released to them. Ask them to connect their bank in Settings, then try again.",
          code: "collaborator_payouts_not_ready",
        },
        { status: 409 },
      );
    }

    const breakdown = computeCharge(feeCents);
    const deadlineAt = terms.deliverable?.deliver_by
      ? new Date(terms.deliverable.deliver_by + "T23:59:59Z").toISOString()
      : null;

    // Ensure exactly one escrow per contract. If it already exists and has moved
    // past awaiting_funds, the deal is already (being) funded — don't double-charge.
    const { data: existing } = await admin
      .from("escrows")
      .select("id, status")
      .eq("contract_id", contractId)
      .maybeSingle();

    let escrowId = existing?.id as string | undefined;
    if (existing && existing.status !== "awaiting_funds") {
      return NextResponse.json(
        { error: `This escrow is already ${existing.status}.`, code: "already_funded", status: existing.status },
        { status: 409 },
      );
    }
    if (!escrowId) {
      const { data: created, error: insErr } = await admin
        .from("escrows")
        .insert({
          contract_id: contractId,
          status: "awaiting_funds",
          amount_cents: breakdown.amountCents,
          currency,
          platform_fee_cents: breakdown.platformFeeCents,
          deadline_at: deadlineAt,
        })
        .select("id")
        .single();
      if (insErr) throw insErr;
      escrowId = created.id;
    } else {
      // Keep the amounts in sync in case terms changed before funding.
      await admin
        .from("escrows")
        .update({ amount_cents: breakdown.amountCents, platform_fee_cents: breakdown.platformFeeCents, currency, deadline_at: deadlineAt })
        .eq("id", escrowId);
    }

    const gig = contract.gig as { title?: string } | { title?: string }[] | null;
    const gigTitle = (Array.isArray(gig) ? gig[0]?.title : gig?.title) || "your collaboration";
    const origin = new URL(req.url).origin;
    const meta = { kind: "escrow_funding", escrow_id: escrowId!, contract_id: contractId };

    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      customer_email: user.email || undefined,
      line_items: [
        {
          quantity: 1,
          price_data: {
            currency: currency.toLowerCase(),
            unit_amount: breakdown.amountCents,
            product_data: {
              name: `Escrow — ${gigTitle}`,
              description: `Held by Seshn until you approve delivery (or the approval window passes). @${collab.username} receives the fee on release.`,
            },
          },
        },
      ],
      payment_intent_data: {
        metadata: meta,
        transfer_group: `escrow_${escrowId}`,
        description: `Seshn escrow ${escrowId}`,
      },
      metadata: meta,
      success_url: `${origin}/contract/${contractId}/fund?status=funded&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${origin}/contract/${contractId}/fund?status=cancelled`,
    });

    return NextResponse.json({ url: session.url });
  } catch (e) {
    console.error("[stripe] escrow fund error", e);
    return NextResponse.json({ error: "Something went wrong. Please try again." }, { status: 500 });
  }
}
