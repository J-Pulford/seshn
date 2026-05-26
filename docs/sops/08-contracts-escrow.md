# 08 — Contracts & escrow

The contract signing flow + the escrow state machine. Some of this is live in code; Stripe Connect funding is forthcoming. Document the model now so the SOP doesn't lag behind.

🚨 **Anything that touches money is a founder-escalation by default.** Refunds, funded escrows in any state, payout disputes — never resolve solo.

## Contract lifecycle

```
draft (owner only) ──→ awaiting_signatures ──→ active ──→ completed
                              │
                              ├──(collab declines)──→ back to draft
                              └──(owner cancels)──→ cancelled
```

- `draft` — owner is filling out terms. Visible to owner + collaborator (collaborator sees a "still being drafted" banner).
- `awaiting_signatures` — owner clicked "Send". Both parties can now sign. Terms are locked.
- `active` — both signatures recorded. Triggers escrow funding step.
- `completed` — funds released, splits effective.
- `cancelled` — voided before funding.

## Escrow lifecycle

```
awaiting_funds ──→ funded ──→ delivered ──→ released
                      │           │
                      │           └──→ disputed (paused, manual review)
                      └──→ refunded (deadline missed)
                      └──→ cancelled (contract voided before delivery)
```

- All state transitions write to `audit_log`.
- Status is mirrored from Stripe via webhooks (when wired).
- `auto_release_at` is set when `delivered`; a daily cron releases when now() > auto_release_at.
- `deadline_at` is set when `funded`; a daily cron refunds when now() > deadline_at and no delivery.

## Scenario: "I signed the contract but it says I haven't"

**Check** the contract row:

```sql
select id, status, owner_id, collaborator_id,
       owner_signed_at, collaborator_signed_at, fully_signed_at
  from public.contracts
  where id = '[contract_uuid]';
```

| Their role | their signed_at column | What it means |
|---|---|---|
| Owner | `owner_signed_at` populated | Owner signed |
| Collab | `collaborator_signed_at` populated | Collab signed |

If their column is populated, the sign worked. Check `audit_log`:

```sql
select id, created_at, action, payload->>'role' as role, payload
  from public.audit_log
  where target_table = 'contracts' and target_id = '[contract_uuid]'
  order by id;
```

Should show `contract_signed` rows for each signer, and `contract_fully_signed` when both signed.

**If their column is null**, the sign didn't go through. Possible causes:

1. They clicked the button but the request hit a network error.
2. They were trying to sign a contract that's not in `awaiting_signatures` state (e.g. it's still draft, or already active, or cancelled).
3. They were already-signed and clicked again — the function rejects double-signs.
4. The `sign_contract` RPC raised an exception. Check Database → Logs.

**Resolution**

For 1: tell them to retry from the contract page. The function is idempotent in the sense that re-signing after success will just error — there's no harm in retrying.

For 2: explain the state. If they think it should be `awaiting_signatures` but it isn't, investigate why it transitioned.

For 3: they're done — confirm to them they're signed.

For 4: 🚨 escalate.

## Scenario: "The other party hasn't signed and isn't responding"

The contract is stuck in `awaiting_signatures`. Two options for the impatient party:

- **Owner**: can cancel the contract from the contract page. Voids it cleanly; both parties can renegotiate later.
- **Collaborator**: cannot cancel (only the owner can). They can decline → contract goes back to `draft`, owner can edit terms and resend.

If the user wants us to "force" the other party to sign, the answer is no — we don't act on either party's behalf in a signing flow.

If they want us to nudge the other party, we don't do that either. Tell them to message the other party directly via DM.

## Scenario: "I funded an escrow but it says awaiting_funds"

🚨 **Money's involved — escalate immediately.** But while you're investigating, check the row:

```sql
select e.id, e.status, e.amount_cents, e.currency,
       e.stripe_payment_intent_id, e.funded_at,
       c.owner_id, c.collaborator_id
  from public.escrows e
  join public.contracts c on c.id = e.contract_id
  where e.id = '[escrow_uuid]';
```

If `stripe_payment_intent_id` is set but `status` is still `awaiting_funds`, the Stripe webhook didn't fire — or fired but our handler errored. Founder investigates via Stripe dashboard (Events → check the payment_intent.succeeded delivery status).

## Scenario: "I delivered but funds haven't released"

Check the escrow:

```sql
select id, status, delivered_at, released_at, auto_release_at
  from public.escrows
  where id = '[escrow_uuid]';
```

| Status | Diagnosis |
|---|---|
| `delivered` with `auto_release_at` in the future | Approval window still running. Tell them the auto-release date. |
| `delivered` with `auto_release_at` in the past | Cron didn't fire. 🚨 escalate. |
| `released` | Already released. They might be expecting money to land in their bank — that's a Stripe payout, takes 2–5 business days. |
| `disputed` | A dispute was opened. See below. |
| `funded` | No deliverable was logged yet. They might think they "delivered" but never marked it done in the UI. Check `deliverables` table. |

## Scenario: "I opened a dispute, what happens now?"

🚨 **Disputes are founder-handled.** Always escalate.

For info: check the dispute row:

```sql
select d.id, d.escrow_id, d.opened_by, p.username as opener_un,
       d.status, d.reason, d.opened_at, d.resolved_at,
       d.resolution
  from public.disputes d
  join public.profiles p on p.id = d.opened_by
  where d.id = '[dispute_uuid]';
```

When a dispute is open, the auto-release timer pauses. Funds stay in escrow. The founder reviews evidence, talks to both parties, and resolves to one of: release / refund / split.

Until then, the user-facing message is:

> Your dispute is in review. We hold the funds while we look at it. We aim to come back to you within 5 business days — sooner if it's straightforward. You'll get a notification when we have an update.

(Adjust the SLA per founder direction.)

## Scenario: "I want a refund"

🚨 **Escalate.** All refunds go through founder.

For info: figure out where the funds are.

```sql
select e.status, e.amount_cents, e.currency, e.funded_at, e.released_at
  from public.escrows e
  where contract_id = '[contract_uuid]';
```

| Status | Refund logic |
|---|---|
| `awaiting_funds` | Nothing to refund. Just cancel the contract. |
| `funded` | Easy — Stripe payment intent refund (full). Founder runs it. |
| `delivered` | Tricky — collaborator already delivered. Goes through dispute. |
| `released` | Hard — money is already in collaborator's account. Refund requires their cooperation. Goes through dispute. |
| `refunded` | Already refunded. Tell them. |

## Scenario: "I want to change the contract terms after sending"

You can't — by design. Once a contract is `awaiting_signatures`, terms are locked.

Two options:
- **Owner** cancels → renegotiate → new contract.
- **Collaborator** declines → contract goes back to `draft` → owner edits → re-sends.

Walk them through whichever applies.

## Scenario: "I uploaded a deliverable but the escrow still says funded"

The collaborator uploads files, but the escrow flips to `delivered` only when they explicitly hit "Mark as delivered". This is deliberate — they may want to upload multiple files before declaring done.

Check:

```sql
select id, kind, file_url is not null as has_file, submitted_at
  from public.deliverables
  where escrow_id = '[escrow_uuid]'
  order by submitted_at;
```

If files exist but `escrow.status = 'funded'`, they haven't clicked the "Mark as delivered" button yet.

## Investigation checklist for any contract/escrow ticket

1. Identify the contract (UUID).
2. Pull the contract row + the audit_log entries for it.
3. If escrow involved, pull the escrow row + its deliverables.
4. If Stripe involved, check Events in the Stripe dashboard for the `stripe_payment_intent_id`.
5. **If money has moved or is supposed to have moved, 🚨 escalate before any user-facing action.**
