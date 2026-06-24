// Analytics data layer. View recording is fire-and-forget (never block a page
// render on it); the read side goes through owner-scoped SECURITY DEFINER RPCs
// (0030) so the dashboard never touches another member's raw view rows.
import { getBrowserClient } from "./client";

// Record a profile / gig view. Self-views and failures are swallowed — the RPC
// drops self-views server-side, and a missed view should never surface an error.
export async function recordProfileView(profileId: string): Promise<void> {
  if (!profileId) return;
  try {
    await getBrowserClient().rpc("record_profile_view", { p_profile_id: profileId });
  } catch {
    /* analytics is best-effort */
  }
}

export async function recordGigView(gigId: string): Promise<void> {
  if (!gigId) return;
  try {
    await getBrowserClient().rpc("record_gig_view", { p_gig_id: gigId });
  } catch {
    /* analytics is best-effort */
  }
}

// Public, aggregate-only counts for a single gig (views + applicants), for
// social proof on the listing page. Returns zeros on any error so the UI can
// render unconditionally. See migration 0044 — the RPC exposes counts only.
export interface GigPublicStats {
  views: number;
  applications: number;
}

export async function getGigPublicStats(gigId: string): Promise<GigPublicStats> {
  const zero: GigPublicStats = { views: 0, applications: 0 };
  if (!gigId) return zero;
  try {
    const res = await getBrowserClient().rpc("gig_public_stats", { p_gig_id: gigId });
    if (res.error) return zero;
    const d = res.data as Partial<GigPublicStats> | null;
    return { views: Number(d?.views ?? 0), applications: Number(d?.applications ?? 0) };
  } catch {
    return zero;
  }
}

export interface ProfileAnalytics {
  window_days: number;
  views_total: number;
  views_window: number;
  views_prev_window: number;
  views_today: number;
  unique_viewers_window: number;
  series: { day: string; views: number }[];
  applications_received: number;
  gigs_open: number;
}

export interface ListingAnalytics {
  gig_id: string;
  title: string;
  role: string;
  status: string;
  created_at: string;
  views_total: number;
  views_window: number;
  applications: number;
  accepted: number;
  conversion_pct: number;
}

export async function getProfileAnalytics(days = 30): Promise<ProfileAnalytics | null> {
  const res = await getBrowserClient().rpc("my_profile_analytics", { p_days: days });
  if (res.error) {
    console.error("[seshn] getProfileAnalytics error", res.error);
    return null;
  }
  return (res.data as ProfileAnalytics) ?? null;
}

export async function getListingAnalytics(days = 30): Promise<ListingAnalytics[]> {
  const res = await getBrowserClient().rpc("my_listing_analytics", { p_days: days });
  if (res.error) {
    console.error("[seshn] getListingAnalytics error", res.error);
    return [];
  }
  return (res.data as ListingAnalytics[]) ?? [];
}

// Live "someone just viewed your profile" stream for the signed-in owner. Each
// insert under their profile_id arrives via the realtime publication (gated by
// the owner-read RLS policy). Returns an unsubscribe.
export async function subscribeProfileViews(profileId: string, onView: () => void): Promise<() => void> {
  const sb = getBrowserClient();
  if (!profileId) return () => {};
  const channel = sb
    .channel("profile_views:" + profileId)
    .on(
      "postgres_changes",
      { event: "INSERT", schema: "public", table: "profile_views", filter: "profile_id=eq." + profileId },
      () => onView(),
    )
    .subscribe();
  return () => {
    sb.removeChannel(channel);
  };
}
