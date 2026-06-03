// Canonical vocabularies. During the prototype era these were copy-pasted into
// every page and drifted (the feed/browse filter bug, commit fef38d9). Here
// they live once; writers and filters both import them so they cannot diverge.
//
// NOTE: gigs and profiles currently use two different genre lists (a known
// follow-up in the MVP checklist). Both are captured here verbatim so the port
// is behaviour-preserving; unifying them is a separate product decision.

// ── Gigs (written by the post flow; filtered by the feed) ──────────────
export const GIG_ROLES = [
  "Vocalist", "Topline writer", "Producer", "Mixing eng.", "Drummer",
  "Bassist", "Songwriter", "Guitarist", "DJ", "Other",
] as const;
export type GigRole = (typeof GIG_ROLES)[number];

export const GIG_GENRES = [
  "Afrobeats", "R&B", "Soul", "Pop", "Hip-hop", "Indie", "Electronic", "Folk", "Jazz",
] as const;
export type GigGenre = (typeof GIG_GENRES)[number];

export const COMP_OPTIONS = [
  { id: "paid", label: "Paid", sub: "Fixed fee" },
  { id: "split", label: "Split", sub: "Royalty share" },
  { id: "trade", label: "Trade", sub: "Reciprocal work" },
  { id: "unpaid", label: "Unpaid", sub: "Portfolio piece" },
] as const;
export type CompType = (typeof COMP_OPTIONS)[number]["id"];

// ── Profiles (written by onboarding/profile edit; filtered by browse) ──
export const PROFILE_ROLES = [
  "Producer", "Vocalist", "Songwriter", "Rapper", "Mixing eng.", "Mastering",
  "Guitarist", "Drummer", "Bassist", "Keys", "DJ", "A&R",
] as const;
export type ProfileRole = (typeof PROFILE_ROLES)[number];

export const PROFILE_GENRES = [
  "Pop", "Hip-Hop", "R&B", "Afrobeats", "Soul", "Electronic", "House", "Techno",
  "Indie", "Rock", "Alt", "Jazz", "Country", "Latin", "Folk", "Ambient",
  "K-pop", "Reggaeton", "Drill", "Funk",
] as const;
export type ProfileGenre = (typeof PROFILE_GENRES)[number];

// ── Showcase links (profile.social_links). Order = display order. ──────
// `host` is used to validate/normalise pasted URLs loosely (we don't hard-
// reject, just prepend https:// if missing).
export const SOCIAL_PLATFORMS = [
  { key: "spotify",    label: "Spotify",    placeholder: "https://open.spotify.com/artist/…" },
  { key: "soundcloud", label: "SoundCloud", placeholder: "https://soundcloud.com/you" },
  { key: "youtube",    label: "YouTube",    placeholder: "https://youtube.com/@you" },
  { key: "instagram",  label: "Instagram",  placeholder: "https://instagram.com/you" },
  { key: "facebook",   label: "Facebook",   placeholder: "https://facebook.com/you" },
  { key: "twitter",    label: "X / Twitter", placeholder: "https://x.com/you" },
] as const;
export type SocialPlatform = (typeof SOCIAL_PLATFORMS)[number]["key"];

// ── Availability (profile.availability) ────────────────────────────────
export const AVAILABILITY_OPTIONS = [
  { id: "open",      label: "Open to work",   dot: "var(--accent)" },
  { id: "selective", label: "Selective",      dot: "#f6a635" },
  { id: "booked",    label: "Booked / busy",  dot: "var(--ink-3)" },
] as const;
