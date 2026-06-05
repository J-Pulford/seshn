// Notifications data layer. Typed port of the notifications section of
// seshn-supabase.js.
import { getBrowserClient } from "./client";
import { getUser } from "./profiles";
import { updateProfile } from "./profiles";
import type { Notification } from "./types";

export async function listNotifications(opts: { limit?: number } = {}): Promise<Notification[]> {
  const sb = getBrowserClient();
  const u = await getUser();
  if (!u) return [];
  const res = await sb
    .from("notifications")
    .select(
      "id, kind, created_at, read_at, gig_id, application_id, conversation_id, meeting_id, contract_id, escrow_id, help_thread_id, " +
        "actor:profiles!actor_id(id, username, display_name, avatar_url), " +
        "gig:gigs!gig_id(id, title, role), " +
        "meeting:meetings!meeting_id(id, title, starts_at, status)",
    )
    .eq("user_id", u.id)
    .order("created_at", { ascending: false })
    .limit(opts.limit || 50);
  if (res.error) {
    console.error("[seshn] listNotifications error", res.error);
    return [];
  }
  return (res.data as unknown as Notification[]) || [];
}

export async function getUnreadNotificationCount(): Promise<number> {
  const sb = getBrowserClient();
  const u = await getUser();
  if (!u) return 0;
  const res = await sb
    .from("notifications")
    .select("id", { count: "exact", head: true })
    .eq("user_id", u.id)
    .is("read_at", null);
  if (res.error) {
    console.error("[seshn] getUnreadNotificationCount error", res.error);
    return 0;
  }
  return res.count || 0;
}

export async function markNotificationsRead(ids: string[]): Promise<void> {
  const sb = getBrowserClient();
  const u = await getUser();
  if (!u || !ids?.length) return;
  const res = await sb
    .from("notifications")
    .update({ read_at: new Date().toISOString() })
    .in("id", ids)
    .is("read_at", null);
  if (res.error) console.error("[seshn] markNotificationsRead error", res.error);
}

export async function markAllNotificationsRead(): Promise<void> {
  const sb = getBrowserClient();
  const u = await getUser();
  if (!u) return;
  const res = await sb
    .from("notifications")
    .update({ read_at: new Date().toISOString() })
    .eq("user_id", u.id)
    .is("read_at", null);
  if (res.error) console.error("[seshn] markAllNotificationsRead error", res.error);
}

// Subscribe to new notification rows for the current user. Returns unsubscribe.
export async function subscribeToNotifications(
  onInsert: (row: Notification) => void,
): Promise<() => void> {
  const sb = getBrowserClient();
  const u = await getUser();
  if (!u) return () => {};
  const channel = sb
    .channel("notifications:" + u.id)
    .on(
      "postgres_changes",
      { event: "INSERT", schema: "public", table: "notifications", filter: "user_id=eq." + u.id },
      (payload) => onInsert(payload.new as Notification),
    )
    .subscribe();
  return () => {
    sb.removeChannel(channel);
  };
}

// notification_prefs is owner-only (migration 0026 revoked the public read
// grant), so it's no longer part of the shared profile fetch. Read the caller's
// own prefs via the SECURITY DEFINER getter scoped to auth.uid().
export async function getMyNotificationPrefs(): Promise<Record<string, boolean>> {
  const { data, error } = await getBrowserClient().rpc("get_my_notification_prefs");
  if (error) throw error;
  return (data as Record<string, boolean>) || {};
}

export async function updateNotificationPrefs(prefs: Record<string, boolean>) {
  return updateProfile({ notification_prefs: prefs });
}
