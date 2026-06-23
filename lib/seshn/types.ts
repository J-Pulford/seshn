// Database row types, mirroring the Supabase schema in supabase/migrations.
// Hand-maintained for now; can be replaced by `supabase gen types` output later.

import type { CompType } from "./constants";

export type GigStatus = "draft" | "open" | "closed";

/** Showcase links keyed by platform (see SOCIAL_PLATFORMS in constants). */
export type SocialLinks = Partial<Record<
  "spotify" | "soundcloud" | "youtube" | "instagram" | "facebook" | "twitter",
  string
>>;

/** A profile gallery photo. */
export interface GalleryItem {
  url: string;
  caption?: string;
}

/** A discography / "worked with" credit. */
export interface Credit {
  title: string;
  role?: string;
  year?: string;
  link?: string;
}

/** A featured inline player (Spotify/SoundCloud/YouTube). */
export interface FeaturedItem {
  url: string;
  title?: string;
}

/** A service the member offers (informational; "book" wires to Stripe later). */
export interface Service {
  title: string;
  price?: string;
  unit?: string;
  description?: string;
}

/** public_profile_stats() RPC result. */
export interface ProfileStats {
  gigs_posted: number;
  collaborations: number;
  rating_avg: number | null;
  rating_count: number;
}

export interface Review {
  id: string;
  contract_id: string;
  reviewer_id: string;
  reviewee_id: string;
  rating: number;
  body: string;
  created_at: string;
  reviewer?: { id: string; username: string; display_name: string; avatar_url: string; is_pro?: boolean } | null;
}

/** Per-currency financial totals (cents) from my_financial_summary(). */
export interface CurrencyTotals {
  currency: string;
  earned_cents: number;
  pending_cents: number;
  spent_cents: number;
  fees_cents: number;
  paid_deals: number;
}

/** my_financial_summary() RPC result. */
export interface FinancialSummary {
  authenticated: boolean;
  currencies: CurrencyTotals[];
  active_contracts: number;
  completed_deals: number;
  total_deals: number;
}

/** A row in the finances dashboard's recent-activity list. */
export interface TransactionRow {
  id: string;
  amount_cents: number;
  platform_fee_cents: number;
  currency: string;
  status: string;
  created_at: string;
  funded_at: string | null;
  released_at: string | null;
  role: "earning" | "spending";
  counterparty?: { username: string; display_name: string; avatar_url: string } | null;
  gig_title?: string | null;
}

export type Availability = "open" | "selective" | "booked";

export interface Profile {
  id: string;
  username: string;
  display_name: string;
  bio: string;
  location: string;
  pronouns: string;
  roles: string[];
  genres: string[];
  is_pro: boolean;
  has_producer_badge?: boolean;
  is_staff?: boolean;
  avatar_url: string;
  cover_url?: string;
  notification_prefs?: Record<string, boolean>;
  // 0021 additions (showcase): owner-editable, public-readable.
  social_links?: SocialLinks;
  gallery?: GalleryItem[];
  credits?: Credit[];
  availability?: Availability | null;
  // 0022 additions (showcase, round 2).
  featured?: FeaturedItem[];
  skills?: string[];
  influences?: string[];
  languages?: string[];
  services?: Service[];
  // 0012 additions (escrow / trust & safety); optional on read.
  stripe_account_id?: string | null;
  stripe_account_status?: "pending" | "verified" | "restricted" | null;
  locale?: string;
  restrictions?: Record<string, string>;
  created_at: string;
  updated_at: string;
}

/** Options for looking up a single profile. */
export interface GetProfileOpts {
  id?: string;
  username?: string;
}

/** Trimmed profile as embedded on a gig's owner join. */
export interface GigOwner {
  id: string;
  username: string;
  display_name: string;
  is_pro: boolean;
  has_producer_badge?: boolean;
  avatar_url: string;
  location?: string;
  roles?: string[];
}

export interface Gig {
  id: string;
  owner_id: string;
  title: string;
  description: string;
  role: string;
  genres: string[];
  comp: CompType;
  pay_amount: number | null;
  pay_currency: string;
  deadline: string | null;
  location: string;
  status: GigStatus;
  cover_url?: string | null;
  boosted_until: string | null;
  created_at: string;
  updated_at: string;
  owner?: GigOwner;
}

export type ApplicationStatus = "pending" | "accepted" | "rejected" | "withdrawn";

export interface Application {
  id: string;
  gig_id: string;
  applicant_id: string;
  pitch: string;
  attachment_url: string | null;
  status: ApplicationStatus;
  created_at: string;
  updated_at: string;
}

export interface Conversation {
  id: string;
  user_a: string;
  user_b: string;
  created_at: string;
  last_message_at: string | null;
  last_message_preview: string | null;
  last_message_sender: string | null;
}

export interface Message {
  id: string;
  conversation_id: string;
  sender_id: string;
  body: string;
  created_at: string;
  // 0009_dm_attachments (optional)
  attachment_url?: string | null;
  attachment_name?: string | null;
  attachment_kind?: "audio" | "file" | null;
  attachment_size_bytes?: number | null;
  attachment_duration_ms?: number | null;
  attachment_mime?: string | null;
}

export type ContractStatus = "draft" | "awaiting_signatures" | "active" | "completed" | "cancelled";

export interface Contract {
  id: string;
  gig_id: string | null;
  application_id: string | null;
  owner_id: string;
  collaborator_id: string;
  origin: "gig" | "direct";
  proposed_by: string;
  conversation_id: string | null;
  status: ContractStatus;
  terms: Record<string, unknown>;
  governing_law: string | null;
  language: string | null;
  signing_provider_ref: string | null;
  pdf_url: string | null;
  owner_signed_at: string | null;
  collaborator_signed_at: string | null;
  fully_signed_at: string | null;
  created_at: string;
  updated_at: string;
  owner?: GigOwner & { location?: string; stripe_country?: string | null };
  collaborator?: GigOwner & { location?: string; stripe_country?: string | null };
  gig?: { id: string; title: string; role: string; genres?: string[]; comp?: string; pay_amount?: number | null; pay_currency?: string };
}

export type ReportTarget = "user" | "gig";
export type ReportStatus = "open" | "reviewing" | "actioned" | "dismissed";

export interface Report {
  id: string;
  reporter_id: string;
  target_type: ReportTarget;
  target_user_id: string | null;
  target_gig_id: string | null;
  reason: string;
  details: string;
  status: ReportStatus;
  created_at: string;
}

export interface Block {
  blocker_id: string;
  blocked_id: string;
  created_at: string;
}

/** Conversation decorated with the other participant + unread flag. */
export interface ConversationWithMeta extends Conversation {
  user_a_profile?: GigOwner;
  user_b_profile?: GigOwner;
  other?: GigOwner;
  unread?: boolean;
  me_id?: string;
}

export interface Notification {
  id: string;
  kind: string;
  created_at: string;
  read_at: string | null;
  gig_id: string | null;
  application_id: string | null;
  conversation_id: string | null;
  meeting_id?: string | null;
  contract_id?: string | null;
  escrow_id?: string | null;
  help_thread_id?: string | null;
  actor?: { id: string; username: string; display_name: string; avatar_url: string } | null;
  gig?: { id: string; title: string; role: string } | null;
  meeting?: { id: string; title: string; starts_at: string; status: string } | null;
}

export type HelpCategory = "question" | "bug" | "feedback" | "feature_request" | "general";
export type HelpStatus = "open" | "answered" | "closed";

export interface HelpAuthor {
  id: string;
  username: string;
  display_name: string;
  avatar_url: string;
}

export interface HelpThread {
  id: string;
  author_id: string;
  category: HelpCategory;
  title: string;
  body: string;
  status: HelpStatus;
  pinned: boolean;
  reply_count: number;
  last_activity_at: string;
  created_at: string;
  updated_at: string;
  author?: HelpAuthor | null;
}

export interface HelpReply {
  id: string;
  thread_id: string;
  author_id: string;
  body: string;
  is_staff_reply: boolean;
  created_at: string;
  author?: HelpAuthor | null;
}

export type MeetingStatus = "proposed" | "confirmed" | "declined" | "cancelled" | "completed";

export interface Meeting {
  id: string;
  conversation_id: string | null;
  contract_id: string | null;
  organizer_id: string;
  invitee_id: string;
  title: string;
  agenda: string;
  location: string;
  meeting_url: string;
  starts_at: string;
  ends_at: string;
  status: MeetingStatus;
  created_at: string;
  updated_at: string;
}

export interface ConnectedAccount {
  user_id: string;
  provider: string;
  display_name: string | null;
  profile_url: string | null;
  stats: { followers?: number } | null;
  connected_at: string;
}

/** A DM attachment descriptor (return of uploadDmAttachment). */
export interface DmAttachment {
  url: string | undefined;
  name: string;
  kind: "audio" | "file";
  size_bytes: number;
  duration_ms: number | null;
  mime: string;
}
