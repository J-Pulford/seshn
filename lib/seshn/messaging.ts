// Messaging data layer. Typed port of the messaging section of
// seshn-supabase.js (conversations, messages, attachments, realtime).
import { getBrowserClient } from "./client";
import { getUser } from "./profiles";
import type { ConversationWithMeta, DmAttachment, Message } from "./types";

export async function getOrCreateConversation(otherUserId: string): Promise<string> {
  const sb = getBrowserClient();
  const u = await getUser();
  if (!u) throw new Error("Not signed in");
  if (!otherUserId) throw new Error("Missing recipient");
  if (otherUserId === u.id) throw new Error("Can't message yourself");
  const res = await sb.rpc("get_or_create_conversation", { other_user: otherUserId });
  if (res.error) throw res.error;
  return res.data as string;
}

const CONVO_PROFILE =
  "profiles!user_a(id, username, display_name, is_pro, location, roles, avatar_url)";

export async function listMyConversations(): Promise<ConversationWithMeta[]> {
  const sb = getBrowserClient();
  const u = await getUser();
  if (!u) return [];
  const res = await sb
    .from("conversations")
    .select(
      "id, user_a, user_b, last_message_at, last_message_preview, last_message_sender, " +
        "user_a_profile:" + CONVO_PROFILE + ", " +
        "user_b_profile:profiles!user_b(id, username, display_name, is_pro, location, roles, avatar_url), " +
        "reads:conversation_reads(user_id, last_read_at)",
    )
    .order("last_message_at", { ascending: false, nullsFirst: false })
    .order("created_at", { ascending: false });
  if (res.error) {
    console.error("[seshn] listMyConversations error", res.error);
    return [];
  }
  return ((res.data as unknown[]) || []).map((row) => {
    const c = row as ConversationWithMeta & { reads?: { user_id: string; last_read_at: string }[] };
    const other = c.user_a === u.id ? c.user_b_profile : c.user_a_profile;
    const myRead = (c.reads || []).find((r) => r.user_id === u.id);
    const lastReadAt = myRead ? new Date(myRead.last_read_at).getTime() : 0;
    const lastMsgAt = c.last_message_at ? new Date(c.last_message_at).getTime() : 0;
    const unread = !!(lastMsgAt && lastMsgAt > lastReadAt && c.last_message_sender && c.last_message_sender !== u.id);
    return { ...c, other, unread, me_id: u.id };
  });
}

export async function getConversation(conversationId: string): Promise<ConversationWithMeta | null> {
  const sb = getBrowserClient();
  const u = await getUser();
  if (!u || !conversationId) return null;
  const res = await sb
    .from("conversations")
    .select(
      "id, user_a, user_b, last_message_at, last_message_preview, last_message_sender, " +
        "user_a_profile:" + CONVO_PROFILE + ", " +
        "user_b_profile:profiles!user_b(id, username, display_name, is_pro, location, roles, avatar_url)",
    )
    .eq("id", conversationId)
    .maybeSingle();
  if (res.error) {
    console.error("[seshn] getConversation error", res.error);
    return null;
  }
  if (!res.data) return null;
  const c = res.data as unknown as ConversationWithMeta;
  const other = c.user_a === u.id ? c.user_b_profile : c.user_a_profile;
  return { ...c, other, me_id: u.id };
}

export async function listMessages(conversationId: string, opts: { limit?: number } = {}): Promise<Message[]> {
  const sb = getBrowserClient();
  if (!conversationId) return [];
  const res = await sb
    .from("messages")
    .select("*")
    .eq("conversation_id", conversationId)
    .order("created_at", { ascending: true })
    .limit(opts.limit || 200);
  if (res.error) {
    console.error("[seshn] listMessages error", res.error);
    return [];
  }
  return (res.data as Message[]) || [];
}

// body may be empty IFF attachment is provided.
export async function sendMessage(
  conversationId: string,
  body: string,
  attachment?: DmAttachment,
): Promise<Message> {
  const sb = getBrowserClient();
  const u = await getUser();
  if (!u) throw new Error("Not signed in");
  if (!conversationId) throw new Error("Missing conversation");
  const trimmed = (body || "").trim();
  if (!trimmed && !attachment) throw new Error("Empty message");
  const row: Record<string, unknown> = { conversation_id: conversationId, sender_id: u.id, body: trimmed };
  if (attachment) {
    row.attachment_url = attachment.url;
    row.attachment_name = attachment.name || null;
    row.attachment_kind = attachment.kind || "file";
    row.attachment_size_bytes = attachment.size_bytes ?? null;
    row.attachment_duration_ms = attachment.duration_ms ?? null;
    row.attachment_mime = attachment.mime || null;
  }
  const res = await sb.from("messages").insert(row).select("*").single();
  if (res.error) throw res.error;
  return res.data as Message;
}

function probeAudioDuration(file: File): Promise<number | null> {
  return new Promise((resolve) => {
    let url: string;
    try {
      url = URL.createObjectURL(file);
    } catch {
      resolve(null);
      return;
    }
    const audio = new Audio();
    audio.preload = "metadata";
    let done = false;
    const finish = (ms: number | null) => {
      if (done) return;
      done = true;
      try {
        URL.revokeObjectURL(url);
      } catch {
        /* ignore */
      }
      resolve(ms);
    };
    audio.onloadedmetadata = () => {
      const d = audio.duration;
      finish(isFinite(d) && d > 0 ? Math.round(d * 1000) : null);
    };
    audio.onerror = () => finish(null);
    setTimeout(() => finish(null), 5000);
    audio.src = url;
  });
}

export async function uploadDmAttachment(file: File, conversationId: string): Promise<DmAttachment> {
  const sb = getBrowserClient();
  const u = await getUser();
  if (!u) throw new Error("Not signed in");
  if (!conversationId) throw new Error("Missing conversation");
  if (!file) throw new Error("No file");
  const MAX = 50 * 1024 * 1024;
  if (file.size > MAX) throw new Error("File is too large (max 50 MB).");

  const mime = file.type || "application/octet-stream";
  const kind: "audio" | "file" = mime.indexOf("audio/") === 0 ? "audio" : "file";

  const safe =
    (file.name || "file")
      .replace(/[^a-zA-Z0-9._-]+/g, "_")
      .replace(/^_+|_+$/g, "")
      .slice(0, 100) || "file";
  // Conversation-scoped, uploader-namespaced path. The storage RLS policies
  // (0036) authorise reads to either participant and writes to the uploader.
  const path = `${conversationId}/${u.id}/${Date.now()}-${safe}`;

  const up = await sb.storage.from("dm-attachments").upload(path, file, {
    cacheControl: "31536000",
    upsert: false,
    contentType: mime,
  });
  if (up.error) throw up.error;

  const duration_ms = kind === "audio" ? await probeAudioDuration(file) : null;

  // The bucket is private: persist the path (not a public URL). Viewers fetch a
  // short-lived signed URL at render time via signedAttachmentUrl().
  return { url: path, name: file.name || safe, kind, size_bytes: file.size, duration_ms, mime };
}

// Resolve a stored attachment value into something an <audio>/<a> can use.
// New messages store a storage path -> mint a short-lived signed URL. Legacy
// messages stored a full public URL (pre-0036) -> use it as-is.
export async function signedAttachmentUrl(pathOrUrl: string | null | undefined): Promise<string | null> {
  if (!pathOrUrl) return null;
  if (/^https?:\/\//i.test(pathOrUrl)) return pathOrUrl;
  const sb = getBrowserClient();
  const res = await sb.storage.from("dm-attachments").createSignedUrl(pathOrUrl, 60 * 60);
  if (res.error) {
    console.error("[seshn] signedAttachmentUrl error", res.error);
    return null;
  }
  return res.data?.signedUrl ?? null;
}

export async function markConversationRead(conversationId: string): Promise<void> {
  const sb = getBrowserClient();
  const u = await getUser();
  if (!u || !conversationId) return;
  const res = await sb
    .from("conversation_reads")
    .upsert(
      { conversation_id: conversationId, user_id: u.id, last_read_at: new Date().toISOString() },
      { onConflict: "conversation_id,user_id" },
    );
  if (res.error) console.error("[seshn] markConversationRead error", res.error);
  const nres = await sb
    .from("notifications")
    .update({ read_at: new Date().toISOString() })
    .eq("user_id", u.id)
    .eq("conversation_id", conversationId)
    .is("read_at", null);
  if (nres.error) console.warn("[seshn] markConversationRead (notifications) error", nres.error);
}

export function subscribeToMessages(conversationId: string, onInsert: (row: Message) => void): () => void {
  const sb = getBrowserClient();
  if (!conversationId) return () => {};
  const channel = sb
    .channel("messages:" + conversationId)
    .on(
      "postgres_changes",
      { event: "INSERT", schema: "public", table: "messages", filter: "conversation_id=eq." + conversationId },
      (payload) => onInsert(payload.new as Message),
    )
    .subscribe();
  return () => {
    sb.removeChannel(channel);
  };
}

export async function subscribeToMyConversations(onChange: () => void): Promise<() => void> {
  const sb = getBrowserClient();
  const u = await getUser();
  if (!u) return () => {};
  const channel = sb
    .channel("user-convos:" + u.id)
    .on("postgres_changes", { event: "UPDATE", schema: "public", table: "conversations" }, () => onChange())
    .subscribe();
  return () => {
    sb.removeChannel(channel);
  };
}

export async function getUnreadCount(): Promise<number> {
  const convos = await listMyConversations();
  return convos.filter((c) => c.unread).length;
}
