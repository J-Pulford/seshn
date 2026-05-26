# 03 — Communication templates

Pre-baked replies for the most common situations. **Adapt the wording to the specific ticket** — don't copy verbatim. The signoff is always "Seshn support" (never an individual name unless the founder OKs it).

Fill in `[brackets]` with details from the ticket and your investigation.

## Acknowledge first contact (within 1 hour of ticket arriving)

> Hi [first name],
>
> Got your message about [one-line summary of issue]. I'm looking into it now and will come back to you with an answer within [4 hours / by end of day / first thing tomorrow]. Thanks for the patience.
>
> Seshn support

Use this only when you can't fully resolve in the same reply. The point is to stop the user from sending three follow-ups.

## "I confirmed your issue and here's what's happening"

> Hi [name],
>
> Thanks for flagging this. I've checked your account and I can confirm what you're seeing: [one-line explanation of the actual issue, in plain English — not in jargon].
>
> [What you've done OR what they should do next.]
>
> [Time estimate or next step.]
>
> Let me know if you hit anything else.
>
> Seshn support

## "I couldn't reproduce — need more info"

> Hi [name],
>
> I tried to reproduce this on my end and the [feature] looks like it's working — which means I'm missing something about your situation. To dig in, could you let me know:
>
> - What browser and device you're on (e.g. Chrome on iPhone, Safari on MacBook)?
> - The exact step where it goes wrong — ideally a screenshot if you're up for it?
> - The time (with timezone) when you last saw the issue?
>
> Once I have those I can usually nail it down quickly. Thanks for working with me on this.
>
> Seshn support

## "Working as designed" — be careful with this one

Only use when the user expected behaviour that isn't built. Never use this for an actual bug.

> Hi [name],
>
> Thanks for the question. The way Seshn handles this right now is [explain the actual behaviour briefly and why it works that way — e.g. "applications stay visible to you forever, even after the gig closes, so you can keep a record of what you applied to"]. So what you're seeing is intentional.
>
> That said, [acknowledge their underlying need]. If you'd find it useful for [feature] to work differently, drop me a line back with what you'd want — those notes go straight to the product roadmap.
>
> Seshn support

## "We're aware and working on it"

For known bugs already in the backlog. Don't promise dates unless engineering already gave one.

> Hi [name],
>
> Thanks for flagging — you've actually hit a known issue we're already working on. [One sentence on what the issue is.] We don't have a precise ETA on the fix yet, but I'll personally come back to you here once it ships.
>
> In the meantime, the workaround is [workaround], if that helps.
>
> Sorry for the friction. We'll get there.
>
> Seshn support

## Application accepted but no notification

> Hi [name],
>
> Good news first — I checked and your application to "[gig title]" was indeed accepted on [date]. So you're in.
>
> The notification didn't reach you because [actual cause from your investigation]. I've [what you did to fix it / what you'll do]. You should also see the accepted application in your **My applications** page right now — can you double-check it's showing there?
>
> Seshn support

## Avatar / image upload failing

> Hi [name],
>
> Thanks for sending the screenshot. The upload looks like it's hitting [actual cause]. A few things to try in order:
>
> 1. Make sure the image is under 5 MB and is a JPG, PNG, WebP or GIF.
> 2. Try a different browser if you can — Chrome on desktop is the most reliable.
> 3. If it still fails, send me the image as an attachment to this email and I'll upload it manually for you.
>
> Seshn support

## Lost access to email (sign-in problem)

🚨 **Do not change a user's email without strong identity verification.** When in doubt, escalate to founder.

> Hi [name],
>
> To recover access we need to confirm you're the account holder. Could you reply from a device you've previously signed in from, and include:
>
> - The username on the account
> - An approximate date you joined (month and year is fine)
> - The email you're trying to recover access to
> - Any other detail that only you would know (a gig you posted, a collaborator you matched with, etc.)
>
> Once I can confirm, I'll get you back in.
>
> Seshn support

## Gig not showing up in the feed

> Hi [name],
>
> Checked your gig "[gig title]" and I can see it's [posted on date / status]. A few reasons it might not be showing in the feed:
>
> - The feed filters might be excluding it. Try removing all filters and search by your username — you should see it.
> - If the gig is **closed** or **draft**, it won't be in the public feed by design.
> - There's a brief delay after posting before it surfaces in everyone's feed (usually under a minute).
>
> If you've ruled all those out, send me a screenshot of your feed page and I'll dig deeper.
>
> Seshn support

## Two people are mid-collaboration, one is unresponsive

A common one: collaborator hasn't replied for 5+ days, owner is worried about their money.

> Hi [name],
>
> Sorry for the frustration. A few things on this:
>
> If you're in a contract that hasn't been funded yet, you can cancel it from the contract page (look for **Cancel contract** in the sidebar). That voids the agreement and you're free to find someone else.
>
> If you've already funded the escrow, the funds stay safe — they don't get released to [other party] unless they actually deliver the work. If the deadline passes without delivery, you can request a refund and we'll process it.
>
> In either case, you're not stuck. Tell me which situation you're in (or send me the contract link) and I'll walk you through the next step.
>
> Seshn support

## Sensitive: account deletion request

🚨 **For EU/UK/AU/CA users this is a legal obligation, not a courtesy.** See `10-compliance.md`.

> Hi [name],
>
> Got your request to close your account. Before I action it, two things to flag:
>
> 1. **Active contracts.** I'm checking whether you have any open contracts or unsettled escrows. Account deletion can't proceed until those are wound down, since both parties need to be able to access the agreement and any held funds. I'll come back to you with what (if anything) needs settling first.
>
> 2. **What gets deleted.** Your profile, applications, gigs, messages, connected accounts, and notifications get removed within 30 days. Some records — specifically transaction logs and audit trails for contracts you signed — are retained for [retention period] for legal/tax compliance, but they're anonymised where possible. [Add Australian Privacy Principles / GDPR specifics from compliance SOP.]
>
> 3. **Reversibility.** Once it's done, it can't be undone. If you're considering it for a specific reason that we could fix (a bad experience, a feature missing, etc), let me know — we'd rather make it right than lose you.
>
> Reply to confirm and I'll start the process.
>
> Seshn support

## When to apologise — and when not to

**Apologise** when:
- We broke something (a bug, an outage, an email that went out by mistake)
- The user lost something irrecoverable (a contract row, a message, time)
- They had to wait longer than 24h for a first response

**Don't apologise** when:
- The user misunderstood how a feature works (acknowledge + explain instead)
- The user is rude or aggressive (acknowledge their frustration, don't take the bait)
- We made a deliberate product choice they're disagreeing with (we own the decision)

Bad: "I'm so sorry, unfortunately the platform doesn't support that."
Better: "That's not something Seshn does today — here's why, and here's the closest thing we do have."
