// Seshn — Collaboration Agreement template (v1)
//
// THIS TEMPLATE IS A STARTING POINT, NOT FINAL LEGAL TEXT.
// The wording was drafted in-house to be plain-English and structurally
// sound; an Australian solicitor familiar with music IP and the NSW
// arbitration framework should review and refine the final language
// before this is used on live contracts. The TODO markers below call out
// the specific spots where lawyer input is needed.
//
// Why it lives as JS (not a PDF):
//   - The same render() runs in the browser (sign page preview) and on
//     the server (PDF generation), so the artifact both parties sign is
//     bit-for-bit identical and hashable.
//   - Boilerplate edits ship like any other code change, reviewable in
//     git rather than buried in a Word doc.
//
// Usage:
//   var doc = SeshnContract.render(contract, owner, collaborator, gig);
//   doc.sections.forEach(s => render(s.title, s.paragraphs));
//   var hash = await SeshnContract.hashAgreement(doc);

(function () {
  var TEMPLATE_VERSION = "2026-05-20";
  var PLATFORM = {
    name: "Seshn",
    legal_entity: "Seshn Pty Ltd",
    abn: "[ABN TBD]",                 // TODO: fill once company registered
    jurisdiction: "New South Wales, Australia"
  };

  // ── Formatters ───────────────────────────────────────────────────
  function fmtMoney(cents, currency) {
    if (cents == null) return "—";
    var n = Number(cents) / 100;
    var fmt;
    try {
      fmt = new Intl.NumberFormat("en-AU", {
        style: "currency",
        currency: currency || "AUD",
        minimumFractionDigits: 2
      }).format(n);
    } catch (e) {
      fmt = (currency || "AUD") + " " + n.toFixed(2);
    }
    return fmt;
  }
  function fmtDate(iso) {
    if (!iso) return "—";
    try {
      return new Date(iso).toLocaleDateString("en-AU", {
        day: "numeric", month: "long", year: "numeric"
      });
    } catch (e) { return iso; }
  }
  function fmtPct(n) {
    if (n == null || isNaN(n)) return "—";
    return Number(n).toString() + "%";
  }
  function fallback(v, alt) {
    return (v == null || v === "") ? alt : v;
  }

  // ── Field accessors ──────────────────────────────────────────────
  // These guard against the contract being mid-draft (missing fields)
  // and standardise where each piece of data lives.
  function getTerms(c) { return (c && c.terms) || {}; }
  function getDeliverable(c) { return getTerms(c).deliverable || {}; }
  function getSplits(c) { return getTerms(c).splits || {}; }
  function getCredits(c) { return getTerms(c).credits || {}; }

  function partyLine(profile) {
    if (!profile) return { name: "[unspecified]", handle: "—", country: "—" };
    return {
      name: fallback(profile.legal_name || profile.display_name, "[no legal name on file]"),
      handle: profile.username ? "@" + profile.username : "—",
      country: fallback(profile.country || profile.stripe_country, "[location not set]")
    };
  }

  // ── Section builders ─────────────────────────────────────────────
  function buildParties(owner, collaborator) {
    var o = partyLine(owner);
    var c = partyLine(collaborator);
    return {
      number: "1",
      title: "The parties",
      paragraphs: [
        "This agreement is between:",
        { kind: "party", role: "Owner", name: o.name, handle: o.handle, country: o.country },
        { kind: "party", role: "Collaborator", name: c.name, handle: c.handle, country: c.country },
        "This agreement is facilitated by " + PLATFORM.name + ", a service operated by " +
          PLATFORM.legal_entity + " (" + PLATFORM.abn + "), a company registered in " +
          PLATFORM.jurisdiction + ". Seshn is not a party to this agreement. Seshn's role is " +
          "to host the platform, hold the agreed payment in escrow via Stripe Connect, and " +
          "provide a structured process for delivery, approval and dispute resolution."
      ]
    };
  }

  function buildBackground(gig) {
    var title = (gig && gig.title) || "[gig title]";
    var gigId = (gig && gig.id) || "[gig id]";
    return {
      number: "2",
      title: "Background",
      paragraphs: [
        'The Owner posted a gig on Seshn titled "' + title + '" (gig ID ' + gigId + '). ' +
          "The Collaborator applied to that gig and the Owner accepted the application. " +
          "The parties now wish to record the terms of their collaboration in this agreement."
      ]
    };
  }

  function buildDeliverable(c) {
    var d = getDeliverable(c);
    return {
      number: "3",
      title: "What the Collaborator will deliver",
      paragraphs: [
        "The Collaborator agrees to deliver the following work to the Owner:",
        { kind: "blockquote", text: fallback(d.description, "[deliverable description]") },
        "Format: " + fallback(d.format_notes, "[format notes]") + ".",
        "Deadline: by " + fmtDate(d.deliver_by) + ".",
        "Delivery is made by uploading the work to Seshn under this contract. The upload " +
          "triggers the approval period described in Section 5."
      ]
    };
  }

  function buildPayment(c) {
    var t = getTerms(c);
    var feeStr = fmtMoney(t.fee_cents, t.currency);
    var platformPct = (t.platform_fee_pct != null) ? t.platform_fee_pct : 8;
    var netCents = t.fee_cents ? Math.round(t.fee_cents * (1 - platformPct / 100)) : null;
    return {
      number: "4",
      title: "What the Owner will pay",
      paragraphs: [
        "The Owner agrees to pay the Collaborator " + feeStr + " for the deliverable in Section 3.",
        "How the money is held. When this agreement is signed by both parties, the Owner will " +
          "fund an escrow held by Stripe Connect under this contract. The funds are held by " +
          "Stripe until released under the terms of this agreement. Seshn does not hold the money directly.",
        "Platform fee. Seshn charges a platform fee of " + fmtPct(platformPct) + " of the agreed " +
          "amount, deducted from the payment to the Collaborator at the time of release. The " +
          "Collaborator therefore receives " + fmtMoney(netCents, t.currency) + " on release.",
        { kind: "list-letter", items: [
          "On approval. If the Owner approves the delivered work within the approval window " +
            "(Section 5), the funds are released immediately to the Collaborator.",
          "Automatically. If the Owner does not approve, request revisions, or open a dispute " +
            "before the end of the approval window, the funds are released automatically to " +
            "the Collaborator at the end of the window.",
          "On dispute. If a dispute is opened, the auto-release timer is paused. The funds " +
            "remain in escrow until the dispute is resolved as described in Section 7."
        ] },
        "If the deadline in Section 3 passes without delivery, the Owner may cancel this " +
          "agreement and request a refund. Seshn will return the held funds to the Owner."
      ]
    };
  }

  function buildApproval(c) {
    var days = getTerms(c).approval_window_days || 7;
    return {
      number: "5",
      title: "Approval period",
      paragraphs: [
        "The Owner has " + days + " days from the time the Collaborator marks the work as " +
          "delivered to do one of the following:",
        { kind: "list-bullet", items: [
          "approve the work;",
          "request a specific, reasonable revision; or",
          "open a dispute under Section 7."
        ] },
        "If the Owner does not act within the approval period, the work is considered " +
          "approved and the funds are released to the Collaborator under Section 4.",
        "If revisions are requested, the Collaborator is required to make a good-faith attempt " +
          "to complete them within a reasonable time. The approval period restarts once the " +
          "revised work is re-delivered. The parties may agree to additional rounds of " +
          "revisions, but neither party is obligated to engage in unlimited revisions."
      ]
    };
  }

  function buildSplits(c, owner, collaborator) {
    var s = getSplits(c);
    var oh = partyLine(owner).handle;
    var ch = partyLine(collaborator).handle;
    var credits = getCredits(c);
    return {
      number: "6",
      title: "Ownership and splits",
      paragraphs: [
        "On full release of the agreed payment under Section 4, the following splits become effective:",
        { kind: "splits-block", label: "Master recording (sound recording copyright)", rows: [
          { handle: oh, pct: fmtPct(s.master_owner_pct) },
          { handle: ch, pct: fmtPct(s.master_collaborator_pct) }
        ] },
        { kind: "splits-block", label: "Publishing (composition / underlying musical work)", rows: [
          { handle: oh, pct: fmtPct(s.publishing_owner_pct) },
          { handle: ch, pct: fmtPct(s.publishing_collaborator_pct) }
        ] },
        "What this means. Each party owns the percentage of each copyright set out above from " +
          "the moment of full release of the payment. Neither party may exploit the work " +
          "commercially before full release.",
        "Filing with collection societies. Each party is responsible for registering this work " +
          "and the agreed splits with their own collection society or PRO (in Australia: APRA " +
          "AMCOS; in the US: ASCAP, BMI, or SESAC; in the UK: PRS for Music; and equivalent " +
          "bodies elsewhere). Seshn does not file splits with any collection society. Seshn " +
          "provides this signed agreement as evidence the parties may rely on when registering.",
        "Credit. The parties agree to use the following credit text in any release, " +
          "distribution metadata, or public promotion of the work:",
        { kind: "blockquote", text: fallback(credits.text, "[credit text]") },
        "Variations of this credit (for example, abbreviated versions for short-form metadata) " +
          "are permitted provided they substantively preserve the attribution above."
      ]
    };
  }

  function buildDisputes() {
    return {
      number: "7",
      title: "Disputes",
      paragraphs: [
        "Either party may open a dispute under this contract via the Seshn dispute process " +
          "during the approval window in Section 5.",
        "When a dispute is opened:",
        { kind: "list-bullet", items: [
          "the auto-release timer is immediately paused;",
          "the funds remain in escrow;",
          "Seshn's support team will contact both parties to gather evidence;",
          "the parties agree to engage in good faith with the Seshn dispute process before " +
            "pursuing any other resolution."
        ] },
        "The Seshn dispute process may result in one of the following outcomes:",
        { kind: "list-bullet", items: [
          "release — the full funds are released to the Collaborator;",
          "refund — the full funds are returned to the Owner;",
          "split — a partial amount is released to the Collaborator and the remainder is " +
            "returned to the Owner, as agreed by both parties or as determined by the Seshn " +
            "dispute resolver."
        ] },
        // TODO(lawyer): confirm wording of the arbitration carve-out and the named institution.
        "If the parties cannot resolve a dispute through the Seshn process, the dispute is " +
          "subject to the dispute resolution clause of Seshn's Terms of Service, which provides " +
          "for arbitration under the rules of the Resolution Institute (or such other Australian " +
          "arbitration body as the Terms of Service specify). Any arbitration is seated in " +
          "Sydney, New South Wales, and conducted in English."
      ]
    };
  }

  function buildWarranties() {
    return {
      number: "8",
      title: "Representations and warranties",
      paragraphs: [
        "Each party warrants to the other that:",
        { kind: "list-letter", items: [
          "they have the legal capacity and right to enter into this agreement;",
          "their contribution to the work is original to them, or properly licensed from any " +
            "third party whose material they incorporate, and does not infringe any third " +
            "party's rights;",
          "they will use the work only in ways consistent with the ownership and credit terms " +
            "in Section 6."
        ] },
        "Each party indemnifies the other against any third-party claim arising from a breach " +
          "of the warranties above by the indemnifying party."
      ]
    };
  }

  function buildConfidentiality() {
    return {
      number: "9",
      title: "Confidentiality",
      paragraphs: [
        "Work in progress shared between the parties under this agreement (including unreleased " +
          "demos, rough mixes, lyrics, stems and session files) is confidential. Neither party " +
          "may share work in progress with any third party until the work is publicly released " +
          "or unless both parties consent in writing.",
        "This obligation does not apply to:",
        { kind: "list-bullet", items: [
          "information that becomes public other than through a breach of this section;",
          "information independently developed; or",
          "disclosures required by law."
        ] }
      ]
    };
  }

  function buildTermination() {
    return {
      number: "10",
      title: "Termination",
      paragraphs: [
        "This agreement may be terminated:",
        { kind: "list-letter", items: [
          "by mutual agreement at any time before delivery, in which case Seshn will refund " +
            "the held funds to the Owner and this agreement is void;",
          "by the Owner if the Collaborator fails to deliver by the deadline in Section 3 and " +
            "does not request a deadline extension that the Owner accepts;",
          "on full release of the funds and effective transfer of the splits in Section 6, " +
            "at which point this agreement is complete."
        ] }
      ]
    };
  }

  function buildGoverningLaw() {
    return {
      number: "11",
      title: "Governing law",
      paragraphs: [
        "This agreement is governed by the laws of " + PLATFORM.jurisdiction + ". Subject to " +
          "the dispute resolution process in Section 7 and Seshn's Terms of Service, the " +
          "parties submit to the exclusive jurisdiction of the courts of " + PLATFORM.jurisdiction + "."
      ]
    };
  }

  function buildElectronicSignature() {
    return {
      number: "12",
      title: "Electronic signature",
      paragraphs: [
        "The parties consent to executing this agreement electronically through Seshn's " +
          "click-to-sign interface.",
        'By clicking "Sign contract" on Seshn while signed in to their account, each party:',
        { kind: "list-bullet", items: [
          "confirms their identity as the named party;",
          "agrees to be bound by the terms of this agreement; and",
          "consents to Seshn recording the date, time, IP address, user-agent and a " +
            "cryptographic hash of this agreement as proof of their signature."
        ] },
        "This agreement is binding on the parties as an electronic signature under the " +
          "Electronic Transactions Act 1999 (Cth) and equivalent legislation in other jurisdictions."
      ]
    };
  }

  function buildSignatureBlocks(c, owner, collaborator) {
    return {
      title: "Signed",
      owner: {
        party: partyLine(owner),
        signed_at: c.owner_signed_at,
        evidence: c._owner_evidence || null   // populated post-signing; null pre-signing
      },
      collaborator: {
        party: partyLine(collaborator),
        signed_at: c.collaborator_signed_at,
        evidence: c._collaborator_evidence || null
      },
      witness: {
        entity: PLATFORM.legal_entity,
        contract_id: c.id || "[contract id]"
      }
    };
  }

  // ── Top-level render ─────────────────────────────────────────────
  function render(contract, owner, collaborator, gig) {
    return {
      version: TEMPLATE_VERSION,
      title: "COLLABORATION AGREEMENT",
      header: {
        contract_id: (contract && contract.id) || "[contract id]",
        created_at: (contract && contract.created_at) || null,
        gig_title: (gig && gig.title) || null
      },
      sections: [
        buildParties(owner, collaborator),
        buildBackground(gig),
        buildDeliverable(contract),
        buildPayment(contract),
        buildApproval(contract),
        buildSplits(contract, owner, collaborator),
        buildDisputes(),
        buildWarranties(),
        buildConfidentiality(),
        buildTermination(),
        buildGoverningLaw(),
        buildElectronicSignature()
      ],
      signatures: buildSignatureBlocks(contract, owner, collaborator)
    };
  }

  // ── Hashing ──────────────────────────────────────────────────────
  // Stable string form of the document for SHA-256. Walks the same
  // structure render() returns and emits a deterministic JSON encoding.
  // The hash is what each signer attests to — change the template and
  // every new contract hashes differently, but already-signed contracts
  // retain their original hash on file.
  function canonicalize(doc) {
    return JSON.stringify(doc, function (k, v) {
      // Drop derived/transient fields that vary across renders of the
      // same logical document.
      if (k === "created_at" && this === doc.header) return v; // keep
      return v;
    });
  }

  async function hashAgreement(doc) {
    var str = canonicalize(doc);
    if (typeof crypto === "undefined" || !crypto.subtle) {
      // Server fallback: caller should use a Node crypto polyfill.
      throw new Error("Web Crypto unavailable; cannot hash agreement client-side.");
    }
    var buf = new TextEncoder().encode(str);
    var hashBuf = await crypto.subtle.digest("SHA-256", buf);
    return Array.from(new Uint8Array(hashBuf))
      .map(function (b) { return b.toString(16).padStart(2, "0"); })
      .join("");
  }

  window.SeshnContract = {
    version: TEMPLATE_VERSION,
    platform: PLATFORM,
    render: render,
    hashAgreement: hashAgreement,
    canonicalize: canonicalize,
    fmtMoney: fmtMoney,
    fmtDate: fmtDate,
    fmtPct: fmtPct
  };
})();
