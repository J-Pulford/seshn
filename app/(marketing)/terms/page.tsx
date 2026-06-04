import type { Metadata } from "next";
import "../landing.css";
import "../pages.css";
import "../legal.css";

export const metadata: Metadata = {
  title: "Terms of Service — Seshn",
  description: "The terms that govern your use of Seshn — accounts, collaborations, contracts, payments, conduct, and intellectual property.",
};

const LAST_UPDATED = "4 June 2026";
const EFFECTIVE = "4 June 2026";

const SECTIONS: { id: string; title: string }[] = [
  { id: "agreement", title: "Agreement to these terms" },
  { id: "who", title: "Who can use Seshn" },
  { id: "accounts", title: "Your account" },
  { id: "what-seshn-is", title: "What Seshn is (and isn't)" },
  { id: "collaborations", title: "Gigs, applications & collaborations" },
  { id: "contracts", title: "Contracts & e-signatures" },
  { id: "payments", title: "Payments, escrow & fees" },
  { id: "ip", title: "Your content & intellectual property" },
  { id: "conduct", title: "Acceptable use" },
  { id: "pro", title: "Pro subscription" },
  { id: "termination", title: "Suspension & termination" },
  { id: "disclaimers", title: "Disclaimers" },
  { id: "liability", title: "Limitation of liability" },
  { id: "law", title: "Governing law & disputes" },
  { id: "changes", title: "Changes to these terms" },
  { id: "contact", title: "Contact" },
];

export default function TermsPage() {
  return (
    <div className="legal">
      <div className="legal-eyebrow">Legal</div>
      <h1>Terms of Service</h1>
      <p className="legal-meta">Effective {EFFECTIVE} · Last updated {LAST_UPDATED}</p>
      <p className="legal-lede">
        These terms are the agreement between you and Seshn for using the platform. We&apos;ve kept them
        as plain as we can. By creating an account or using Seshn, you agree to them — so it&apos;s worth a read.
      </p>

      <div className="legal-callout">
        <p>
          <strong>The short version.</strong> Be who you say you are, treat people well, own (or have
          the rights to) what you upload, and honour the deals you make. Seshn is the place you find
          collaborators and agree terms — the creative work and the relationship are yours. Keep money
          and agreements on-platform so escrow and our protections actually apply.
        </p>
      </div>

      <nav className="legal-toc" aria-label="Contents">
        <b>On this page</b>
        <ol>
          {SECTIONS.map((s) => (
            <li key={s.id}><a href={`#${s.id}`}>{s.title}</a></li>
          ))}
        </ol>
      </nav>

      <section id="agreement">
        <h2><span className="legal-n">01</span> Agreement to these terms</h2>
        <p>
          Seshn is operated by <strong>Seshn Pty Ltd</strong> (&quot;Seshn&quot;, &quot;we&quot;, &quot;us&quot;), registered
          in New South Wales, Australia. These Terms of Service, together with our{" "}
          <a className="inline" href="/privacy">Privacy Policy</a>, govern your use of the Seshn website,
          web app, and services (the &quot;Platform&quot;). If you don&apos;t agree, please don&apos;t use Seshn.
        </p>
      </section>

      <section id="who">
        <h2><span className="legal-n">02</span> Who can use Seshn</h2>
        <p>
          You must be at least <strong>16</strong> to hold an account, and at least <strong>18</strong>
          {" "}(or the age of majority where you live) to enter contracts or transact. By using Seshn you
          confirm you meet these requirements and that the information you give us is accurate.
        </p>
      </section>

      <section id="accounts">
        <h2><span className="legal-n">03</span> Your account</h2>
        <ul>
          <li>You&apos;re responsible for your account and for keeping your login secure.</li>
          <li>Don&apos;t impersonate anyone or misrepresent your identity, skills, or affiliations.</li>
          <li>One person or entity per account; don&apos;t share or sell accounts.</li>
          <li>Tell us promptly if you suspect unauthorised use.</li>
        </ul>
      </section>

      <section id="what-seshn-is">
        <h2><span className="legal-n">04</span> What Seshn is (and isn&apos;t)</h2>
        <p>
          Seshn is a <strong>marketplace and toolset</strong> that helps musicians find each other, agree
          terms, and get paid. We are <strong>not</strong> a party to the collaborations or contracts
          between members, not an employer or agent, and we don&apos;t guarantee that any collaboration,
          payment, or outcome will happen or meet your expectations. You deal with other members at your
          own discretion; we provide the tools and protections described in these terms.
        </p>
      </section>

      <section id="collaborations">
        <h2><span className="legal-n">05</span> Gigs, applications &amp; collaborations</h2>
        <ul>
          <li>Owners post gigs (briefs); collaborators apply with a pitch. Be honest and accurate in both.</li>
          <li>Accepting an application doesn&apos;t create a binding deal on its own — the terms you agree (ideally a Seshn contract) do.</li>
          <li>You&apos;re responsible for the work you agree to deliver and the conduct of your collaboration.</li>
          <li>Don&apos;t post gigs for anything illegal, deceptive, or that you don&apos;t have the right to commission.</li>
        </ul>
      </section>

      <section id="contracts">
        <h2><span className="legal-n">06</span> Contracts &amp; e-signatures</h2>
        <p>
          Seshn lets the two parties to a deal draft and sign a <strong>collaboration agreement</strong>.
          When you click to sign, you&apos;re entering a legally binding electronic signature, and you consent
          to us recording the time, your IP address, your browser/device, and a cryptographic hash of the
          document as proof — valid under the <strong>Electronic Transactions Act 1999 (Cth)</strong> and
          comparable laws. The contract is between the two members; Seshn is not a party to it but provides
          and records it. Read each agreement carefully before signing.
        </p>
      </section>

      <section id="payments">
        <h2><span className="legal-n">07</span> Payments, escrow &amp; fees</h2>
        <ul>
          <li>Payments are processed by <strong>Stripe</strong>; your use of payment features is also subject to Stripe&apos;s terms. We never store your full card or bank details.</li>
          <li>For a paid booking, the owner funds an <strong>escrow</strong>; funds are released to the collaborator on approval, or after the agreed approval window, or as resolved in a dispute.</li>
          <li>Seshn charges a <strong>flat 5% platform fee</strong> on paid bookings (the &quot;payer covers all&quot; model means the collaborator receives their full quoted fee). Card-processing fees also apply. Fees are shown before you commit.</li>
          <li>Keep payments on-platform — taking a deal off-platform to avoid fees means you lose escrow protection and breaches these terms.</li>
          <li>You&apos;re responsible for your own taxes on what you earn.</li>
        </ul>
      </section>

      <section id="ip">
        <h2><span className="legal-n">08</span> Your content &amp; intellectual property</h2>
        <p>
          <strong>You keep ownership of your content</strong> — your profile, uploads, music, and the work
          you create. You grant Seshn a limited, non-exclusive licence to host, store, and display your
          content as needed to operate the Platform (for example, showing your profile and previews).
        </p>
        <p>
          Only upload content you own or have the rights to. Ownership and splits in a collaboration are
          governed by the agreement between you and your collaborators, not by Seshn. We respect
          intellectual property and will respond to valid infringement notices — contact us if your rights
          are being infringed.
        </p>
        <p>We will never sell your content or use your unreleased work to train AI models.</p>
      </section>

      <section id="conduct">
        <h2><span className="legal-n">09</span> Acceptable use</h2>
        <p>Don&apos;t:</p>
        <ul>
          <li>harass, abuse, threaten, or discriminate against anyone;</li>
          <li>post spam, scams, or misleading content, or solicit payment off-platform to dodge protections;</li>
          <li>infringe others&apos; intellectual property or upload content you don&apos;t have rights to;</li>
          <li>break the law, or use Seshn for anything fraudulent or harmful;</li>
          <li>scrape, reverse-engineer, overload, or attempt to breach the security of the Platform;</li>
          <li>circumvent fees, bans, or our trust-and-safety measures.</li>
        </ul>
        <p>You can report content or users in-app; we review every report.</p>
      </section>

      <section id="pro">
        <h2><span className="legal-n">10</span> Pro subscription</h2>
        <p>
          Pro is an optional paid subscription billed through Stripe. It&apos;s a <strong>flat fee</strong> —
          never a cut of your earnings. You can cancel anytime from your settings and keep Pro until the end
          of your billing period. Fees are non-refundable except where required by law. We&apos;ll give notice
          of any price change.
        </p>
      </section>

      <section id="termination">
        <h2><span className="legal-n">11</span> Suspension &amp; termination</h2>
        <p>
          You can stop using Seshn and delete your account at any time (subject to records we must retain —
          see the Privacy Policy). We may suspend or terminate access if you breach these terms, put others
          or the Platform at risk, or where required by law. Some obligations — like resolving funded
          escrows and honouring signed contracts — survive termination.
        </p>
      </section>

      <section id="disclaimers">
        <h2><span className="legal-n">12</span> Disclaimers</h2>
        <p>
          The Platform is provided <strong>&quot;as is&quot;</strong> and <strong>&quot;as available&quot;</strong>. To the
          extent permitted by law, we don&apos;t warrant that it will be uninterrupted, error-free, or that it
          will meet your needs, and we&apos;re not responsible for the conduct, content, or quality of work of
          other members. Nothing in these terms excludes rights you have under the Australian Consumer Law
          or other laws that can&apos;t be excluded.
        </p>
      </section>

      <section id="liability">
        <h2><span className="legal-n">13</span> Limitation of liability</h2>
        <p>
          To the maximum extent permitted by law, Seshn is not liable for indirect, incidental, or
          consequential losses, or for lost profits, data, or opportunities. Where our liability can&apos;t be
          excluded but can be limited, it&apos;s limited to (at our option) re-supplying the service or
          refunding the fees you paid us for it in the 12 months before the claim.
        </p>
      </section>

      <section id="law">
        <h2><span className="legal-n">14</span> Governing law &amp; disputes</h2>
        <p>
          These terms are governed by the laws of <strong>New South Wales, Australia</strong>, and you submit
          to the non-exclusive jurisdiction of its courts. If you have a problem, contact us first — we&apos;ll
          genuinely try to resolve it. Disputes <em>between members</em> about a collaboration are primarily
          between those members; our dispute tools for funded escrows are described in-app.
        </p>
      </section>

      <section id="changes">
        <h2><span className="legal-n">15</span> Changes to these terms</h2>
        <p>
          We may update these terms as Seshn evolves. For material changes we&apos;ll update the date above and,
          where appropriate, notify you in-app or by email. Continuing to use Seshn after a change means you
          accept the updated terms.
        </p>
      </section>

      <section id="contact">
        <h2><span className="legal-n">16</span> Contact</h2>
        <div className="legal-contact">
          <p><strong>Seshn Pty Ltd</strong></p>
          <p>General: <a className="inline" href="mailto:support@seshn.fm">support@seshn.fm</a></p>
          <p>Privacy: <a className="inline" href="mailto:privacy@seshn.fm">privacy@seshn.fm</a></p>
          <p>Registered in New South Wales, Australia.</p>
        </div>
        <p style={{ marginTop: 16, fontSize: 13, color: "var(--ink-3)" }}>
          This document is a plain-language starting point and isn&apos;t legal advice; have it reviewed by a
          qualified lawyer before relying on it in production.
        </p>
      </section>
    </div>
  );
}
