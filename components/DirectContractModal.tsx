"use client";

import { useState } from "react";
import { createDirectContract } from "@/lib/seshn/contracts";
import { SeshnContract } from "@/lib/contract-template";
import type { Service } from "@/lib/seshn/types";

interface Party {
  id: string;
  username?: string;
  display_name?: string;
}

// Pull a dollar figure out of a free-text service price like "$500", "500 AUD",
// "from 250". Returns a string of digits for the fee input, or "".
function priceToAmount(price?: string): string {
  if (!price) return "";
  const m = price.replace(/,/g, "").match(/\d+(\.\d+)?/);
  return m ? m[0] : "";
}

// Start a direct contract (no gig) with another user, from a DM or a profile.
// Captures the essentials, creates a draft via create_direct_contract, then
// hands off to /contract/[id] where the proposer refines terms (splits, format,
// approval window) and sends it for signing.
export default function DirectContractModal({
  open,
  onClose,
  counterparty,
  conversationId,
  theirServices,
  defaultProvider = false,
}: {
  open: boolean;
  onClose: () => void;
  counterparty: Party;
  conversationId?: string | null;
  theirServices?: Service[];
  defaultProvider?: boolean;
}) {
  const [iAmProvider, setIAmProvider] = useState(defaultProvider);
  const [fee, setFee] = useState("");
  const [currency, setCurrency] = useState("AUD");
  const [desc, setDesc] = useState("");
  const [deliverBy, setDeliverBy] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  if (!open) return null;
  const name = counterparty.display_name || counterparty.username || "this user";
  // Suggestions come from whichever side is the provider. We only have the
  // counterparty's services on hand, so show them when they're the provider.
  const suggestions = !iAmProvider ? theirServices || [] : [];

  async function submit() {
    setErr("");
    const feeCents = Math.round(parseFloat(fee || "0") * 100);
    if (!feeCents || feeCents < 100) { setErr("Fee must be at least $1."); return; }
    if (!desc.trim()) { setErr("Say what's being delivered."); return; }
    if (!deliverBy) { setErr("Pick a delivery date."); return; }
    setBusy(true);
    try {
      const terms = {
        fee_cents: feeCents,
        currency,
        deliverable: { description: desc.trim(), deliver_by: deliverBy },
        approval_window_days: 7,
      };
      const c = await createDirectContract(counterparty.id, iAmProvider, terms, conversationId, SeshnContract.version);
      window.location.href = `/contract/${encodeURIComponent(c.id)}`;
    } catch (e) {
      setErr((e as Error)?.message || "Could not create the contract.");
      setBusy(false);
    }
  }

  const segBtn = (active: boolean): React.CSSProperties => ({
    flex: 1, padding: "10px 12px", borderRadius: 8, cursor: "pointer", fontFamily: "var(--font-display)",
    fontWeight: 600, fontSize: 13, lineHeight: 1.3, textAlign: "center",
    border: active ? "1px solid var(--accent)" : "1px solid var(--line)",
    background: active ? "var(--accent-bg)" : "transparent",
    color: active ? "var(--accent-d)" : "var(--ink-2)",
  });
  const label: React.CSSProperties = { fontSize: 12, fontFamily: "var(--font-display)", fontWeight: 600, color: "var(--ink-2)", marginBottom: 5, display: "block" };
  const input: React.CSSProperties = { width: "100%", padding: "10px 12px", borderRadius: 8, border: "1px solid var(--line)", background: "var(--frame)", color: "var(--ink)", fontSize: 14, fontFamily: "var(--font-body)" };

  return (
    <div onClick={onClose} style={{ position: "fixed", inset: 0, zIndex: 300, background: "rgba(0,0,0,0.5)", display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}>
      <div onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true" style={{ width: "100%", maxWidth: 460, maxHeight: "90vh", overflowY: "auto", background: "var(--surface)", border: "1px solid var(--line)", borderRadius: 16, padding: 22 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
          <h2 style={{ fontFamily: "var(--font-display)", fontWeight: 700, fontSize: 19, margin: 0 }}>Send a contract</h2>
          <button onClick={onClose} aria-label="Close" style={{ border: "none", background: "transparent", fontSize: 22, lineHeight: 1, color: "var(--ink-3)", cursor: "pointer" }}>×</button>
        </div>
        <p style={{ fontSize: 13, color: "var(--ink-3)", margin: "0 0 16px", lineHeight: 1.5 }}>
          A direct agreement with @{counterparty.username || "them"}, no listing needed. Funds are held in escrow until the work&apos;s approved.
        </p>

        <label style={label}>Who&apos;s doing the work?</label>
        <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
          <button type="button" style={segBtn(iAmProvider)} onClick={() => setIAmProvider(true)}>
            I am{currency ? "" : ""}<br />
            <span style={{ fontWeight: 500, fontSize: 11, color: "var(--ink-3)" }}>{name} pays me</span>
          </button>
          <button type="button" style={segBtn(!iAmProvider)} onClick={() => setIAmProvider(false)}>
            {name} is<br />
            <span style={{ fontWeight: 500, fontSize: 11, color: "var(--ink-3)" }}>I pay them</span>
          </button>
        </div>

        {suggestions.length > 0 && (
          <div style={{ marginBottom: 14 }}>
            <label style={label}>{name}&apos;s rates</label>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
              {suggestions.map((s, i) => (
                <button key={i} type="button" onClick={() => { const a = priceToAmount(s.price); if (a) setFee(a); if (!desc) setDesc(s.title + (s.description ? ` — ${s.description}` : "")); }}
                  style={{ padding: "6px 10px", borderRadius: 999, border: "1px solid var(--line)", background: "transparent", color: "var(--ink-2)", fontSize: 12, cursor: "pointer" }}>
                  {s.title}{s.price ? ` · ${s.price}` : ""}
                </button>
              ))}
            </div>
          </div>
        )}

        <div style={{ display: "flex", gap: 10, marginBottom: 14 }}>
          <div style={{ flex: 2 }}>
            <label style={label}>Fee</label>
            <input style={input} type="number" min="1" step="0.01" value={fee} onChange={(e) => setFee(e.target.value)} placeholder="500" />
          </div>
          <div style={{ flex: 1 }}>
            <label style={label}>Currency</label>
            <select style={input} value={currency} onChange={(e) => setCurrency(e.target.value)}>
              <option value="AUD">AUD</option><option value="USD">USD</option><option value="GBP">GBP</option><option value="EUR">EUR</option>
            </select>
          </div>
        </div>

        <div style={{ marginBottom: 14 }}>
          <label style={label}>What&apos;s being delivered?</label>
          <textarea style={{ ...input, minHeight: 72, resize: "vertical" }} value={desc} onChange={(e) => setDesc(e.target.value)} placeholder="e.g. Mix and master one single, two revisions included." />
        </div>

        <div style={{ marginBottom: 18 }}>
          <label style={label}>Deliver by</label>
          <input style={input} type="date" value={deliverBy} onChange={(e) => setDeliverBy(e.target.value)} />
        </div>

        {err && <div style={{ color: "#c43d3f", fontSize: 13, marginBottom: 12 }}>{err}</div>}

        <button className="btn primary" style={{ width: "100%" }} onClick={submit} disabled={busy}>
          {busy ? "Creating…" : "Create draft contract →"}
        </button>
        <p style={{ fontSize: 11.5, color: "var(--ink-3)", margin: "10px 0 0", lineHeight: 1.5, textAlign: "center" }}>
          You&apos;ll add splits, credits and format on the next screen, then send it for signing.
        </p>
      </div>
    </div>
  );
}
