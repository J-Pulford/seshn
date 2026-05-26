# 05 — Profiles

Profile edits, avatars, usernames, bios, connected accounts (Spotify, SoundCloud, Instagram, YouTube).

## Scenario: "My avatar won't upload"

**First check** — what's their current avatar state?

```sql
select id, username, avatar_url
  from public.profiles
  where username = '[username]';
```

If `avatar_url` is empty, they've never had one uploaded successfully. If it has a URL, but they can't change it, an old upload is sticking.

**Common causes**

1. **File too large.** We cap avatars at 5 MB. Phone photos are routinely 6–12 MB.
2. **Wrong file type.** Only JPG, PNG, WebP, GIF are allowed.
3. **Browser permission issue.** Safari sometimes blocks file uploads on iOS if "Camera" permission was denied (even for "photo library" uploads).
4. **Storage bucket misconfigured** — rare. Check Storage → avatars bucket exists and is public.
5. **They uploaded but the page didn't refresh.** Their new avatar is live but their browser cached the old one.

**Resolution**

For 1: tell them to compress (any phone camera app has "low quality" / "small" export, or use a free web compressor).

For 2: tell them what types are allowed and ask them to convert (e.g. HEIC → JPEG).

For 3: ask them to try a different browser or device — most reliably resolves it.

For 5: ask them to hard-refresh (`Cmd-Shift-R` / `Ctrl-Shift-R`).

For 4: 🚨 escalate.

## Scenario: "I want to change my username"

We don't allow this in the UI yet. The username is the unique URL handle and changing it would break inbound links.

**Default reply**: usernames are permanent for now. Apologise (this is one of the cases where apology is warranted — it's a product limitation, not a user error). Offer to file the request as a feature ask for the founder to consider.

**Exception**: if the username contains their real name and they're going through a privacy or safety situation (e.g. stalker, doxxing, gender transition), this is a 🚨 escalate. The founder will do it manually via SQL.

## Scenario: "Bio / location / pronouns won't save"

**First check** — does the save work? Look at `updated_at`:

```sql
select id, username, display_name, bio, location, pronouns, updated_at
  from public.profiles
  where username = '[username]';
```

If `updated_at` is recent (matches when they tried to save), the save worked — they're probably looking at a cached page. Hard-refresh.

If `updated_at` is old, the save genuinely failed. Possible causes:

- They violated a `check` constraint (e.g. `bio` capped at 2000 chars). Get them to count the characters or send the text they were trying to save.
- Browser is in a weird state — sign out and back in.
- RLS is rejecting the update — extremely rare. 🚨 escalate.

## Scenario: "My display name shows up wrong somewhere"

This is usually a caching issue. The display name is cached in several places:

- The browser's local React state
- Any conversation rows the user appears in (DENORMALIZED — the message itself only stores `sender_id`, but the UI joins to `profiles` so the live name does update)
- Notification messages ("X applied to your gig") use the live name via join, so these update immediately

If they're seeing an old name in *one specific place*, it's almost certainly that page's React state — refresh fixes it.

If they're seeing an old name *everywhere*, the save didn't take effect. Check `updated_at` as above.

## Scenario: "Spotify won't connect" (or SoundCloud, Instagram, YouTube)

**Background**: We use OAuth + PKCE to fetch the user's public profile + headline stats from each platform. We DON'T persist their tokens; we throw the token away after the fetch and only store the public stats in `connected_accounts.stats` (a jsonb blob).

This means: every connection is a fresh OAuth round-trip. There's no token to expire.

**Common causes**

1. **They cancelled the OAuth flow.** Spotify shows a "Cancel" button; users sometimes click it accidentally. Solution: try again.
2. **Pop-up blocker.** Our OAuth flow uses a redirect, not a pop-up, so this shouldn't matter — but some users have aggressive browser settings. Try another browser.
3. **Spotify/etc account is private.** Some platforms reject OAuth scopes for private accounts. They need to make their profile public OR connect a different account.
4. **Our OAuth credentials are misconfigured.** Check the provider's developer console. 🚨 escalate.

**Check what we have on file**

```sql
select user_id, provider, external_id, display_name, profile_url,
       stats, connected_at, updated_at
  from public.connected_accounts
  where user_id = '[user_uuid]';
```

If there's a row, they connected at some point — they may want to refresh stats (which is just "re-connect" in our model).

## Scenario: "My pro badge isn't showing"

The pro badge is the green checkmark next to the display name. Driven by:

```sql
select id, username, is_pro from public.profiles where username = '[username]';
```

`is_pro` is set manually by the founder (no self-service yet). If a user thinks they should have it, ask them why — they probably bought it or were promised it. 🚨 escalate to founder unless the answer is obvious.

## Scenario: "My profile cover image is broken"

Same pattern as avatar:

```sql
select id, username, cover_url from public.profiles where username = '[username]';
```

The `covers` bucket is separate from `avatars`. Storage logic is otherwise identical (5 MB cap, image types only).

## Scenario: Other users are seeing different info than I see on my own profile

If user X says "my bio shows fine to me but my collaborator says they see something else", the most common cause is RLS — but `profiles` is fully public-read with no filtering, so RLS shouldn't differentiate.

Real causes:

- **Browser cache on the other party's device.** Ask them to hard-refresh.
- **CDN cache on the avatar/cover image.** Image CDN caching can delay an updated image by a few minutes. Adding `?t=<timestamp>` to the URL forces a fresh fetch — but that's a code-side fix, not something the user can do.
- **They're looking at a stale link** to an old version of the profile (this shouldn't happen with our URL structure, but worth ruling out).

## Investigation checklist for any profile ticket

1. Confirm you have the right user (username, not display name).
2. Check `profiles` table for the relevant column.
3. Check `updated_at` against the time they tried to save.
4. If it's an image: check Storage for the actual file.
5. If it's a connected account: check `connected_accounts` and the provider's status page (e.g. Spotify dev status).
