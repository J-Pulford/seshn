"use client";

import { useEffect, useState } from "react";
import type { User } from "@supabase/supabase-js";
import Nav from "@/components/Nav";
import { requireProfile, signOut, updateMyEmail, deleteMyAccount } from "@/lib/seshn/auth";
import { updateNotificationPrefs } from "@/lib/seshn/notifications";
import { emitProfileUpdated } from "@/lib/seshn/profiles";
import { listConnectedAccounts, disconnectAccount, startSpotifyConnect, completeSpotifyConnect } from "@/lib/seshn/connected-accounts";
import { getPayoutStatus, startPayoutOnboarding, type PayoutStatus } from "@/lib/seshn/payments";
import type { ConnectedAccount, Profile } from "@/lib/seshn/types";
import "./settings.css";

type Status = { kind: "ok" | "err"; text: string } | null;

const NOTIF_KINDS: [string, string, string][] = [
  ["application_received", "New applications", "When someone applies to one of your gigs."],
  ["application_accepted", "Application accepted", "When a poster accepts your application."],
  ["application_rejected", "Application declined", "When a poster passes on your application."],
  ["message_received", "New messages", "When someone sends you a DM."],
];

const PROVIDERS = [
  { key: "spotify", label: "Spotify", available: true, blurb: "Show your followers and top genres as credibility on your profile." },
  { key: "soundcloud", label: "SoundCloud", available: false, blurb: "Coming soon — connect your SoundCloud once their API access lands." },
  { key: "instagram", label: "Instagram", available: false, blurb: "Coming soon — link your IG so collaborators see your reach." },
  { key: "youtube", label: "YouTube", available: false, blurb: "Coming soon — show your channel and subscriber count." },
];

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="card">
      <div className="section-title">{title}</div>
      {children}
    </div>
  );
}

function AccountSection({ user, profile }: { user: User; profile: Profile }) {
  const [newEmail, setNewEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState<Status>(null);
  const trimmed = newEmail.trim();
  const isValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed) && trimmed.toLowerCase() !== (user.email || "").toLowerCase();

  async function changeEmail() {
    if (!isValid || busy) return;
    setBusy(true);
    setStatus(null);
    try {
      await updateMyEmail(trimmed);
      setStatus({ kind: "ok", text: "Confirmation links sent — check both your current and new inboxes. The change takes effect after you confirm." });
      setNewEmail("");
    } catch (e) {
      setStatus({ kind: "err", text: (e as Error)?.message || "Couldn't update email." });
    } finally {
      setBusy(false);
    }
  }

  return (
    <Section title="Account">
      <div className="field" style={{ marginBottom: 16 }}>
        <span className="field-label">Current email</span>
        <div style={{ padding: "10px 12px", background: "var(--surface-2)", border: "1px solid var(--line)", borderRadius: 8, fontSize: 13, color: "var(--ink-2)" }}>
          {user.email || <span style={{ color: "var(--ink-3)", fontStyle: "italic" }}>No email on file</span>}
        </div>
      </div>
      <div className="field">
        <label className="field-label" htmlFor="se-email">Change email</label>
        <div style={{ display: "flex", gap: 8 }}>
          <input id="se-email" className="input" type="email" value={newEmail} onChange={(e) => setNewEmail(e.target.value)} placeholder="new@email.com" />
          <button className="btn primary" onClick={changeEmail} disabled={!isValid || busy}>{busy ? "Sending…" : "Send confirmation"}</button>
        </div>
        <span className="t-meta">You&apos;ll receive confirmation links at both your current and new addresses. The change only takes effect once you click the link.</span>
        {status && <div className={"status-line " + status.kind} style={{ marginTop: 6 }}>{status.text}</div>}
      </div>
      <div style={{ height: 1, background: "var(--line-soft)", margin: "18px 0" }} />
      <div className="row" style={{ padding: 0, borderTop: "none" }}>
        <div className="row-text"><span className="row-title">Profile</span><span className="row-sub">Name, bio, photo, roles and genres.</span></div>
        <a className="btn" href={`/profile/${encodeURIComponent(profile.username)}`}>Go to profile</a>
      </div>
      <div className="row">
        <div className="row-text"><span className="row-title">Sign out</span><span className="row-sub">End this session on this device.</span></div>
        <button className="btn" onClick={async () => { await signOut(); window.location.href = "/auth"; }}>Sign out</button>
      </div>
    </Section>
  );
}

function NotificationsSection({ profile, onSaved }: { profile: Profile; onSaved: (p: Profile) => void }) {
  const initial = profile.notification_prefs || {};
  const [prefs, setPrefs] = useState<Record<string, boolean>>(() => {
    const p: Record<string, boolean> = {};
    for (const [k] of NOTIF_KINDS) p[k] = initial[k] !== false;
    return p;
  });
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState<Status>(null);
  const dirty = NOTIF_KINDS.some(([k]) => (initial[k] !== false) !== prefs[k]);

  const toggle = (kind: string) => setPrefs((prev) => ({ ...prev, [kind]: !prev[kind] }));
  async function save() {
    if (!dirty || busy) return;
    setBusy(true);
    setStatus(null);
    try {
      const updated = await updateNotificationPrefs(prefs);
      onSaved(updated);
      setStatus({ kind: "ok", text: "Preferences saved." });
    } catch (e) {
      setStatus({ kind: "err", text: (e as Error)?.message || "Couldn't save." });
    } finally {
      setBusy(false);
    }
  }

  return (
    <Section title="Notifications">
      <span className="t-meta" style={{ display: "block", marginBottom: 4 }}>We won&apos;t insert notifications for kinds you turn off, so the bell stays quiet for them.</span>
      {NOTIF_KINDS.map(([k, title, sub]) => (
        <div key={k} className="row">
          <div className="row-text"><span className="row-title">{title}</span><span className="row-sub">{sub}</span></div>
          <button type="button" className={"toggle" + (prefs[k] ? " on" : "")} aria-pressed={!!prefs[k]} aria-label={(prefs[k] ? "Disable" : "Enable") + " " + title} onClick={() => toggle(k)} />
        </div>
      ))}
      <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, marginTop: 14, alignItems: "center" }}>
        {status && <span className={"status-line " + status.kind}>{status.text}</span>}
        <button className="btn primary" onClick={save} disabled={!dirty || busy}>{busy ? "Saving…" : "Save changes"}</button>
      </div>
    </Section>
  );
}

function ConnectedAccountsSection({ accounts, onChange }: { accounts: ConnectedAccount[]; onChange: () => void }) {
  const [busy, setBusy] = useState<Record<string, boolean>>({});
  const [err, setErr] = useState("");

  async function connectSpotify() {
    setErr("");
    try {
      await startSpotifyConnect();
    } catch (e) {
      setErr((e as Error)?.message || "Couldn't start Spotify connection.");
    }
  }
  async function disconnect(provider: string) {
    if (!window.confirm("Disconnect " + provider + "?")) return;
    setBusy((prev) => ({ ...prev, [provider]: true }));
    try {
      await disconnectAccount(provider);
      onChange();
    } catch (e) {
      setErr((e as Error)?.message || "Couldn't disconnect.");
    } finally {
      setBusy((prev) => ({ ...prev, [provider]: false }));
    }
  }
  function summary(acc?: ConnectedAccount) {
    if (!acc) return null;
    const s = (acc.stats || {}) as { followers?: number; product?: string };
    const parts: string[] = [];
    if (acc.display_name) parts.push(acc.display_name);
    if (s.followers != null) parts.push(s.followers.toLocaleString() + " followers");
    if (s.product) parts.push(s.product === "premium" ? "Premium" : "");
    return parts.filter(Boolean).join(" · ");
  }

  return (
    <Section title="Connected accounts">
      <span className="t-meta" style={{ display: "block", marginBottom: 4 }}>Connect your streaming and social accounts so collaborators can see your reach at a glance.</span>
      {PROVIDERS.map(({ key, label, available, blurb }) => {
        const acc = (accounts || []).find((a) => a.provider === key);
        const isBusy = !!busy[key];
        return (
          <div key={key} className="row">
            <div className="row-text">
              <span className="row-title">{label}{acc && <span className="pill" style={{ marginLeft: 8, background: "var(--accent-bg)", borderColor: "transparent", color: "var(--accent-d)", fontSize: 9 }}>Connected</span>}</span>
              <span className="row-sub">{acc ? summary(acc) : blurb}</span>
            </div>
            {acc ? (
              <div style={{ display: "flex", gap: 6 }}>
                {acc.profile_url && <a className="btn sm" href={acc.profile_url} target="_blank" rel="noopener noreferrer">View</a>}
                <button className="btn sm" onClick={() => disconnect(key)} disabled={isBusy}>{isBusy ? "…" : "Disconnect"}</button>
              </div>
            ) : available ? (
              <button className="btn primary sm" onClick={connectSpotify}>Connect</button>
            ) : (
              <button className="btn sm" disabled style={{ opacity: 0.55, cursor: "not-allowed" }}>Coming soon</button>
            )}
          </div>
        );
      })}
      {err && <div className="status-line err" style={{ marginTop: 10 }}>{err}</div>}
    </Section>
  );
}

function PayoutsSection() {
  const [status, setStatus] = useState<PayoutStatus | null>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  useEffect(() => {
    getPayoutStatus().then(setStatus).catch(() => setStatus({ configured: false }));
  }, []);
  async function connect() {
    setBusy(true);
    setErr("");
    try {
      await startPayoutOnboarding();
    } catch (e) {
      setErr((e as Error)?.message || "Couldn't start payout setup.");
      setBusy(false);
    }
  }
  return (
    <Section title="Payouts">
      <span className="t-meta" style={{ display: "block", marginBottom: 12 }}>
        Connect a payout account to get paid for gigs through Seshn. You always receive your full quoted rate —
        Seshn adds a small platform fee on top, paid by the client.
      </span>
      {status === null ? (
        <span className="t-meta">Loading…</span>
      ) : !status.configured ? (
        <span className="t-meta" style={{ fontStyle: "italic" }}>Payouts are coming soon.</span>
      ) : status.payouts_enabled ? (
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <span className="pill solid">✓ Payouts enabled</span>
          <button className="btn sm" onClick={connect} disabled={busy}>{busy ? "…" : "Manage on Stripe"}</button>
        </div>
      ) : status.connected ? (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          <span className="t-meta">Your payout setup is started but not finished{status.status === "restricted" ? " (Stripe needs more info)" : ""}.</span>
          <div><button className="btn primary sm" onClick={connect} disabled={busy}>{busy ? "…" : "Finish payout setup"}</button></div>
        </div>
      ) : (
        <div><button className="btn primary sm" onClick={connect} disabled={busy}>{busy ? "…" : "Set up payouts"}</button></div>
      )}
      {err && <div className="status-line err" style={{ marginTop: 10 }}>{err}</div>}
    </Section>
  );
}

function DangerSection({ profile }: { profile: Profile }) {
  const [confirmText, setConfirmText] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const expected = "delete " + profile.username;
  const matched = confirmText.trim().toLowerCase() === expected.toLowerCase();

  async function doDelete() {
    if (!matched || busy) return;
    if (!window.confirm("Final check: this permanently deletes your account, profile, gigs, applications, and conversations. There is no undo. Continue?")) return;
    setBusy(true);
    setErr("");
    try {
      await deleteMyAccount();
      window.location.href = "/";
    } catch (e) {
      setErr((e as Error)?.message || "Couldn't delete the account. Please contact support.");
      setBusy(false);
    }
  }

  return (
    <div className="card danger">
      <div className="section-title" style={{ color: "var(--danger)" }}>Danger zone</div>
      <span className="t-meta" style={{ display: "block", marginBottom: 12 }}>Permanently delete your account. This removes your profile, gigs (and applications to them), conversations and messages, and all notifications. There is no recovery.</span>
      <div className="field">
        <label className="field-label" htmlFor="se-confirm">Type <code style={{ background: "var(--danger-bg)", padding: "1px 5px", borderRadius: 3, fontSize: 12, color: "var(--danger)" }}>{expected}</code> to confirm</label>
        <input id="se-confirm" className="input" value={confirmText} onChange={(e) => setConfirmText(e.target.value)} placeholder={expected} autoComplete="off" />
      </div>
      <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 14 }}>
        <button className="btn danger" onClick={doDelete} disabled={!matched || busy}>{busy ? "Deleting…" : "Delete my account"}</button>
      </div>
      {err && <div className="status-line err" style={{ marginTop: 10 }}>{err}</div>}
    </div>
  );
}

export default function SettingsPage() {
  const [state, setState] = useState<{ status: "loading" | "ready"; user: User | null; profile: Profile | null }>({ status: "loading", user: null, profile: null });
  const [accounts, setAccounts] = useState<ConnectedAccount[]>([]);
  const [connectStatus, setConnectStatus] = useState<Status>(null);

  async function refreshAccounts(userId: string) {
    setAccounts(await listConnectedAccounts(userId));
  }

  useEffect(() => {
    (async () => {
      const r = await requireProfile();
      if (!r || !r.user || !r.profile) return;
      const user = r.user;
      setState({ status: "ready", user, profile: r.profile });
      refreshAccounts(user.id);

      const params = new URLSearchParams(window.location.search);
      const code = params.get("code");
      const oauthState = params.get("state");
      if (code && oauthState) {
        const clean = new URL(window.location.href);
        ["code", "state", "error"].forEach((k) => clean.searchParams.delete(k));
        window.history.replaceState({}, "", clean.toString());
        setConnectStatus({ kind: "ok", text: "Finishing Spotify connection…" });
        try {
          await completeSpotifyConnect(code, oauthState);
          await refreshAccounts(user.id);
          setConnectStatus({ kind: "ok", text: "Spotify connected — your stats now show on your profile." });
        } catch (e) {
          setConnectStatus({ kind: "err", text: (e as Error)?.message || "Spotify connection failed." });
        }
      } else if (params.get("error")) {
        setConnectStatus({ kind: "err", text: "Spotify connection was cancelled or denied." });
        const clean = new URL(window.location.href);
        ["error", "state", "error_description"].forEach((k) => clean.searchParams.delete(k));
        window.history.replaceState({}, "", clean.toString());
      }
    })();
  }, []);

  function onProfileUpdated(updated: Profile) {
    setState((s) => ({ ...s, profile: updated }));
    emitProfileUpdated(updated);
  }

  if (state.status === "loading" || !state.user || !state.profile) {
    return (
      <div>
        <Nav active={null} />
        <div className="settings-page"><span className="t-meta">Loading…</span></div>
      </div>
    );
  }

  return (
    <div>
      <Nav active={null} />
      <div className="settings-page">
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <h1 className="page-title">Settings</h1>
          <a className="btn sm" href={`/profile/${encodeURIComponent(state.profile.username)}`}>← Profile</a>
        </div>
        {connectStatus && <div className={"status-line " + connectStatus.kind}>{connectStatus.text}</div>}
        <AccountSection user={state.user} profile={state.profile} />
        <PayoutsSection />
        <ConnectedAccountsSection accounts={accounts} onChange={() => refreshAccounts(state.user!.id)} />
        <NotificationsSection profile={state.profile} onSaved={onProfileUpdated} />
        <DangerSection profile={state.profile} />
      </div>
    </div>
  );
}
