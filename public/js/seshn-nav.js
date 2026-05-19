// Seshn — shared top nav for the in-app pages.
// Loaded as type="text/babel" AFTER seshn-supabase.js. Defines window.SeshnAppNav.
// Pages then do: <SeshnAppNav active="feed" /> (or "browse" | "applications" | "inbox" | "profile" | null).

(function () {
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
      return React.createElement("svg", common, React.createElement("circle", { cx: 11, cy: 11, r: 7 }), React.createElement("path", { d: "m20 20-3.5-3.5" }));
    if (props.kind === "message")
      return React.createElement("svg", common, React.createElement("path", { d: "M21 12a8 8 0 0 1-12 7l-5 1 1-5a8 8 0 1 1 16-3z" }));
    if (props.kind === "bell")
      return React.createElement("svg", common, React.createElement("path", { d: "M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9" }), React.createElement("path", { d: "M10 21a2 2 0 0 0 4 0" }));
    return null;
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

    var unreadState = React.useState(0);
    var unread = unreadState[0], setUnread = unreadState[1];

    React.useEffect(function () {
      if (!window.seshn) return;
      window.seshn.getProfile().then(function (p) { setMe(p); }).catch(function () {});
    }, []);

    React.useEffect(function () {
      if (!window.seshn || !window.seshn.getUnreadCount) return;
      var cancelled = false;
      var unsub = function () {};
      function refresh() {
        window.seshn.getUnreadCount().then(function (n) { if (!cancelled) setUnread(n); }).catch(function () {});
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

    var displayName = me && me.display_name ? me.display_name : "";
    var initials = navInitials(displayName);
    var profileHref = me && me.username ? "profile.html?u=" + encodeURIComponent(me.username) : "profile.html";

    function navLinkStyle(isActive) {
      return {
        display: "inline-flex",
        alignItems: "center",
        gap: 6,
        padding: "6px 10px",
        borderRadius: 8,
        color: isActive ? "var(--ink)" : "var(--ink-2)",
        background: isActive ? "var(--surface-2)" : "transparent",
        textDecoration: "none",
        fontFamily: "var(--font-display)",
        fontWeight: 500,
        fontSize: 13
      };
    }

    function iconBtnStyle(isActive) {
      return {
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        width: 34, height: 34, borderRadius: 8,
        color: isActive ? "var(--accent-d)" : "var(--ink-2)",
        background: isActive ? "var(--accent-bg)" : "transparent",
        textDecoration: "none",
        cursor: "pointer"
      };
    }

    return React.createElement(
      "nav",
      {
        style: {
          background: "var(--surface)",
          borderBottom: "1px solid var(--line)",
          padding: "0 28px",
          height: 58,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          position: "sticky",
          top: 0,
          zIndex: 100
        }
      },

      // Left: logo + search + tab links
      React.createElement(
        "div",
        { style: { display: "flex", alignItems: "center", gap: 12, flex: 1, minWidth: 0 } },
        React.createElement("a", { href: "feed.html", className: "logo", style: { textDecoration: "none" } }, "Seshn"),

        // Primary nav links
        React.createElement(
          "div",
          { style: { display: "flex", alignItems: "center", gap: 4, marginLeft: 6 } },
          React.createElement("a", { href: "feed.html", style: navLinkStyle(active === "feed") }, "Feed"),
          React.createElement("a", { href: "browse.html", style: navLinkStyle(active === "browse") }, "Browse"),
          React.createElement("a", { href: "applications.html", style: navLinkStyle(active === "applications") }, "Applications")
        ),

        // Search bar
        showSearch && React.createElement(
          "div",
          {
            style: {
              flex: 1, maxWidth: 360, marginLeft: 16,
              display: "flex", alignItems: "center", gap: 8,
              padding: "8px 13px",
              background: "var(--surface-2)",
              borderRadius: 999,
              border: "1px solid var(--line)",
              color: "var(--ink-3)",
              cursor: "text"
            }
          },
          React.createElement(IconSvg, { kind: "search", size: 14 }),
          React.createElement("span", { style: { fontSize: 12, fontFamily: "var(--font-display)" } }, "Search artists, roles, genres…")
        )
      ),

      // Right: post button, inbox, bell, avatar
      React.createElement(
        "div",
        { style: { display: "flex", alignItems: "center", gap: 10 } },
        showPostButton && React.createElement("a", { href: "post.html", className: "btn primary sm" }, "+ Post a gig"),

        React.createElement(
          "a",
          { href: "inbox.html", style: Object.assign({ position: "relative" }, iconBtnStyle(active === "inbox")), "aria-label": "Inbox" + (unread > 0 ? " (" + unread + " unread)" : "") },
          React.createElement(IconSvg, { kind: "message", size: 18 }),
          unread > 0 && React.createElement(
            "span",
            {
              style: {
                position: "absolute", top: 4, right: 4,
                minWidth: 16, height: 16, padding: "0 4px",
                borderRadius: 999,
                background: "var(--accent)", color: "#062c19",
                fontFamily: "var(--font-display)", fontWeight: 700, fontSize: 10,
                display: "inline-flex", alignItems: "center", justifyContent: "center",
                border: "2px solid var(--frame)", boxSizing: "content-box", lineHeight: 1
              }
            },
            unread > 9 ? "9+" : String(unread)
          )
        ),

        React.createElement("span", { style: iconBtnStyle(false), "aria-label": "Notifications" },
          React.createElement(IconSvg, { kind: "bell", size: 18 })),

        React.createElement(
          "a",
          { href: profileHref, style: { textDecoration: "none" }, "aria-label": "Your profile" },
          React.createElement(
            "span",
            {
              className: "avatar md",
              style: {
                background: me && me.avatar_url ? "var(--ph)" : "linear-gradient(135deg,#a8ebc8,#2CCB73)",
                color: "#062c19",
                fontSize: 12,
                fontFamily: "var(--font-display)",
                fontWeight: 700,
                border: active === "profile" ? "2px solid var(--ink)" : "2px solid transparent",
                overflow: "hidden"
              }
            },
            me && me.avatar_url
              ? React.createElement("img", { src: me.avatar_url, alt: "", style: { width: "100%", height: "100%", borderRadius: "50%", objectFit: "cover", display: "block" } })
              : initials
          )
        )
      )
    );
  }

  window.SeshnAppNav = SeshnAppNav;
})();
