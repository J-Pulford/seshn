// Database row types, mirroring the Supabase schema in supabase/migrations.
// Hand-maintained for now; can be replaced by `supabase gen types` output later.

import type { CompType } from "./constants";

export type GigStatus = "draft" | "open" | "closed";

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
  avatar_url: string;
  cover_url?: string;
  notification_prefs?: Record<string, boolean>;
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
