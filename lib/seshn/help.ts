// Help & community board data layer (0032). Threads + replies are world-readable
// under RLS; writes are scoped to the author. Staff moderation (pin/close) is
// allowed by RLS for is_staff profiles. Reply notifications + counters are
// handled by DB triggers, so the client just inserts.
import { getBrowserClient } from "./client";
import { getUser } from "./profiles";
import type { HelpCategory, HelpReply, HelpStatus, HelpThread } from "./types";

const AUTHOR = "author:profiles!author_id(id, username, display_name, avatar_url)";
const THREAD_FIELDS =
  "id, author_id, category, title, body, status, pinned, reply_count, last_activity_at, created_at, updated_at, " + AUTHOR;
const REPLY_FIELDS = "id, thread_id, author_id, body, is_staff_reply, created_at, " + AUTHOR;

export const HELP_CATEGORIES: { value: HelpCategory; label: string; blurb: string }[] = [
  { value: "question", label: "Question", blurb: "How do I…?" },
  { value: "bug", label: "Bug", blurb: "Something's broken" },
  { value: "feedback", label: "Feedback", blurb: "Tell us what you think" },
  { value: "feature_request", label: "Feature request", blurb: "Wishlist an idea" },
  { value: "general", label: "General", blurb: "Anything else" },
];

export async function listThreads(opts: { category?: HelpCategory | "all"; limit?: number } = {}): Promise<HelpThread[]> {
  let q = getBrowserClient()
    .from("help_threads")
    .select(THREAD_FIELDS)
    .order("pinned", { ascending: false })
    .order("last_activity_at", { ascending: false })
    .limit(opts.limit || 50);
  if (opts.category && opts.category !== "all") q = q.eq("category", opts.category);
  const res = await q;
  if (res.error) {
    console.error("[seshn] listThreads error", res.error);
    return [];
  }
  return (res.data as unknown as HelpThread[]) || [];
}

export async function getThread(id: string): Promise<HelpThread | null> {
  if (!id) return null;
  const res = await getBrowserClient().from("help_threads").select(THREAD_FIELDS).eq("id", id).maybeSingle();
  if (res.error) {
    console.error("[seshn] getThread error", res.error);
    return null;
  }
  return (res.data as unknown as HelpThread) ?? null;
}

export async function listReplies(threadId: string): Promise<HelpReply[]> {
  if (!threadId) return [];
  const res = await getBrowserClient()
    .from("help_replies")
    .select(REPLY_FIELDS)
    .eq("thread_id", threadId)
    .order("created_at", { ascending: true });
  if (res.error) {
    console.error("[seshn] listReplies error", res.error);
    return [];
  }
  return (res.data as unknown as HelpReply[]) || [];
}

export async function createThread(input: { category: HelpCategory; title: string; body: string }): Promise<HelpThread> {
  const u = await getUser();
  if (!u) throw new Error("Sign in to post.");
  const title = input.title.trim();
  const body = input.body.trim();
  if (title.length < 3) throw new Error("Give your post a title (at least 3 characters).");
  if (!body) throw new Error("Add some detail to your post.");
  const res = await getBrowserClient()
    .from("help_threads")
    .insert({ author_id: u.id, category: input.category, title, body })
    .select(THREAD_FIELDS)
    .single();
  if (res.error) throw res.error;
  return res.data as unknown as HelpThread;
}

export async function postReply(threadId: string, body: string): Promise<HelpReply> {
  const u = await getUser();
  if (!u) throw new Error("Sign in to reply.");
  const trimmed = body.trim();
  if (!trimmed) throw new Error("Write a reply first.");
  const res = await getBrowserClient()
    .from("help_replies")
    .insert({ thread_id: threadId, author_id: u.id, body: trimmed })
    .select(REPLY_FIELDS)
    .single();
  if (res.error) throw res.error;
  return res.data as unknown as HelpReply;
}

// Staff (or the author) can change a thread's status; staff can pin.
export async function setThreadStatus(threadId: string, status: HelpStatus): Promise<void> {
  const res = await getBrowserClient().from("help_threads").update({ status }).eq("id", threadId);
  if (res.error) throw res.error;
}

export async function setThreadPinned(threadId: string, pinned: boolean): Promise<void> {
  const res = await getBrowserClient().from("help_threads").update({ pinned }).eq("id", threadId);
  if (res.error) throw res.error;
}

// Am I staff? (Used to reveal moderation controls. RLS still enforces the rest.)
export async function amIStaff(): Promise<boolean> {
  const u = await getUser();
  if (!u) return false;
  const res = await getBrowserClient().from("profiles").select("is_staff").eq("id", u.id).maybeSingle();
  if (res.error) return false;
  return !!(res.data as { is_staff?: boolean } | null)?.is_staff;
}

// Live replies on an open thread.
export async function subscribeToReplies(threadId: string, onInsert: (r: HelpReply) => void): Promise<() => void> {
  const sb = getBrowserClient();
  const channel = sb
    .channel("help_replies:" + threadId)
    .on(
      "postgres_changes",
      { event: "INSERT", schema: "public", table: "help_replies", filter: "thread_id=eq." + threadId },
      (payload) => onInsert(payload.new as HelpReply),
    )
    .subscribe();
  return () => {
    sb.removeChannel(channel);
  };
}
