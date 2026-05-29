-- Seshn — make conversation updates live (fixes inbox unread + DM badge)
--
-- The app's live unread behaviour relies on subscribeToMyConversations, which
-- listens for UPDATE events on public.conversations (the row's last_message_*
-- columns are bumped by the tg_messages_touch_convo trigger on every send).
-- But conversations was never added to the supabase_realtime publication
-- (0004 only added `messages`, 0007 added `notifications`), so that
-- subscription never fired: the inbox sidebar's unread dot/preview and the
-- nav DM badge didn't update until a manual reload.
--
-- Fix: add conversations to the realtime publication. REPLICA IDENTITY FULL so
-- realtime can evaluate the participant RLS policy (user_a/user_b) against the
-- updated row and deliver it only to the two participants.

alter table public.conversations replica identity full;
alter publication supabase_realtime add table public.conversations;
