// Best-practices content for /guides. Static, curated playbooks for getting the
// most out of Seshn. Edit copy here; the page renders from this module.

export interface GuideTip {
  h: string;
  p: string;
}
export interface Guide {
  id: string;
  icon: string;
  title: string;
  audience: string; // who it's for
  summary: string;
  tips: GuideTip[];
}

export const GUIDES: Guide[] = [
  {
    id: "win-applications",
    icon: "🎯",
    title: "Get your application accepted",
    audience: "For collaborators applying to briefs",
    summary:
      "Owners skim fast and judge on signal, not length. Lead with proof, answer the brief, and make it effortless to say yes.",
    tips: [
      { h: "Lead with the work, not the bio", p: "Open with one link that directly fits the brief, a track in the same genre and role. The owner should hear why you're right in the first 15 seconds, before reading a word." },
      { h: "Answer the actual brief", p: "Reference the specific role, genre, and deadline they posted. A tailored two-line pitch beats a generic paragraph every time. It shows you read the brief and you're up for this one specifically." },
      { h: "Show you can hit the deadline", p: "Say it plainly: ‘I can deliver the two stems by the 14th.’ Missing a deadline is the thing owners worry about most. Take the doubt off the table early." },
      { h: "Attach a relevant sample", p: "Use the attachment to include a short, on-point clip or a one-pager. Don't make them dig through your whole catalogue to find the relevant thing." },
      { h: "Be specific about deliverables", p: "‘Mixed + mastered chorus, 24-bit WAV, two revisions included’ reads like a pro. Vague offers read like a maybe." },
      { h: "Apply early, keep it tight", p: "Early applications get read while the owner is still excited. Three sharp sentences land better than ten. Respect their time and they'll trust you with their record." },
    ],
  },
  {
    id: "great-listing",
    icon: "📝",
    title: "Write a brief that attracts great applicants",
    audience: "For owners posting a brief",
    summary:
      "The best people are selective. A clear, specific, fairly-paid brief with the role and comp stated up front gets you serious applicants instead of noise.",
    tips: [
      { h: "Be specific about the role", p: "‘Need a soul/RnB topline + lead vocal for a finished beat’ pulls the right people. ‘Looking for a singer’ pulls everyone. Specificity is a filter that works for you." },
      { h: "State the comp up front", p: "Paid, split, or trade, say it in the brief. Money stated up front kills the awkward DM negotiation and signals you're serious. Hidden comp is the #1 reason great collaborators skip a post." },
      { h: "Give a real deadline", p: "A concrete date (‘stems by July 1’) helps people self-select on availability and shows the project is real and moving." },
      { h: "Share a reference", p: "Drop a reference track or a rough demo. Hearing the vibe gets you applicants who genuinely fit, not ones guessing at your taste." },
      { h: "Define ‘done’", p: "Spell out the deliverable and format (e.g. ‘2 mixed stems, 48kHz WAV’). Clear scope means clean contracts, fewer revisions, and no end-of-project friction." },
      { h: "Boost when it's time-sensitive", p: "If you're on a deadline, Boost puts the brief at the top of every matched feed for 7 days and pushes it to your strongest matches." },
    ],
  },
  {
    id: "profile-that-books",
    icon: "🎚️",
    title: "Build a profile that gets you booked",
    audience: "For everyone",
    summary:
      "On Seshn the work speaks first. A profile that leads with audio, states what you do, and proves you're reliable turns views into bookings.",
    tips: [
      { h: "Pin your three strongest tracks", p: "Lead with range-defining work in the genres you want more of. The first thing someone hears should be the thing you want to be hired for." },
      { h: "Make your roles + skills explicit", p: "Tag the roles, genres, and skills you actually want work in. Discovery is tag-based. If it's not listed, you won't show up in the right searches." },
      { h: "Add a photo and a one-line bio", p: "A face and a single sharp line (‘LA mix engineer, indie + pop, fast turnarounds’) builds instant trust. Skip the essay." },
      { h: "Connect Spotify / SoundCloud", p: "Linked accounts make your profile a portfolio people can press play on, and lend outside credibility to your work." },
      { h: "Set your availability", p: "‘Open to work’ vs ‘booked’ tells owners whether to reach out now, and keeps you out of conversations you can't take." },
      { h: "Bank a few verified ratings", p: "Complete a couple of deals early. Ratings come only from real, finished sessions. A 4.9 next to your name outranks any follower count." },
    ],
  },
  {
    id: "pricing-and-pay",
    icon: "💸",
    title: "Pricing & getting paid",
    audience: "For everyone",
    summary:
      "Seshn is one flat 10% on paid bookings (Stripe fees included), with funds held in escrow until the work's approved. Price with confidence and get paid cleanly.",
    tips: [
      { h: "Set up payouts before you need them", p: "Connect your bank in Settings → Payouts. An owner can't fund an escrow to you until your payout account is verified, so do it once, up front." },
      { h: "Price the outcome, not the hour", p: "Quote a clear deliverable price. ‘$300 for a mixed + mastered single, two revisions’ is easier to say yes to than an open-ended hourly." },
      { h: "Use escrow as a trust tool", p: "The owner funds first; the money sits safely in escrow; you deliver knowing it's secured; it releases on approval. It protects both sides, lean on it to win first-time clients." },
      { h: "Know your net", p: "On a paid booking you keep 90%. The flat 10% already covers card processing, so there's no surprise fee. Split and trade collaborations are free." },
      { h: "Mind the approval window", p: "After you mark work delivered, funds auto-release once the approval window passes if the owner doesn't act, so deadlines protect you, not just the client." },
      { h: "Keep money on-platform", p: "Escrow, ratings, and dispute resolution only protect you if the deal runs through Seshn. Taking it to a DM gives up every safety net." },
    ],
  },
  {
    id: "project-rooms",
    icon: "🎛️",
    title: "Run a tight project room",
    audience: "For active collaborations",
    summary:
      "One room per record keeps chat, stems, versions, and deadlines in one place, out of three group chats and a Drive folder.",
    tips: [
      { h: "Keep everything in the room", p: "Files, voice notes, decisions, all in the project room. The moment it scatters across DMs and email, things get lost and the timeline slips." },
      { h: "Comment on the timecode", p: "Drop notes anchored to the moment in the audio (‘bring the vocal up at 1:42’). Specific, timestamped feedback turns three revision rounds into one." },
      { h: "Version, don't overwrite", p: "Keep v1 / v2 / v3 so you can always roll back to the take you liked. Never overwrite the file everyone agreed on." },
      { h: "Agree the deliverable early", p: "Confirm format, count, and deadline at the start so ‘done’ means the same thing to everyone when it's time to release escrow." },
      { h: "Close the loop with a rating", p: "When you ship, leave an honest rating. It's how the next owner trusts your collaborator, and how the whole platform stays high-signal." },
    ],
  },
  {
    id: "trust-reputation",
    icon: "⭐",
    title: "Build trust & reputation",
    audience: "For everyone",
    summary:
      "Reputation compounds. On Seshn it's built from real sessions, not follower counts, and it's the single biggest driver of getting booked again.",
    tips: [
      { h: "Reply fast, even to say no", p: "Responsiveness is reputation. A quick ‘not a fit, good luck’ beats silence and keeps your name in good standing." },
      { h: "Under-promise, over-deliver", p: "Quote a deadline you can beat and a scope you can exceed. Delivering early with an extra alt-mix is how you turn a one-off into a regular." },
      { h: "Communicate when things slip", p: "Life happens. A heads-up before a deadline keeps trust intact; going quiet destroys it. Use the project room." },
      { h: "Collect rating dimensions", p: "Ratings break down into communication, timeliness, and musical fit. Be strong across all three, not just talent. That's what makes you a safe hire." },
      { h: "Refer people you've worked with", p: "Bringing in collaborators you trust grows your circle and your standing, and the refer-a-collaborator credit gives you both a month of Pro." },
    ],
  },
];
