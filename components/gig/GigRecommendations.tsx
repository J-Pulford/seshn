"use client";

import { useEffect, useState } from "react";
import { getProfile } from "@/lib/seshn/profiles";
import { getSimilarGigs, getRecommendedArtists } from "@/lib/seshn/recommendations";
import type { Gig, Profile } from "@/lib/seshn/types";
import "./recommendations.css";

function initials(name?: string) {
  if (!name) return "··";
  return name.trim().split(/\s+/).map((s) => s[0]).join("").slice(0, 2).toUpperCase();
}
function compLabel(g: Gig) {
  if (g.comp === "paid" && g.pay_amount) return "Paid · $" + Number(g.pay_amount).toLocaleString();
  if (g.comp === "paid") return "Paid";
  if (g.comp === "split") return "Split";
  if (g.comp === "trade") return "Trade";
  return "Unpaid";
}

function SimilarGigCard({ gig }: { gig: Gig }) {
  return (
    <a href={`/gig/${encodeURIComponent(gig.id)}`} className="rec-card">
      <div className="rec-card-head">
        <span className="pill accent">{gig.role}</span>
        <span className="rec-comp">{compLabel(gig)}</span>
      </div>
      <div className="rec-title">{gig.title}</div>
      <div className="rec-meta">
        {gig.owner?.display_name || "Artist"}
        {gig.location ? " · " + gig.location : ""}
      </div>
      {gig.genres && gig.genres.length > 0 && (
        <div className="rec-pills">{gig.genres.slice(0, 3).map((t) => <span key={t} className="pill">{t}</span>)}</div>
      )}
    </a>
  );
}

function ArtistCard({ p }: { p: Profile }) {
  return (
    <a href={`/profile/${encodeURIComponent(p.username)}`} className="rec-card rec-artist">
      <div className="rec-artist-head">
        <span className="rec-avatar">
          {p.avatar_url ? <img src={p.avatar_url} alt="" /> : <span>{initials(p.display_name)}</span>}
        </span>
        <div className="rec-artist-id">
          <div className="rec-name">
            {p.display_name || p.username}
            {p.is_pro && <span className="pill solid rec-pro">✓ Pro</span>}
          </div>
          <div className="rec-meta">@{p.username}{p.location ? " · " + p.location : ""}</div>
        </div>
      </div>
      {(p.roles?.length || p.genres?.length) ? (
        <div className="rec-pills">
          {(p.roles || []).slice(0, 2).map((r) => <span key={r} className="pill accent">{r}</span>)}
          {(p.genres || []).slice(0, 2).map((g) => <span key={g} className="pill">{g}</span>)}
        </div>
      ) : null}
      <span className="rec-view">View profile →</span>
    </a>
  );
}

export default function GigRecommendations({ gig, meId }: { gig: Gig; meId?: string | null }) {
  const [gigs, setGigs] = useState<Gig[] | null>(null);
  const [artists, setArtists] = useState<Profile[] | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const viewer = meId ? await getProfile({ id: meId }).catch(() => null) : null;
      const [similar, recs] = await Promise.all([
        getSimilarGigs(gig, 4).catch(() => [] as Gig[]),
        getRecommendedArtists({ gig, viewer, limit: 4 }).catch(() => [] as Profile[]),
      ]);
      if (cancelled) return;
      setGigs(similar);
      setArtists(recs);
    })();
    return () => { cancelled = true; };
  }, [gig, meId]);

  // Nothing to show (very fresh DB) — render nothing rather than empty headers.
  if (gigs !== null && artists !== null && gigs.length === 0 && artists.length === 0) return null;

  return (
    <section className="rec-section">
      {(gigs === null || gigs.length > 0) && (
        <div className="rec-block">
          <div className="rec-head">
            <h2>More gigs like this</h2>
            <a href="/feed" className="rec-more">Browse all →</a>
          </div>
          {gigs === null ? (
            <div className="rec-loading">Finding similar gigs…</div>
          ) : (
            <div className="rec-grid">{gigs.map((g) => <SimilarGigCard key={g.id} gig={g} />)}</div>
          )}
        </div>
      )}

      {(artists === null || artists.length > 0) && (
        <div className="rec-block">
          <div className="rec-head">
            <h2>Artists you could work with</h2>
            <a href="/browse" className="rec-more">Browse artists →</a>
          </div>
          {artists === null ? (
            <div className="rec-loading">Finding collaborators…</div>
          ) : (
            <div className="rec-grid">{artists.map((p) => <ArtistCard key={p.id} p={p} />)}</div>
          )}
        </div>
      )}
    </section>
  );
}
