// Connected accounts (Spotify / SoundCloud / etc.) — read side. Typed port of
// listConnectedAccounts from seshn-supabase.js. The Spotify OAuth connect flow
// and save/disconnect will be ported with the settings page.
import { getBrowserClient } from "./client";
import { getUser } from "./profiles";
import type { ConnectedAccount } from "./types";

export async function listConnectedAccounts(userId?: string): Promise<ConnectedAccount[]> {
  const sb = getBrowserClient();
  let uid = userId;
  if (!uid) {
    const u = await getUser();
    if (!u) return [];
    uid = u.id;
  }
  const res = await sb
    .from("connected_accounts")
    .select("*")
    .eq("user_id", uid)
    .order("connected_at", { ascending: true });
  if (res.error) {
    console.error("[seshn] listConnectedAccounts error", res.error);
    return [];
  }
  return (res.data as ConnectedAccount[]) || [];
}
