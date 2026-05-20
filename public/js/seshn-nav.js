// Seshn — shared top nav for the in-app pages.
// Loaded as type="text/babel" AFTER seshn-supabase.js. Defines window.SeshnAppNav.
// Pages then do: <SeshnAppNav active="feed" /> (or "browse" | "applications" | "inbox" | "profile" | null).

(function () {
  var h = React.createElement;

  // ── Mobile CSS injection ──────────────────────────────────────────
  // Inline styles can't express media queries, so the nav ships its own
  // stylesheet that handles the desktop → mobile collapse.
  if (typeof document !== "undefined" && !document.getElementById("seshn-nav-css")) {
    var navCss = document.createElement("style");
    navCss.id = "seshn-nav-css";
    navCss.textContent = [
      ".seshn-nav-hamburger { display: none; }",
      ".seshn-nav-mobile-menu { display: none; }",
      "@media (max-width: 720px) {",
      "  .seshn-nav-root { padding: 0 14px !important; gap: 4px; }",
      "  .seshn-nav-links, .seshn-nav-search { display: none !important; }",
      "  .seshn-nav-hamburger { display: inline-flex; }",
      "  .seshn-nav-post-text { display: none; }",
      "  .seshn-notifications-panel { width: calc(100vw - 28px) !important; right: -8px !important; }",
      "  .seshn-nav-mobile-menu.open { display: flex; }",
      "}"
    ].join("\n");
    document.head.appendChild(navCss);
  }

  function navInitials(name) {
    if (!name) return "··";
    var parts = name.trim().split(/\s+/).filter(Boolean);
    if (parts.length === 0) return "··";
    if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
    return (parts[0][0] + parts[1][0]).toUpperCase();
  }

  function IconSvg(props) {
    var size = props.size || 18;
    var common = { width: size, height: size, viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: 2, strokeLinecap: "round", strokeLinejoin: "round", style: { display: "block" } };
    if (props.kind === "search")
      return h("svg", common, h("circle", { cx: 11, cy: 11, r: 7 }), h("path", { d: "m20 20-3.5-3.5" }));
    if (props.kind === "message")
      return h("svg", common, h("path", { d: "M21 12a8 8 0 0 1-12 7l-5 1 1-5a8 8 0 1 1 16-3z" }));
    if (props.kind === "bell")
      return h("svg", common, h("path", { d: "M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9" }), h("path", { d: "M10 21a2 2 0 0 0 4 0" }));
    return null;
  }

  function relativeTime(iso) {
    if (!iso) return "";
    var t = new Date(iso).getTime();
    var diff = Date.now() - t;
    var s = Math.round(diff / 1000);
    if (s < 60) return "just now";
    var m = Math.round(s / 60);
    if (m < 60) return m + "m";
    var hrs = Math.round(m / 60);
    if (hrs < 24) return hrs + "h";
    var d = Math.round(hrs / 24);
    if (d < 7) return d + "d";
    return new Date(iso).toLocaleDateString(undefined, { month: "short", day: "numeric" });
  }

  function notifText(n) {
    var actor = (n.actor && (n.actor.display_name || n.actor.username)) || "Someone";
    var gigTitle = (n.gig && (n.gig.title || n.gig.role)) || "your gig";
    if (n.kind === "application_received") return actor + " applied to " + gigTitle;
    if (n.kind === "application_accepted") return actor + " accepted your application to " + gigTitle;
    if (n.kind === "application_rejected") return actor + " passed on your application to " + gigTitle;
    if (n.kind === "message_received")    return actor + " sent you a message";
    return "New activity";
  }

  function notifHref(n) {
    if (n.kind === "application_received" && n.gig_id) return "gig.html?id=" + encodeURIComponent(n.gig_id);
    if ((n.kind === "application_accepted" || n.kind === "application_rejected") && n.gig_id) return "gig.html?id=" + encodeURIComponent(n.gig_id);
    if (n.kind === "message_received" && n.conversation_id) return "inbox.html?c=" + encodeURIComponent(n.conversation_id);
    return null;
  }

  function iconBtnStyle(isActive) {
    return {
      display: "inline-flex", alignItems: "center", justifyContent: "center",
      width: 34, height: 34, borderRadius: 8,
      color: isActive ? "var(--accent-d)" : "var(--ink-2)",
      background: isActive ? "var(--accent-bg)" : "transparent",
      textDecoration: "none", cursor: "pointer", border: "none",
      position: "relative"
    };
  }

  function navBadge(count) {
    return h("span", {
      style: {
        position: "absolute", top: 4, right: 4,
        minWidth: 16, height: 16, padding: "0 4px",
        borderRadius: 999,
        background: "var(--accent)", color: "#062c19",
        fontFamily: "var(--font-display)", fontWeight: 700, fontSize: 10,
        display: "inline-flex", alignItems: "center", justifyContent: "center",
        border: "2px solid var(--frame)", boxSizing: "content-box", lineHeight: 1
      }
    }, count > 9 ? "9+" : String(count));
  }

  function NotificationRow(props) {
    var n = props.notif;
    var actor = n.actor || {};
    var href = notifHref(n);
    var unread = !n.read_at;
    return h("button", {
      onClick: function () { props.onClick(n); },
      style: {
        display: "flex", gap: 10, alignItems: "flex-start",
        padding: "12px 14px",
        background: unread ? "var(--accent-bg)" : "transparent",
        border: "none", borderBottom: "1px solid var(--line-soft)",
        textAlign: "left", cursor: href ? "pointer" : "default",
        width: "100%", fontFamily: "var(--font-body)", color: "var(--ink)",
        opacity: unread ? 1 : 0.85
      }
    },
      h("span", {
        style: {
          width: 32, height: 32, borderRadius: "50%",
          background: "var(--ph)", overflow: "hidden", flexShrink: 0,
          display: "inline-flex", alignItems: "center", justifyContent: "center",
          fontFamily: "var(--font-display)", fontWeight: 700, fontSize: 11, color: "var(--ink-3)"
        }
      },
        actor.avatar_url
          ? h("img", { src: actor.avatar_url, alt: "", style: { width: "100%", height: "100%", objectFit: "cover", display: "block" } })
          : navInitials(actor.display_name || actor.username)
      ),
      h("span", { style: { flex: 1, minWidth: 0, display: "flex", flexDirection: "column", gap: 2 } },
        h("span", { style: { fontSize: 12.5, lineHeight: 1.4, color: "var(--ink)" } }, notifText(n)),
        h("span", { style: { fontSize: 11, color: "var(--ink-3)" } }, relativeTime(n.created_at))
      ),
      unread && h("span", { style: { width: 8, height: 8, borderRadius: "50%", background: "var(--accent-d)", flexShrink: 0, marginTop: 6 } })
    );
  }

  // Bell + dropdown panel. Manages its own open state, unread count, and items.
  function NotificationsBell() {
    var openState = React.useState(false);
    var open = openState[0], setOpen = openState[1];
    var itemsState = React.useState(null); // null until first open
    var items = itemsState[0], setItems = itemsState[1];
    var unreadState = React.useState(0);
    var unread = unreadState[0], setUnread = unreadState[1];
    var containerRef = React.useRef(null);

    // Initial unread fetch + realtime subscription (run while signed in).
    React.useEffect(function () {
      if (!window.seshn || !window.seshn.getUnreadNotificationCount) return;
      var cancelled = false;
      var unsub = function () {};
      function refreshCount() {
        window.seshn.getUnreadNotificationCount().then(function (n) {
          if (!cancelled) setUnread(n);
        }).catch(function () {});
      }
      window.seshn.getUser().then(function (u) {
        if (!u || cancelled) return;
        refreshCount();
        window.seshn.subscribeToNotifications(function () {
          refreshCount();
          // If the panel is already open, refetch so the new row appears.
          setItems(function (prev) {
            if (prev === null) return prev;
            window.seshn.listNotifications({ limit: 30 }).then(function (list) {
              if (!cancelled) setItems(list);
            }).catch(function () {});
            return prev;
          });
        }).then(function (u2) { if (cancelled) u2(); else unsub = u2; });
      });
      return function () { cancelled = true; try { unsub(); } catch (e) {} };
    }, []);

    // Close on outside click / Escape.
    React.useEffect(function () {
      if (!open) return;
      function onClick(e) {
        if (containerRef.current && !containerRef.current.contains(e.target)) setOpen(false);
      }
      function onKey(e) { if (e.key === "Escape") setOpen(false); }
      document.addEventListener("mousedown", onClick);
      document.addEventListener("keydown", onKey);
      return function () {
        document.removeEventListener("mousedown", onClick);
        document.removeEventListener("keydown", onKey);
      };
    }, [open]);

    function toggle() {
      if (!open) {
        // Lazy-load on first open, and re-fetch every open to stay current.
        window.seshn.listNotifications({ limit: 30 }).then(setItems).catch(function () { setItems([]); });
      }
      setOpen(!open);
    }

    function onClickItem(n) {
      if (!n.read_at) {
        window.seshn.markNotificationsRead([n.id]);
        setUnread(function (x) { return Math.max(0, x - 1); });
        setItems(function (prev) {
          if (!prev) return prev;
          return prev.map(function (x) {
            return x.id === n.id ? Object.assign({}, x, { read_at: new Date().toISOString() }) : x;
          });
        });
      }
      var href = notifHref(n);
      if (href) window.location.href = href;
    }

    function markAll() {
      window.seshn.markAllNotificationsRead().then(function () {
        setUnread(0);
        setItems(function (prev) {
          if (!prev) return prev;
          var ts = new Date().toISOString();
          return prev.map(function (x) { return x.read_at ? x : Object.assign({}, x, { read_at: ts }); });
        });
      });
    }

    return h("div", { ref: containerRef, style: { position: "relative" } },
      h("button", {
        type: "button",
        onClick: toggle,
        style: iconBtnStyle(open),
        "aria-label": "Notifications" + (unread > 0 ? " (" + unread + " unread)" : ""),
        "aria-expanded": open
      },
        h(IconSvg, { kind: "bell", size: 18 }),
        unread > 0 && navBadge(unread)
      ),
      open && h("div", {
        className: "seshn-notifications-panel",
        style: {
          position: "absolute", right: 0, top: "calc(100% + 8px)",
          width: 360, maxHeight: 520, overflowY: "auto",
          background: "var(--frame)", border: "1px solid var(--line)",
          borderRadius: 12, boxShadow: "0 20px 48px rgba(0,0,0,0.18)",
          zIndex: 110, display: "flex", flexDirection: "column"
        }
      },
        h("div", {
          style: {
            padding: "14px 16px", borderBottom: "1px solid var(--line)",
            display: "flex", alignItems: "center", justifyContent: "space-between"
          }
        },
          h("span", { style: { fontFamily: "var(--font-display)", fontWeight: 600, fontSize: 14 } }, "Notifications"),
          unread > 0 && h("button", {
            onClick: markAll,
            style: { border: "none", background: "transparent", cursor: "pointer", color: "var(--ink-3)", fontSize: 11, fontFamily: "var(--font-display)", fontWeight: 600 }
          }, "Mark all read")
        ),
        items === null
          ? h("div", { style: { padding: 20, textAlign: "center", color: "var(--ink-3)", fontSize: 12 } }, "Loading…")
          : items.length === 0
            ? h("div", { style: { padding: "32px 20px", textAlign: "center", color: "var(--ink-3)" } },
                h("div", { style: { fontFamily: "var(--font-display)", fontWeight: 600, fontSize: 14, color: "var(--ink-2)", marginBottom: 4 } }, "All caught up"),
                h("div", { style: { fontSize: 12 } }, "We'll let you know when something happens.")
              )
            : h("div", { style: { display: "flex", flexDirection: "column" } },
                items.map(function (n) { return h(NotificationRow, { key: n.id, notif: n, onClick: onClickItem }); })
              )
      )
    );
  }

  // Live-as-you-type search in the nav. Searches both profiles and gigs in
  // parallel and shows up to ~5 of each in a single dropdown. Enter on a
  // selected row navigates; clicking outside or pressing Escape closes.
  function NavSearch() {
    var q = React.useState("");
    var query = q[0], setQuery = q[1];
    var d = React.useState({ profiles: [], gigs: [], loading: false });
    var data = d[0], setData = d[1];
    var o = React.useState(false);
    var open = o[0], setOpen = o[1];
    var hi = React.useState(0);
    var highlight = hi[0], setHighlight = hi[1];
    var containerRef = React.useRef(null);
    var inputRef = React.useRef(null);

    // Debounced fetch
    React.useEffect(function () {
      var s = query.trim();
      if (!s || s.length < 2) {
        setData({ profiles: [], gigs: [], loading: false });
        return;
      }
      setData(function (prev) { return { profiles: prev.profiles, gigs: prev.gigs, loading: true }; });
      var t = setTimeout(function () {
        if (!window.seshn) return;
        Promise.all([
          window.seshn.listProfiles({ search: s, limit: 5 }).catch(function () { return []; }),
          window.seshn.listGigs({ search: s, limit: 5 }).catch(function () { return []; })
        ]).then(function (r) {
          setData({ profiles: r[0] || [], gigs: r[1] || [], loading: false });
          setHighlight(0);
        });
      }, 180);
      return function () { clearTimeout(t); };
    }, [query]);

    React.useEffect(function () {
      if (!open) return;
      function onDown(e) {
        if (containerRef.current && !containerRef.current.contains(e.target)) setOpen(false);
      }
      document.addEventListener("mousedown", onDown);
      return function () { document.removeEventListener("mousedown", onDown); };
    }, [open]);

    // Flat ordered list of items for keyboard nav.
    var items = [];
    (data.profiles || []).forEach(function (p) { items.push({ type: "profile", item: p }); });
    (data.gigs || []).forEach(function (g) { items.push({ type: "gig", item: g }); });

    function go(target) {
      if (target.type === "profile") {
        window.location.href = "profile.html?u=" + encodeURIComponent(target.item.username || "");
      } else {
        window.location.href = "gig.html?id=" + encodeURIComponent(target.item.id);
      }
    }

    function onKey(e) {
      if (e.key === "Escape") { setOpen(false); e.currentTarget.blur(); return; }
      if (!open || items.length === 0) return;
      if (e.key === "ArrowDown") { e.preventDefault(); setHighlight((highlight + 1) % items.length); }
      else if (e.key === "ArrowUp") { e.preventDefault(); setHighlight((highlight - 1 + items.length) % items.length); }
      else if (e.key === "Enter") { e.preventDefault(); go(items[highlight]); }
    }

    return h("div", {
      ref: containerRef,
      style: { flex: 1, maxWidth: 360, marginLeft: 16, position: "relative" }
    },
      h("div", {
        style: {
          display: "flex", alignItems: "center", gap: 8,
          padding: "8px 13px",
          background: "var(--surface-2)",
          borderRadius: 999, border: "1px solid " + (open ? "var(--ink-3)" : "var(--line)"),
          color: "var(--ink-3)"
        }
      },
        h(IconSvg, { kind: "search", size: 14 }),
        h("input", {
          ref: inputRef,
          type: "text",
          value: query,
          placeholder: "Search artists, gigs…",
          onChange: function (e) { setQuery(e.target.value); setOpen(true); },
          onFocus: function () { setOpen(true); },
          onKeyDown: onKey,
          style: {
            flex: 1, border: "none", outline: "none", background: "transparent",
            fontSize: 12.5, fontFamily: "var(--font-body)", color: "var(--ink)", minWidth: 0
          }
        }),
        query && h("button", {
          type: "button",
          onClick: function () { setQuery(""); setData({ profiles: [], gigs: [], loading: false }); if (inputRef.current) inputRef.current.focus(); },
          style: { background: "transparent", border: "none", cursor: "pointer", color: "var(--ink-3)", padding: 0, fontSize: 16, lineHeight: 1 },
          "aria-label": "Clear search"
        }, "×")
      ),
      open && query.trim().length >= 2 && h("div", {
        style: {
          position: "absolute", left: 0, right: 0, top: "calc(100% + 6px)",
          background: "var(--frame)", border: "1px solid var(--line)",
          borderRadius: 12, boxShadow: "0 16px 36px rgba(0,0,0,0.14)",
          maxHeight: 460, overflowY: "auto", zIndex: 110
        }
      },
        data.loading && items.length === 0 && h("div", { style: { padding: 14, color: "var(--ink-3)", fontSize: 12 } }, "Searching…"),
        !data.loading && items.length === 0 && h("div", { style: { padding: 14, color: "var(--ink-3)", fontSize: 12, textAlign: "center" } },
          "No matches for \"" + query.trim() + "\""
        ),
        items.length > 0 && [
          (data.profiles || []).length > 0 && h("div", {
            key: "ph",
            style: { padding: "10px 14px 4px", fontFamily: "var(--font-display)", fontWeight: 500, fontSize: 10, letterSpacing: "0.14em", textTransform: "uppercase", color: "var(--ink-4)" }
          }, "Artists"),
          (data.profiles || []).map(function (p, i) {
            var idx = i;
            return h("button", {
              key: "p-" + p.id,
              onClick: function () { go({ type: "profile", item: p }); },
              onMouseEnter: function () { setHighlight(idx); },
              style: {
                display: "flex", gap: 10, alignItems: "center", padding: "8px 12px",
                width: "100%", border: "none", textAlign: "left", cursor: "pointer",
                background: highlight === idx ? "var(--surface-2)" : "transparent",
                fontFamily: "var(--font-body)"
              }
            },
              h("span", {
                style: {
                  width: 28, height: 28, borderRadius: "50%", background: "var(--ph)", overflow: "hidden",
                  display: "inline-flex", alignItems: "center", justifyContent: "center",
                  fontFamily: "var(--font-display)", fontWeight: 700, fontSize: 10, color: "var(--ink-3)", flexShrink: 0
                }
              },
                p.avatar_url
                  ? h("img", { src: p.avatar_url, alt: "", style: { width: "100%", height: "100%", objectFit: "cover", display: "block" } })
                  : navInitials(p.display_name || p.username)
              ),
              h("span", { style: { flex: 1, minWidth: 0, display: "flex", flexDirection: "column", gap: 1 } },
                h("span", { style: { fontFamily: "var(--font-display)", fontWeight: 600, fontSize: 13, color: "var(--ink)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" } }, p.display_name || p.username),
                h("span", { style: { fontSize: 11, color: "var(--ink-3)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" } },
                  "@" + (p.username || "") + ((p.roles && p.roles[0]) ? " · " + p.roles[0] : "") + (p.location ? " · " + p.location : "")
                )
              )
            );
          }),
          (data.gigs || []).length > 0 && h("div", {
            key: "gh",
            style: { padding: "10px 14px 4px", fontFamily: "var(--font-display)", fontWeight: 500, fontSize: 10, letterSpacing: "0.14em", textTransform: "uppercase", color: "var(--ink-4)", borderTop: (data.profiles || []).length > 0 ? "1px solid var(--line-soft)" : "none" }
          }, "Gigs"),
          (data.gigs || []).map(function (g, i) {
            var idx = (data.profiles || []).length + i;
            var owner = g.owner || {};
            return h("button", {
              key: "g-" + g.id,
              onClick: function () { go({ type: "gig", item: g }); },
              onMouseEnter: function () { setHighlight(idx); },
              style: {
                display: "flex", flexDirection: "column", gap: 2, padding: "10px 12px",
                width: "100%", border: "none", textAlign: "left", cursor: "pointer",
                background: highlight === idx ? "var(--surface-2)" : "transparent",
                fontFamily: "var(--font-body)"
              }
            },
              h("span", { style: { fontFamily: "var(--font-display)", fontWeight: 600, fontSize: 13, color: "var(--ink)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" } }, g.title),
              h("span", { style: { fontSize: 11, color: "var(--ink-3)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" } },
                (g.role || "Gig") + (owner.display_name ? " · by " + owner.display_name : "")
              )
            );
          })
        ]
      )
    );
  }

  // SeshnAppNav — sticky top nav used on every signed-in page.
  // Props:
  //   active: "feed" | "browse" | "applications" | "inbox" | "profile" | null
  //   showSearch: bool (default true)
  //   showPostButton: bool (default true)
  function SeshnAppNav(props) {
    var active = props.active || null;
    var showSearch = props.showSearch !== false;
    var showPostButton = props.showPostButton !== false;

    var meState = React.useState(null);
    var me = meState[0], setMe = meState[1];

    var unreadConvosState = React.useState(0);
    var unreadConvos = unreadConvosState[0], setUnreadConvos = unreadConvosState[1];

    React.useEffect(function () {
      if (!window.seshn) return;
      window.seshn.getProfile().then(function (p) { setMe(p); }).catch(function () {});
      function onUpdate(e) {
        if (e && e.detail) setMe(e.detail);
        else window.seshn.getProfile().then(function (p) { setMe(p); }).catch(function () {});
      }
      window.addEventListener("seshn:profile-updated", onUpdate);
      return function () { window.removeEventListener("seshn:profile-updated", onUpdate); };
    }, []);

    React.useEffect(function () {
      if (!window.seshn || !window.seshn.getUnreadCount) return;
      var cancelled = false;
      var unsub = function () {};
      function refresh() {
        window.seshn.getUnreadCount().then(function (n) { if (!cancelled) setUnreadConvos(n); }).catch(function () {});
      }
      window.seshn.getUser().then(function (u) {
        if (!u || cancelled) return;
        refresh();
        if (window.seshn.subscribeToMyConversations) {
          window.seshn.subscribeToMyConversations(refresh).then(function (u2) { if (cancelled) u2(); else unsub = u2; });
        }
      });
      return function () { cancelled = true; try { unsub(); } catch (e) {} };
    }, []);

    var menuState = React.useState(false);
    var menuOpen = menuState[0], setMenuOpen = menuState[1];

    var displayName = me && me.display_name ? me.display_name : "";
    var initials = navInitials(displayName);
    var profileHref = me && me.username ? "profile.html?u=" + encodeURIComponent(me.username) : "profile.html";

    function navLinkStyle(isActive) {
      return {
        display: "inline-flex", alignItems: "center", gap: 6,
        padding: "6px 10px", borderRadius: 8,
        color: isActive ? "var(--ink)" : "var(--ink-2)",
        background: isActive ? "var(--surface-2)" : "transparent",
        textDecoration: "none",
        fontFamily: "var(--font-display)", fontWeight: 500, fontSize: 13
      };
    }

    function mobileMenuLinkStyle(isActive) {
      return {
        display: "block",
        padding: "14px 18px",
        borderBottom: "1px solid var(--line-soft)",
        color: isActive ? "var(--accent-d)" : "var(--ink)",
        background: isActive ? "var(--accent-bg)" : "transparent",
        textDecoration: "none",
        fontFamily: "var(--font-display)", fontWeight: 600, fontSize: 15
      };
    }

    return h(React.Fragment, null,
      h("nav", {
        className: "seshn-nav-root",
        style: {
          background: "var(--surface)",
          borderBottom: "1px solid var(--line)",
          padding: "0 28px", height: 58,
          display: "flex", alignItems: "center", justifyContent: "space-between",
          position: "sticky", top: 0, zIndex: 100
        }
      },
        // Left: logo + tabs + search
        h("div", { style: { display: "flex", alignItems: "center", gap: 12, flex: 1, minWidth: 0 } },
          h("a", { href: "feed.html", className: "logo", style: { textDecoration: "none" } }, "Seshn"),
          h("div", { className: "seshn-nav-links", style: { display: "flex", alignItems: "center", gap: 4, marginLeft: 6 } },
            h("a", { href: "feed.html", style: navLinkStyle(active === "feed") }, "Feed"),
            h("a", { href: "browse.html", style: navLinkStyle(active === "browse") }, "Browse"),
            h("a", { href: "applications.html", style: navLinkStyle(active === "applications") }, "Applications")
          ),
          showSearch && h("div", { className: "seshn-nav-search", style: { display: "contents" } }, h(NavSearch))
        ),
        // Right: post button, inbox, bell, avatar, hamburger
        h("div", { style: { display: "flex", alignItems: "center", gap: 8 } },
          showPostButton && h("a", { href: "post.html", className: "btn primary sm" },
            h("span", { className: "seshn-nav-post-text" }, "+ Post a gig"),
            h("span", { className: "seshn-nav-post-icon", style: { display: "none" } }, "+")
          ),
          h("a", {
            href: "inbox.html",
            style: iconBtnStyle(active === "inbox"),
            "aria-label": "Inbox" + (unreadConvos > 0 ? " (" + unreadConvos + " unread)" : "")
          },
            h(IconSvg, { kind: "message", size: 18 }),
            unreadConvos > 0 && navBadge(unreadConvos)
          ),
          h(NotificationsBell),
          h("a", { href: profileHref, style: { textDecoration: "none" }, "aria-label": "Your profile" },
            h("span", {
              className: "avatar md",
              style: {
                background: me && me.avatar_url ? "var(--ph)" : "linear-gradient(135deg,#a8ebc8,#2CCB73)",
                color: "#062c19", fontSize: 12,
                fontFamily: "var(--font-display)", fontWeight: 700,
                border: active === "profile" ? "2px solid var(--ink)" : "2px solid transparent",
                overflow: "hidden",
                width: 32, height: 32, display: "inline-flex", alignItems: "center", justifyContent: "center", borderRadius: "50%"
              }
            },
              me && me.avatar_url
                ? h("img", { src: me.avatar_url, alt: "", style: { width: "100%", height: "100%", borderRadius: "50%", objectFit: "cover", display: "block" } })
                : initials
            )
          ),
          // Hamburger: hidden on desktop via CSS, shown on mobile.
          h("button", {
            type: "button",
            className: "seshn-nav-hamburger",
            onClick: function () { setMenuOpen(!menuOpen); },
            style: Object.assign({}, iconBtnStyle(false), {
              alignItems: "center", justifyContent: "center"
            }),
            "aria-label": menuOpen ? "Close menu" : "Open menu",
            "aria-expanded": menuOpen
          },
            menuOpen
              ? h("svg", { width: 18, height: 18, viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: 2, strokeLinecap: "round" },
                  h("path", { d: "M6 6l12 12M18 6L6 18" }))
              : h("svg", { width: 18, height: 18, viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: 2, strokeLinecap: "round" },
                  h("path", { d: "M4 7h16M4 12h16M4 17h16" }))
          )
        )
      ),
      // Mobile menu — full-width drop-down with the same links + search.
      h("div", {
        className: "seshn-nav-mobile-menu" + (menuOpen ? " open" : ""),
        style: {
          flexDirection: "column",
          background: "var(--surface)",
          borderBottom: "1px solid var(--line)",
          position: "sticky", top: 58, zIndex: 99
        }
      },
        h("a", { href: "feed.html",         style: mobileMenuLinkStyle(active === "feed"),         onClick: function () { setMenuOpen(false); } }, "Feed"),
        h("a", { href: "browse.html",       style: mobileMenuLinkStyle(active === "browse"),       onClick: function () { setMenuOpen(false); } }, "Browse"),
        h("a", { href: "applications.html", style: mobileMenuLinkStyle(active === "applications"), onClick: function () { setMenuOpen(false); } }, "Applications"),
        h("a", { href: "settings.html",     style: mobileMenuLinkStyle(false),                     onClick: function () { setMenuOpen(false); } }, "Settings"),
        showSearch && h("div", { style: { padding: "12px 14px" } }, h(NavSearch))
      )
    );
  }

  window.SeshnAppNav = SeshnAppNav;
})();
