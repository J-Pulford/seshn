# 07 — Messaging & notifications

DMs, attachments, the bell, realtime delivery, email notifications.

## How messaging works

- Two-person conversations only. A `conversations` row uniquely identifies a pair `(user_a, user_b)` — when X first DMs Y, a row is created.
- Each `messages` row is one message: `sender_id`, `body`, optional `attachment_url`.
- Realtime: both clients subscribe to a Postgres channel on the conversation, so new messages appear without refresh.
- The DB-level `tg_notify_message_received` trigger inserts a `notifications` row for the recipient. The bell updates in realtime.

## Scenario: "I sent a message but they didn't get it"

**First check** — did the message actually save?

```sql
-- Find the conversation between the two users
select id, user_a, user_b, created_at
  from public.conversations
  where (user_a = '[sender_uuid]' and user_b = '[recipient_uuid]')
     or (user_a = '[recipient_uuid]' and user_b = '[sender_uuid]');

-- Then list recent messages on it
select id, sender_id, created_at, length(body) as body_chars,
       attachment_url is not null as has_attachment
  from public.messages
  where conversation_id = '[conversation_uuid]'
  order by created_at desc
  limit 10;
```

(Don't `select body` — see the PII note in `02-cookbook.md`.)

**Diagnosis**

| Finding | Meaning |
|---|---|
| Message row exists, recent | Message was saved. Issue is on the recipient side. |
| Message row missing | Send failed. Issue is on the sender side. |
| Conversation row missing | They never started a thread. Maybe they were on the profile page but didn't click "Message". |

**For "saved but recipient doesn't see it":**

1. Check the recipient's notification:
   ```sql
   select id, kind, conversation_id, created_at, read_at
     from public.notifications
     where user_id = '[recipient_uuid]'
       and conversation_id = '[conversation_uuid]'
     order by created_at desc;
   ```
   If no row → trigger failed → 🚨 escalate.
   If row exists, `read_at IS NULL` → they have a bell notification they haven't opened.
2. Realtime subscription might be down for the recipient (browser tab in background, network blip). They'll see the message when they refresh.
3. They blocked the sender? We don't have a block feature yet — skip this.

**For "send failed":**

1. Network failure during submit. Ask them to retry.
2. The conversation was deleted (rare, we don't expose this). Verify the conversations row still exists.
3. RLS rejection — extremely rare, would mean the recipient is no longer reachable somehow. 🚨 escalate.

## Scenario: "My DM attachment won't upload"

We allow images, audio, PDFs, ZIPs up to 50 MB on DM attachments (separate from avatar/cover at 5 MB).

**Common causes**

1. **File too large** (>50 MB).
2. **Browser disconnected during upload.** Big audio files on flaky wifi.
3. **MIME type rejected.** Some weird formats fall outside our allowed list. Storage bucket policy checks the MIME.
4. **Network throttling.** Some corporate networks throttle multi-MB uploads.

**Resolution**

For 1: ask them to compress or split the file. For audio stems specifically, FLAC is acceptable and much smaller than WAV.

For 2 & 4: try a different network (mobile data, different wifi) or a faster connection.

For 3: ask what file type. Convert if needed.

## Scenario: "My bell shows unread but I can't find the unread item"

**Check what they have unread:**

```sql
select id, kind, gig_id, application_id, conversation_id, created_at
  from public.notifications
  where user_id = '[user_uuid]' and read_at is null
  order by created_at desc;
```

Match `kind` to where to look:

| kind | Where to find it |
|---|---|
| `application_received` | On the gig's applicants list (owner side) |
| `application_accepted` | On the applicant's My applications page (Active tab) |
| `application_rejected` | On the applicant's My applications page (Archived tab) |
| `message_received` | In Inbox, in the named conversation |

If the notification points to a gig/application/conversation that doesn't exist anymore (cascade-delete happened), that's a known dangling-notification case. Mark as read manually (founder approval) or tell them to ignore.

## Scenario: "I'm not getting email notifications"

We don't actually send most things as emails — only the magic-link sign-in email. There's no built-in email-for-every-notification yet.

If the user expected emails for new applications / messages / etc., set expectations:

> Heads up — Seshn doesn't currently send email notifications for in-app activity. You'll see them in your bell when you're on the site, and on your **My applications** / **Inbox** pages. We do plan to add opt-in email digests in future; let me know if you'd want a daily summary so I can add your name to the list.

## Scenario: "I have 4 unread notifications but the bell shows 0"

Cache discrepancy between the badge counter and the actual list.

**First** — verify the source-of-truth count:

```sql
select count(*) from public.notifications
  where user_id = '[user_uuid]' and read_at is null;
```

If the count matches what they say (4), the page just hasn't refreshed its badge. Hard-refresh.

If the count is 0, the database agrees with the badge but they're seeing something stale. They might be looking at an old browser tab.

## Scenario: "Realtime doesn't work for me"

Realtime is opt-in per-table via the `supabase_realtime` publication. The tables enabled are: `messages`, `notifications`.

**Common causes**

1. **Browser blocking websockets.** Some networks block WSS (corporate firewalls). Try mobile data.
2. **Browser tab is backgrounded.** Most browsers throttle background tabs, including websocket message processing. Bringing the tab to focus catches up.
3. **Supabase realtime had a hiccup.** Check status.supabase.com.

**Resolution**

Tell them: "Realtime updates depend on a websocket connection — if you switched networks or backgrounded the tab, you might miss a few. Refresh fixes it. If it's persistent, let me know what browser and network you're on."

## Scenario: "I want to delete a message"

We don't allow message deletion. This is deliberate — DMs are part of the contract negotiation evidence chain.

If they sent something they REALLY regret (a phone number, a slur, an unintended attachment), 🚨 escalate to founder. Founder may delete via SQL with the recipient's consent.

## Investigation checklist for any messaging/notification ticket

1. Identify both users (sender + recipient).
2. Find the conversation row.
3. Check if the message exists in `messages`.
4. Check if the notification was inserted in `notifications`.
5. Check the recipient's `read_at` state.
6. If any of these are missing, the trigger/RLS is the next thing to look at — 🚨 escalate.
