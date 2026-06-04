"use client";

import { useEffect, useState } from "react";
import {
  listConversationMeetings,
  proposeMeeting,
  confirmMeeting,
  declineMeeting,
  cancelMeeting,
  subscribeToConversationMeetings,
  downloadIcs,
  googleCalendarUrl,
} from "@/lib/seshn/meetings";
import type { Meeting } from "@/lib/seshn/types";
import { toast } from "@/lib/seshn/toast";
import "./meetings.css";

interface OtherUser {
  id?: string;
  display_name?: string;
  username?: string;
}

function firstName(u?: OtherUser) {
  const n = u?.display_name || u?.username || "them";
  return n.split(" ")[0];
}

// Local YYYY-MM-DD / HH:MM defaults: tomorrow, next round hour.
function defaultDate() {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  return d.toISOString().slice(0, 10);
}
function defaultTime() {
  const d = new Date();
  d.setHours(d.getHours() + 1, 0, 0, 0);
  return d.toTimeString().slice(0, 5);
}

function fmtRange(meeting: Meeting) {
  const s = new Date(meeting.starts_at);
  const e = new Date(meeting.ends_at);
  const day = s.toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" });
  const t = (d: Date) => d.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });
  return `${day} · ${t(s)} – ${t(e)}`;
}

const STATUS_LABEL: Record<string, string> = {
  proposed: "Proposed",
  confirmed: "Confirmed",
  declined: "Declined",
  cancelled: "Cancelled",
  completed: "Done",
};

const DURATIONS = [15, 30, 45, 60, 90, 120];

function ScheduleModal({
  otherUser,
  onClose,
  onCreate,
}: {
  otherUser?: OtherUser;
  onClose: () => void;
  onCreate: (input: {
    title: string;
    startsAt: string;
    endsAt: string;
    location: string;
    meetingUrl: string;
    agenda: string;
  }) => Promise<void>;
}) {
  const [title, setTitle] = useState(`Session with ${firstName(otherUser)}`);
  const [date, setDate] = useState(defaultDate());
  const [time, setTime] = useState(defaultTime());
  const [duration, setDuration] = useState(30);
  const [location, setLocation] = useState("");
  const [meetingUrl, setMeetingUrl] = useState("");
  const [agenda, setAgenda] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  async function submit() {
    setErr("");
    if (!title.trim()) {
      setErr("Give the meeting a title.");
      return;
    }
    const start = new Date(`${date}T${time}`);
    if (isNaN(start.getTime())) {
      setErr("Pick a valid date and time.");
      return;
    }
    if (start.getTime() < Date.now() - 60000) {
      setErr("That time is in the past — pick a future slot.");
      return;
    }
    const end = new Date(start.getTime() + duration * 60000);
    setBusy(true);
    try {
      await onCreate({
        title: title.trim(),
        startsAt: start.toISOString(),
        endsAt: end.toISOString(),
        location: location.trim(),
        meetingUrl: meetingUrl.trim(),
        agenda: agenda.trim(),
      });
    } catch (e) {
      setErr((e as Error)?.message || "Couldn't schedule the meeting.");
      setBusy(false);
    }
  }

  return (
    <div className="mtg-backdrop" onClick={onClose}>
      <div className="mtg-modal" onClick={(e) => e.stopPropagation()}>
        <div className="mtg-modal-head">
          <span className="t-h3">Propose a meeting</span>
          <button className="btn sm" onClick={onClose} aria-label="Close">Close</button>
        </div>
        <div className="mtg-modal-body">
          <label className="mtg-field">
            <span>Title</span>
            <input className="input" value={title} maxLength={140} onChange={(e) => setTitle(e.target.value)} placeholder="What's the call about?" />
          </label>
          <div className="mtg-row3">
            <label className="mtg-field">
              <span>Date</span>
              <input className="input" type="date" value={date} onChange={(e) => setDate(e.target.value)} />
            </label>
            <label className="mtg-field">
              <span>Start</span>
              <input className="input" type="time" value={time} onChange={(e) => setTime(e.target.value)} />
            </label>
            <label className="mtg-field">
              <span>Duration</span>
              <select className="input" value={duration} onChange={(e) => setDuration(Number(e.target.value))}>
                {DURATIONS.map((m) => (
                  <option key={m} value={m}>{m < 60 ? `${m} min` : `${m / 60} hr${m >= 120 ? "s" : ""}`.replace(".5 hrs", "½ hr")}</option>
                ))}
              </select>
            </label>
          </div>
          <div className="mtg-row2">
            <label className="mtg-field">
              <span>Where</span>
              <input className="input" value={location} maxLength={200} onChange={(e) => setLocation(e.target.value)} placeholder="Zoom, Google Meet, phone…" />
            </label>
            <label className="mtg-field">
              <span>Link (optional)</span>
              <input className="input" type="url" inputMode="url" value={meetingUrl} maxLength={500} onChange={(e) => setMeetingUrl(e.target.value)} placeholder="https://…" />
            </label>
          </div>
          <label className="mtg-field">
            <span>Agenda (optional)</span>
            <textarea className="input" rows={3} value={agenda} maxLength={2000} onChange={(e) => setAgenda(e.target.value)} placeholder="What you want to cover." />
          </label>
          {err && <div className="mtg-err">{err}</div>}
        </div>
        <div className="mtg-modal-foot">
          <button className="btn" onClick={onClose} disabled={busy}>Cancel</button>
          <button className="btn primary" onClick={submit} disabled={busy}>{busy ? "Sending…" : "Send proposal →"}</button>
        </div>
      </div>
    </div>
  );
}

function MeetingCard({
  meeting,
  meId,
  onChange,
}: {
  meeting: Meeting;
  meId: string;
  onChange: () => void;
}) {
  const [busy, setBusy] = useState(false);
  const iAmInvitee = meeting.invitee_id === meId;
  const iAmOrganizer = meeting.organizer_id === meId;

  async function act(fn: () => Promise<unknown>) {
    setBusy(true);
    try {
      await fn();
      onChange();
    } catch (e) {
      toast.error((e as Error)?.message || "Couldn't update the meeting.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className={"mtg-card status-" + meeting.status}>
      <div className="mtg-card-top">
        <span className="mtg-icon" aria-hidden="true">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <rect x="3" y="4.5" width="18" height="16" rx="2.5" /><path d="M3 9h18M8 2.5v4M16 2.5v4" />
          </svg>
        </span>
        <div className="mtg-card-main">
          <div className="mtg-card-title">{meeting.title}</div>
          <div className="mtg-card-time">{fmtRange(meeting)}</div>
          {(meeting.location || meeting.meeting_url) && (
            <div className="mtg-card-where">
              {meeting.location}
              {meeting.location && meeting.meeting_url ? " · " : ""}
              {meeting.meeting_url && (
                <a href={meeting.meeting_url} target="_blank" rel="noopener noreferrer">{meeting.meeting_url.replace(/^https?:\/\//, "").slice(0, 40)}</a>
              )}
            </div>
          )}
          {meeting.agenda && <div className="mtg-card-agenda">{meeting.agenda}</div>}
        </div>
        <span className={"mtg-badge " + meeting.status}>{STATUS_LABEL[meeting.status] || meeting.status}</span>
      </div>

      <div className="mtg-card-actions">
        {meeting.status === "proposed" && iAmInvitee && (
          <>
            <button className="btn primary sm" disabled={busy} onClick={() => act(() => confirmMeeting(meeting.id))}>Accept</button>
            <button className="btn sm" disabled={busy} onClick={() => act(() => declineMeeting(meeting.id))}>Decline</button>
          </>
        )}
        {meeting.status === "proposed" && iAmOrganizer && (
          <>
            <span className="mtg-waiting">Waiting for a response…</span>
            <button className="btn sm" disabled={busy} onClick={() => act(() => cancelMeeting(meeting.id))}>Cancel</button>
          </>
        )}
        {meeting.status === "confirmed" && (
          <>
            <a className="btn sm" href={googleCalendarUrl(meeting)} target="_blank" rel="noopener noreferrer">Add to Google Calendar</a>
            <button className="btn sm" onClick={() => downloadIcs(meeting)}>Download .ics</button>
            <button className="btn sm" disabled={busy} onClick={() => act(() => cancelMeeting(meeting.id))}>Cancel</button>
          </>
        )}
        {(meeting.status === "declined" || meeting.status === "cancelled") && (
          <span className="mtg-note">{meeting.status === "declined" ? "Declined" : "Cancelled"} — propose a new time above.</span>
        )}
      </div>
    </div>
  );
}

export default function MeetingScheduler({
  conversationId,
  otherUser,
  meId,
  contractId,
  autoOpen = false,
}: {
  conversationId: string;
  otherUser?: OtherUser;
  meId: string;
  contractId?: string | null;
  autoOpen?: boolean;
}) {
  const [meetings, setMeetings] = useState<Meeting[] | null>(null);
  const [open, setOpen] = useState(false);
  const [expanded, setExpanded] = useState(true);

  const load = () => {
    listConversationMeetings(conversationId).then(setMeetings).catch(() => setMeetings([]));
  };

  useEffect(() => {
    if (!conversationId) return;
    setMeetings(null);
    load();
    const unsub = subscribeToConversationMeetings(conversationId, load);
    return () => unsub();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [conversationId]);

  useEffect(() => {
    if (autoOpen) setOpen(true);
  }, [autoOpen]);

  async function create(input: {
    title: string;
    startsAt: string;
    endsAt: string;
    location: string;
    meetingUrl: string;
    agenda: string;
  }) {
    if (!otherUser?.id) throw new Error("Can't find the other person in this conversation.");
    await proposeMeeting({
      conversationId,
      inviteeId: otherUser.id,
      contractId: contractId ?? null,
      ...input,
    });
    setOpen(false);
    load();
  }

  // Active = anything not yet resolved or still upcoming; surface those first.
  const active = (meetings || []).filter((m) => m.status === "proposed" || m.status === "confirmed");
  const hasAny = (meetings || []).length > 0;

  return (
    <div className="mtg-section">
      <div className="mtg-section-head">
        <button type="button" className="mtg-section-toggle" onClick={() => setExpanded((e) => !e)}>
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ transform: expanded ? "rotate(90deg)" : "none", transition: "transform .15s" }}><path d="M9 6l6 6-6 6" /></svg>
          Meetings{active.length > 0 ? ` · ${active.length}` : ""}
        </button>
        <button type="button" className="btn sm primary" onClick={() => setOpen(true)}>+ Schedule</button>
      </div>

      {expanded && (
        <div className="mtg-list">
          {meetings === null ? (
            <div className="mtg-empty">Loading meetings…</div>
          ) : !hasAny ? (
            <div className="mtg-empty">No meetings yet. Propose a time to get a call on the calendar.</div>
          ) : (
            (meetings || []).map((m) => <MeetingCard key={m.id} meeting={m} meId={meId} onChange={load} />)
          )}
        </div>
      )}

      {open && <ScheduleModal otherUser={otherUser} onClose={() => setOpen(false)} onCreate={create} />}
    </div>
  );
}
