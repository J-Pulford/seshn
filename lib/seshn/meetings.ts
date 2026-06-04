// Meetings data layer + calendar helpers. Either party in a conversation can
// propose a meeting; the other confirms or declines (see migration 0024). The
// scheduler is self-contained, but buildIcs()/googleCalendarUrl() let a member
// push a confirmed meeting to their real calendar.
import { getBrowserClient } from "./client";
import { getUser } from "./profiles";
import type { Meeting, MeetingStatus } from "./types";

const MEETING_FIELDS =
  "id, conversation_id, contract_id, organizer_id, invitee_id, title, agenda, " +
  "location, meeting_url, starts_at, ends_at, status, created_at, updated_at";

export async function listConversationMeetings(conversationId: string): Promise<Meeting[]> {
  const sb = getBrowserClient();
  if (!conversationId) return [];
  const res = await sb
    .from("meetings")
    .select(MEETING_FIELDS)
    .eq("conversation_id", conversationId)
    .order("starts_at", { ascending: true });
  if (res.error) {
    console.error("[seshn] listConversationMeetings error", res.error);
    return [];
  }
  return (res.data as unknown as Meeting[]) || [];
}

export interface ProposeMeetingInput {
  conversationId: string;
  inviteeId: string;
  title: string;
  startsAt: string; // ISO
  endsAt: string; // ISO
  agenda?: string;
  location?: string;
  meetingUrl?: string;
  contractId?: string | null;
}

export async function proposeMeeting(input: ProposeMeetingInput): Promise<Meeting> {
  const sb = getBrowserClient();
  const u = await getUser();
  if (!u) throw new Error("Not signed in");
  if (!input.conversationId) throw new Error("Missing conversation");
  if (!input.inviteeId) throw new Error("Missing the other person");
  if (!input.title.trim()) throw new Error("Give the meeting a title");
  if (new Date(input.endsAt) <= new Date(input.startsAt)) throw new Error("End time must be after the start time");
  const row = {
    conversation_id: input.conversationId,
    contract_id: input.contractId ?? null,
    organizer_id: u.id,
    invitee_id: input.inviteeId,
    title: input.title.trim(),
    agenda: (input.agenda || "").trim(),
    location: (input.location || "").trim(),
    meeting_url: (input.meetingUrl || "").trim(),
    starts_at: input.startsAt,
    ends_at: input.endsAt,
  };
  const res = await sb.from("meetings").insert(row).select(MEETING_FIELDS).single();
  if (res.error) throw res.error;
  return res.data as unknown as Meeting;
}

async function setStatus(meetingId: string, status: MeetingStatus): Promise<Meeting> {
  const sb = getBrowserClient();
  if (!meetingId) throw new Error("Missing meeting");
  const res = await sb.from("meetings").update({ status }).eq("id", meetingId).select(MEETING_FIELDS).single();
  if (res.error) throw res.error;
  return res.data as unknown as Meeting;
}

export const confirmMeeting = (id: string) => setStatus(id, "confirmed");
export const declineMeeting = (id: string) => setStatus(id, "declined");
export const cancelMeeting = (id: string) => setStatus(id, "cancelled");

export async function rescheduleMeeting(
  meetingId: string,
  startsAt: string,
  endsAt: string,
): Promise<Meeting> {
  const sb = getBrowserClient();
  if (new Date(endsAt) <= new Date(startsAt)) throw new Error("End time must be after the start time");
  // Re-proposing resets the meeting to 'proposed' so the other party re-confirms.
  const res = await sb
    .from("meetings")
    .update({ starts_at: startsAt, ends_at: endsAt, status: "proposed" })
    .eq("id", meetingId)
    .select(MEETING_FIELDS)
    .single();
  if (res.error) throw res.error;
  return res.data as unknown as Meeting;
}

export function subscribeToConversationMeetings(conversationId: string, onChange: () => void): () => void {
  const sb = getBrowserClient();
  if (!conversationId) return () => {};
  const channel = sb
    .channel("meetings:" + conversationId)
    .on(
      "postgres_changes",
      { event: "*", schema: "public", table: "meetings", filter: "conversation_id=eq." + conversationId },
      () => onChange(),
    )
    .subscribe();
  return () => {
    sb.removeChannel(channel);
  };
}

// ──── Calendar export ──────────────────────────────────────────────────────

// Format a Date as an iCalendar UTC stamp: 20260615T143000Z
function icsStamp(iso: string): string {
  return new Date(iso).toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
}

function icsEscape(text: string): string {
  return (text || "").replace(/\\/g, "\\\\").replace(/;/g, "\\;").replace(/,/g, "\\,").replace(/\n/g, "\\n");
}

export function buildIcs(meeting: Meeting): string {
  const desc = [meeting.agenda, meeting.meeting_url && `Link: ${meeting.meeting_url}`].filter(Boolean).join("\n\n");
  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Seshn//Meetings//EN",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    "BEGIN:VEVENT",
    `UID:${meeting.id}@seshn.fm`,
    `DTSTAMP:${icsStamp(meeting.created_at || new Date().toISOString())}`,
    `DTSTART:${icsStamp(meeting.starts_at)}`,
    `DTEND:${icsStamp(meeting.ends_at)}`,
    `SUMMARY:${icsEscape(meeting.title)}`,
    desc && `DESCRIPTION:${icsEscape(desc)}`,
    meeting.location && `LOCATION:${icsEscape(meeting.location)}`,
    "END:VEVENT",
    "END:VCALENDAR",
  ].filter(Boolean);
  return lines.join("\r\n");
}

export function googleCalendarUrl(meeting: Meeting): string {
  const fmt = (iso: string) => icsStamp(iso);
  const details = [meeting.agenda, meeting.meeting_url && `Link: ${meeting.meeting_url}`].filter(Boolean).join("\n\n");
  const params = new URLSearchParams({
    action: "TEMPLATE",
    text: meeting.title,
    dates: `${fmt(meeting.starts_at)}/${fmt(meeting.ends_at)}`,
    details,
    location: meeting.location || meeting.meeting_url || "",
  });
  return `https://calendar.google.com/calendar/render?${params.toString()}`;
}

// Trigger a browser download of the .ics for a meeting.
export function downloadIcs(meeting: Meeting): void {
  const blob = new Blob([buildIcs(meeting)], { type: "text/calendar;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${(meeting.title || "meeting").replace(/[^a-z0-9]+/gi, "-").toLowerCase()}.ics`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
