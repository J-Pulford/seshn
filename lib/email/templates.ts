// Email content per notification kind. One bridge handles every notification
// row, so adding a kind here is all it takes to email it. Returns null for
// kinds we don't email.

export interface EmailContext {
  recipientName: string; // first name / username for the greeting
  actorName: string; // who did the thing ("Someone" if unknown)
  gigTitle: string; // "your collaboration" fallback
  threadTitle: string; // help thread title, if any
  url: string; // absolute deep link
  siteUrl: string; // https://www.seshnnn.com
}

interface Built {
  subject: string;
  heading: string;
  body: string;
  ctaLabel: string;
}

function build(kind: string, c: EmailContext): Built | null {
  switch (kind) {
    case "escrow_funded":
      return { subject: `Funds secured for ${c.gigTitle}`, heading: "You're clear to start 🎛️", body: `The owner has funded the escrow for <strong>${esc(c.gigTitle)}</strong>. The money is held safely by Seshn, start the work, and you'll be paid as soon as they approve the delivery.`, ctaLabel: "Open the contract" };
    case "escrow_delivered":
      return { subject: `${c.actorName} delivered work on ${c.gigTitle}`, heading: "Delivery is in, your move", body: `${esc(c.actorName)} marked the work delivered for <strong>${esc(c.gigTitle)}</strong>. Review it and approve to release the funds. If you do nothing, it auto-releases when the approval window ends.`, ctaLabel: "Review & approve" };
    case "escrow_released":
      return { subject: `You've been paid for ${c.gigTitle}`, heading: "Payment released 💸", body: `The escrow for <strong>${esc(c.gigTitle)}</strong> has been released to you. The payout lands in your bank in 2–5 business days.`, ctaLabel: "View the contract" };
    case "escrow_refunded":
      return { subject: `Escrow refunded for ${c.gigTitle}`, heading: "Escrow refunded", body: `The escrow for <strong>${esc(c.gigTitle)}</strong> has been refunded to you.`, ctaLabel: "View the contract" };
    case "escrow_disputed":
      return { subject: `A dispute was opened on ${c.gigTitle}`, heading: "A dispute was opened", body: `A dispute has been opened on <strong>${esc(c.gigTitle)}</strong>. The funds stay safely in escrow while the Seshn team reviews it, we'll be in touch.`, ctaLabel: "View the contract" };
    case "help_reply":
      return { subject: `${c.actorName} replied to your thread`, heading: "New reply on your thread", body: `${esc(c.actorName)} replied to your post${c.threadTitle ? ` <strong>“${esc(c.threadTitle)}”</strong>` : ""} on the Seshn help board.`, ctaLabel: "Read the reply" };
    case "review_received":
      return { subject: `${c.actorName} left you a review ⭐`, heading: "You got a new review", body: `${esc(c.actorName)} reviewed your collaboration on <strong>${esc(c.gigTitle)}</strong>. It's now live on your profile.`, ctaLabel: "See the review" };
    case "application_received":
      return { subject: `New application on ${c.gigTitle}`, heading: "You've got an application", body: `${esc(c.actorName)} applied to <strong>${esc(c.gigTitle)}</strong>. Take a look while it's fresh.`, ctaLabel: "View the application" };
    case "application_accepted":
      return { subject: `Your application was accepted 🎉`, heading: "You're in", body: `${esc(c.actorName)} accepted your application to <strong>${esc(c.gigTitle)}</strong>. Time to make a record.`, ctaLabel: "Open the gig" };
    case "application_rejected":
      return { subject: `Update on your application`, heading: "Not this time", body: `${esc(c.actorName)} passed on your application to <strong>${esc(c.gigTitle)}</strong>. Plenty more briefs where that came from.`, ctaLabel: "Find more gigs" };
    case "message_received":
      return { subject: `${c.actorName} sent you a message`, heading: "New message", body: `${esc(c.actorName)} sent you a message on Seshn.`, ctaLabel: "Open your inbox" };
    default:
      if (kind.startsWith("meeting_")) {
        return { subject: `Meeting update from ${c.actorName}`, heading: "Meeting update", body: `${esc(c.actorName)} updated a meeting with you.`, ctaLabel: "View in your inbox" };
      }
      return null;
  }
}

function esc(s: string): string {
  return String(s || "").replace(/[&<>"]/g, (ch) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[ch] as string);
}

function layout(c: EmailContext, b: Built): { html: string; text: string } {
  const html = `<!doctype html><html><body style="margin:0;background:#f6f6f4;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;color:#1a1a1a;">
  <div style="max-width:520px;margin:0 auto;padding:32px 20px;">
    <div style="font-weight:800;font-size:18px;letter-spacing:-0.02em;margin-bottom:24px;color:#0a0a0a;">Seshn</div>
    <div style="background:#fff;border:1px solid #e9e9e6;border-radius:16px;padding:28px;">
      <h1 style="font-size:20px;margin:0 0 14px;letter-spacing:-0.01em;">${esc(b.heading)}</h1>
      <p style="font-size:15px;line-height:1.6;color:#3a3a3a;margin:0 0 22px;">Hi ${esc(c.recipientName)},<br/>${b.body}</p>
      <a href="${esc(c.url)}" style="display:inline-block;background:#10b981;color:#062c19;text-decoration:none;font-weight:700;font-size:14px;padding:12px 20px;border-radius:10px;">${esc(b.ctaLabel)} →</a>
    </div>
    <p style="font-size:12px;color:#9a9a96;line-height:1.6;margin:20px 4px 0;">You're receiving this because you have a Seshn account. Manage email notifications in <a href="${esc(c.siteUrl)}/settings" style="color:#9a9a96;">Settings</a>.</p>
  </div></body></html>`;
  const text = `${b.heading}\n\nHi ${c.recipientName},\n${b.body.replace(/<[^>]+>/g, "")}\n\n${b.ctaLabel}: ${c.url}\n\n,  Seshn\nManage email notifications: ${c.siteUrl}/settings`;
  return { html, text };
}

// Returns null when this kind shouldn't be emailed.
export function notificationEmail(kind: string, c: EmailContext): { subject: string; html: string; text: string } | null {
  const b = build(kind, c);
  if (!b) return null;
  const { html, text } = layout(c, b);
  return { subject: b.subject, html, text };
}
