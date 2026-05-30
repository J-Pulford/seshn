// Connected accounts (Spotify / SoundCloud / etc.) — read side. Typed port of
// listConnectedAccounts from seshn-supabase.js. The Spotify OAuth connect flow
// and save/disconnect will be ported with the settings page.
import { getBrowserClient } from "./client";
import { getUser } from "./profiles";
import type { ConnectedAccount } from "./types";

// Public Spotify client ID for the PKCE flow (no secret needed). Set
// NEXT_PUBLIC_SPOTIFY_CLIENT_ID in the env to enable; until then "Connect
// Spotify" errors gracefully.
const SPOTIFY_CLIENT_ID = process.env.NEXT_PUBLIC_SPOTIFY_CLIENT_ID ?? "";

function spotifyRedirectUri() {
  return window.location.origin + "/settings";
}
function randomString(len: number) {
  const arr = new Uint8Array(len);
  crypto.getRandomValues(arr);
  const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-._~";
  let out = "";
  for (let i = 0; i < arr.length; i++) out += alphabet[arr[i] % alphabet.length];
  return out;
}
async function sha256Base64Url(input: string) {
  const bytes = new TextEncoder().encode(input);
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  const b64 = btoa(String.fromCharCode(...new Uint8Array(digest)));
  return b64.replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

// PKCE: stash verifier + CSRF state, then redirect to Spotify. The user lands
// back on /settings with ?code & ?state for completeSpotifyConnect.
export async function startSpotifyConnect() {
  if (!SPOTIFY_CLIENT_ID) throw new Error("Spotify is not configured yet — set NEXT_PUBLIC_SPOTIFY_CLIENT_ID.");
  const verifier = randomString(96);
  const state = randomString(32);
  const challenge = await sha256Base64Url(verifier);
  sessionStorage.setItem("seshn_spotify_verifier", verifier);
  sessionStorage.setItem("seshn_spotify_state", state);
  const params = new URLSearchParams({
    client_id: SPOTIFY_CLIENT_ID,
    response_type: "code",
    redirect_uri: spotifyRedirectUri(),
    scope: "user-read-private user-read-email user-top-read",
    code_challenge_method: "S256",
    code_challenge: challenge,
    state,
  });
  window.location.href = "https://accounts.spotify.com/authorize?" + params.toString();
}

interface SpotifyMe {
  id: string;
  display_name?: string;
  country?: string;
  product?: string;
  followers?: { total: number };
  external_urls?: { spotify?: string };
}

export async function completeSpotifyConnect(code: string, state: string) {
  const verifier = sessionStorage.getItem("seshn_spotify_verifier");
  const expectedState = sessionStorage.getItem("seshn_spotify_state");
  sessionStorage.removeItem("seshn_spotify_verifier");
  sessionStorage.removeItem("seshn_spotify_state");
  if (!verifier) throw new Error("Spotify connection expired — try again.");
  if (!expectedState || expectedState !== state) throw new Error("Spotify state mismatch — try again.");

  const tokenRes = await fetch("https://accounts.spotify.com/api/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "authorization_code",
      code,
      redirect_uri: spotifyRedirectUri(),
      client_id: SPOTIFY_CLIENT_ID,
      code_verifier: verifier,
    }).toString(),
  });
  if (!tokenRes.ok) throw new Error("Spotify token exchange failed: " + (await tokenRes.text()).slice(0, 200));
  const token = (await tokenRes.json()).access_token;
  if (!token) throw new Error("Spotify returned no access token.");

  const meRes = await fetch("https://api.spotify.com/v1/me", { headers: { Authorization: "Bearer " + token } });
  if (!meRes.ok) throw new Error("Couldn't read your Spotify profile.");
  const me: SpotifyMe = await meRes.json();

  let topGenres: string[] = [];
  try {
    const topRes = await fetch("https://api.spotify.com/v1/me/top/artists?limit=10&time_range=long_term", { headers: { Authorization: "Bearer " + token } });
    if (topRes.ok) {
      const top = await topRes.json();
      const counts: Record<string, number> = {};
      (top.items || []).forEach((a: { genres?: string[] }) => (a.genres || []).forEach((g) => { counts[g] = (counts[g] || 0) + 1; }));
      topGenres = Object.keys(counts).sort((a, b) => counts[b] - counts[a]).slice(0, 5);
    }
  } catch {
    /* genres optional */
  }

  return saveConnectedAccount({
    provider: "spotify",
    external_id: me.id,
    display_name: me.display_name || me.id,
    profile_url: me.external_urls?.spotify || null,
    stats: { followers: me.followers?.total ?? null, country: me.country || null, product: me.product || null, genres: topGenres },
  });
}

export async function saveConnectedAccount(fields: Record<string, unknown>) {
  const sb = getBrowserClient();
  const u = await getUser();
  if (!u) throw new Error("Not signed in");
  const res = await sb.from("connected_accounts").upsert({ user_id: u.id, ...fields }, { onConflict: "user_id,provider" }).select().single();
  if (res.error) throw res.error;
  return res.data;
}

export async function disconnectAccount(provider: string) {
  const sb = getBrowserClient();
  const u = await getUser();
  if (!u) throw new Error("Not signed in");
  const res = await sb.from("connected_accounts").delete().eq("user_id", u.id).eq("provider", provider);
  if (res.error) throw res.error;
  return true;
}

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
