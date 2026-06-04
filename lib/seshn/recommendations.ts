// Recommendations for the gig detail page: "more gigs like this" and "artists
// you could work with". Pure client-side ranking on top of the existing
// listGigs / listProfiles queries — no new tables or RPCs. The goal is keeping
// people exploring: every card is another gig to read or artist to reach out to.
import { listGigs } from "./gigs";
import { listProfiles } from "./profiles";
import type { Gig, Profile } from "./types";

// Gig roles and profile roles are *mostly* the same vocabulary but drifted in a
// couple of spots (see constants.ts). Map the gig's needed role onto the
// profile role we'd search for; identical values need no entry.
const GIG_TO_PROFILE_ROLE: Record<string, string> = {
  "Topline writer": "Songwriter",
};
function roleForProfileSearch(gigRole?: string): string | undefined {
  if (!gigRole || gigRole === "Other") return undefined;
  return GIG_TO_PROFILE_ROLE[gigRole] || gigRole;
}

// "More gigs like this" — open gigs that overlap on genre or share the role,
// ranked by overlap, backfilled with recent open gigs so the rail is never empty.
export async function getSimilarGigs(gig: Gig, limit = 4): Promise<Gig[]> {
  const [byGenre, byRole] = await Promise.all([
    gig.genres?.length ? listGigs({ genres: gig.genres, statuses: ["open"], limit: 16 }) : Promise.resolve<Gig[]>([]),
    gig.role ? listGigs({ role: gig.role, statuses: ["open"], limit: 16 }) : Promise.resolve<Gig[]>([]),
  ]);

  const pool = new Map<string, Gig>();
  for (const g of [...byGenre, ...byRole]) {
    if (g.id !== gig.id) pool.set(g.id, g);
  }
  if (pool.size < limit) {
    const recent = await listGigs({ statuses: ["open"], limit: 16, sort: "newest" });
    for (const g of recent) {
      if (g.id !== gig.id && !pool.has(g.id)) pool.set(g.id, g);
    }
  }

  const gigGenres = new Set(gig.genres || []);
  const score = (g: Gig) => {
    const genreOverlap = (g.genres || []).filter((x) => gigGenres.has(x)).length;
    const roleMatch = g.role === gig.role ? 1 : 0;
    const sameOwner = g.owner_id === gig.owner_id ? -3 : 0; // nudge variety
    return genreOverlap * 2 + roleMatch * 2 + sameOwner;
  };
  return Array.from(pool.values())
    .sort((a, b) => score(b) - score(a))
    .slice(0, limit);
}

// "Artists you could work with" — people who can fill the gig's role and/or
// share its genres, personalised with the viewer's own genres when signed in.
export async function getRecommendedArtists(opts: {
  gig: Gig;
  viewer?: Profile | null;
  limit?: number;
}): Promise<Profile[]> {
  const { gig, viewer, limit = 4 } = opts;
  const exclude = new Set<string>([gig.owner_id]);
  if (viewer?.id) exclude.add(viewer.id);

  const out = new Map<string, Profile>();
  const add = (list: Profile[]) => {
    for (const p of list) if (!exclude.has(p.id) && !out.has(p.id)) out.set(p.id, p);
  };

  const role = roleForProfileSearch(gig.role);
  const interestGenres = Array.from(new Set([...(gig.genres || []), ...((viewer?.genres) || [])]));

  // 1. Can fill the role AND share genres — the strongest match.
  if (role) add(await listProfiles({ roles: [role], genres: gig.genres?.length ? gig.genres : undefined, excludeId: gig.owner_id, limit: limit + 6 }));
  // 2. Can fill the role (any genre).
  if (out.size < limit && role) add(await listProfiles({ roles: [role], excludeId: gig.owner_id, limit: limit + 6 }));
  // 3. Shares the genres you/the gig care about.
  if (out.size < limit && interestGenres.length) add(await listProfiles({ genres: interestGenres, excludeId: gig.owner_id, limit: limit + 6 }));
  // 4. Backfill with recent members so the rail isn't empty on a fresh DB.
  if (out.size < limit) add(await listProfiles({ excludeId: gig.owner_id, limit: limit + 6 }));

  return Array.from(out.values()).slice(0, limit);
}
