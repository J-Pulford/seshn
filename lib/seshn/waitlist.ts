// Waitlist capture — write side for the marketing landing. Inserts into the
// insert-only `waitlist` table (migration 0019) using the browser anon client.
// Deliberately does NOT chain .select(): anon has no read privilege on the
// table, so requesting the inserted row back would fail under RLS.
import { getBrowserClient } from "./client";

const EMAIL_RE = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;

export interface WaitlistInput {
  email: string;
  role?: string;
  location?: string;
  source?: string;
}

// Adds the email to the waitlist. Returns { already: true } if that email is
// already on the list (a duplicate is treated as success, not an error, so we
// don't leak list membership or nag the user). Throws on a bad email or a real
// write failure.
export async function joinWaitlist(input: WaitlistInput): Promise<{ already: boolean }> {
  const email = input.email.trim().toLowerCase();
  if (!EMAIL_RE.test(email) || email.length > 254) {
    throw new Error("Please enter a valid email address.");
  }
  const { error } = await getBrowserClient().from("waitlist").insert({
    email,
    role: input.role?.trim() || null,
    location: input.location?.trim() || null,
    source: input.source?.trim() || "landing",
  });
  if (error) {
    if (error.code === "23505") return { already: true }; // unique_violation
    throw error;
  }
  return { already: false };
}
