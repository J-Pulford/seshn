// Convert a pasted Spotify / SoundCloud / YouTube URL into an embeddable
// player descriptor. Used by the profile "Featured work" section. Anything we
// can't recognise falls back to a plain link.

export interface Embed {
  kind: "spotify" | "soundcloud" | "youtube" | "link";
  src: string; // iframe src (or the original URL for "link")
  height: number;
  url: string; // original URL
}

function ytId(url: string): string | null {
  const m =
    url.match(/[?&]v=([A-Za-z0-9_-]{11})/) ||
    url.match(/youtu\.be\/([A-Za-z0-9_-]{11})/) ||
    url.match(/youtube\.com\/(?:embed|shorts)\/([A-Za-z0-9_-]{11})/);
  return m ? m[1] : null;
}

export function embedFor(rawUrl: string): Embed {
  const url = (rawUrl || "").trim();
  // Spotify: open.spotify.com/{track|album|playlist|artist|episode|show}/{id}
  const sp = url.match(/open\.spotify\.com\/(track|album|playlist|artist|episode|show)\/([A-Za-z0-9]+)/);
  if (sp) {
    return { kind: "spotify", src: `https://open.spotify.com/embed/${sp[1]}/${sp[2]}`, height: sp[1] === "track" ? 152 : 352, url };
  }
  // YouTube
  const yt = ytId(url);
  if (yt) {
    return { kind: "youtube", src: `https://www.youtube.com/embed/${yt}`, height: 0, url }; // 0 => use 16:9 aspect
  }
  // SoundCloud (any track/set/user URL) — let the widget resolve it.
  if (/soundcloud\.com\//.test(url)) {
    const enc = encodeURIComponent(url);
    return { kind: "soundcloud", src: `https://w.soundcloud.com/player/?url=${enc}&color=%232CCB73&auto_play=false&hide_related=true&show_comments=false&show_reposts=false&visual=false`, height: 166, url };
  }
  return { kind: "link", src: url, height: 0, url };
}

// True if a URL maps to a real embed (not just a link) — used to validate the
// "Featured work" inputs before saving.
export function isEmbeddable(url: string): boolean {
  return embedFor(url).kind !== "link";
}

// True for a directly-playable audio file (an uploaded portfolio track, or any
// link to a raw audio file) — rendered with a native <audio> player.
export function isAudioUrl(url: string): boolean {
  return /\.(mp3|wav|m4a|aac|ogg|flac)(\?|#|$)/i.test(url) || /\/portfolio-audio\//.test(url);
}
