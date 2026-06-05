// Reviews & star ratings data layer (0034). Reviews are public; a member can
// review the counterparty once per completed contract. RLS enforces the
// "completed contract + you're a party" rule — this layer is thin.
import { getBrowserClient } from "./client";
import { getUser } from "./profiles";
import type { Review } from "./types";

const REVIEWER = "reviewer:profiles!reviewer_id(id, username, display_name, avatar_url, is_pro)";
const FIELDS = "id, contract_id, reviewer_id, reviewee_id, rating, body, created_at, " + REVIEWER;

// Reviews shown on a profile (most recent first).
export async function listProfileReviews(userId: string, limit = 20): Promise<Review[]> {
  if (!userId) return [];
  const res = await getBrowserClient()
    .from("reviews")
    .select(FIELDS)
    .eq("reviewee_id", userId)
    .order("created_at", { ascending: false })
    .limit(limit);
  if (res.error) {
    console.error("[seshn] listProfileReviews error", res.error);
    return [];
  }
  return (res.data as unknown as Review[]) || [];
}

// Both parties' reviews on one contract (for the contract page).
export async function listReviewsForContract(contractId: string): Promise<Review[]> {
  if (!contractId) return [];
  const res = await getBrowserClient()
    .from("reviews")
    .select(FIELDS)
    .eq("contract_id", contractId)
    .order("created_at", { ascending: true });
  if (res.error) {
    console.error("[seshn] listReviewsForContract error", res.error);
    return [];
  }
  return (res.data as unknown as Review[]) || [];
}

export async function createReview(input: { contractId: string; revieweeId: string; rating: number; body: string }): Promise<Review> {
  const u = await getUser();
  if (!u) throw new Error("Sign in to leave a review.");
  const rating = Math.round(input.rating);
  if (rating < 1 || rating > 5) throw new Error("Pick a star rating from 1 to 5.");
  const res = await getBrowserClient()
    .from("reviews")
    .insert({ contract_id: input.contractId, reviewer_id: u.id, reviewee_id: input.revieweeId, rating, body: input.body.trim().slice(0, 2000) })
    .select(FIELDS)
    .single();
  if (res.error) {
    if (res.error.code === "23505") throw new Error("You've already reviewed this collaboration.");
    throw res.error;
  }
  return res.data as unknown as Review;
}
