import type { Metadata } from "next";
import "../landing.css";
import "../pages.css";
import "../legal.css";

export const metadata: Metadata = {
  title: "Privacy Policy · Seshn",
  description:
    "How Seshn collects, uses, stores, and protects your personal information, and the rights you have over it under the Australian Privacy Principles and GDPR.",
};

// Keep this in sync with the data model (supabase/migrations) and the support
// compliance SOP (docs/sops/10-compliance.md). When a new category of personal
// data is collected, add a row to the "What we collect" table and, if relevant,
// the retention and third-party sections.
const LAST_UPDATED = "23 June 2026";
const EFFECTIVE = "4 June 2026";

const SECTIONS: { id: string; title: string }[] = [
  { id: "who-we-are", title: "Who we are" },
  { id: "scope", title: "Scope & the laws that apply" },
  { id: "what-we-collect", title: "Information we collect" },
  { id: "how-we-use", title: "How and why we use it" },
  { id: "legal-bases", title: "Legal bases (GDPR)" },
  { id: "sharing", title: "When we share information" },
  { id: "processors", title: "Service providers & sub-processors" },
  { id: "transfers", title: "International data transfers" },
  { id: "retention", title: "How long we keep it" },
  { id: "security", title: "How we protect it" },
  { id: "your-rights", title: "Your rights & choices" },
  { id: "exercise", title: "How to exercise your rights" },
  { id: "cookies", title: "Cookies & local storage" },
  { id: "children", title: "Children" },
  { id: "breach", title: "Data breaches" },
  { id: "changes", title: "Changes to this policy" },
  { id: "contact", title: "How to contact us" },
];

export default function PrivacyPage() {
  return (
    <div className="legal">
      <div className="legal-eyebrow">Legal</div>
      <h1>Privacy Policy</h1>
      <p className="legal-meta">
        Effective {EFFECTIVE} · Last updated {LAST_UPDATED}
      </p>
      <p className="legal-lede">
        Seshn is a marketplace where musicians find each other, agree terms, and get paid for
        collaboration. Doing that well means handling some personal information. This policy explains
        what we collect, why, who we share it with, how long we keep it, and the control you have over
        it. We&apos;ve written it to be read, not to hide behind.
      </p>

      <div className="legal-callout">
        <p>
          <strong>The short version.</strong> We collect what we need to run the marketplace , 
          your account, your public profile, the gigs and applications you create, the messages you
          send, and (when you transact) contract and payment records. We don&apos;t sell your personal
          information, and we don&apos;t use your private messages or unreleased work to train AI. You can
          access, correct, export, or delete your data at any time.
        </p>
      </div>

      <nav className="legal-toc" aria-label="Contents">
        <b>On this page</b>
        <ol>
          {SECTIONS.map((s) => (
            <li key={s.id}>
              <a href={`#${s.id}`}>{s.title}</a>
            </li>
          ))}
        </ol>
      </nav>

      <section id="who-we-are">
        <h2><span className="legal-n">01</span> Who we are</h2>
        <p>
          Seshn is operated by <strong>Seshn Pty Ltd</strong> (&quot;Seshn&quot;, &quot;we&quot;,
          &quot;us&quot;, &quot;our&quot;), a company registered in New South Wales, Australia. We are the
          <strong> data controller</strong> for the personal information described in this policy.
        </p>
        <p>
          For any privacy question, request, or complaint, contact our privacy team at{" "}
          <a className="inline" href="mailto:privacy@seshn.fm">privacy@seshn.fm</a>. See{" "}
          <a className="inline" href="#contact">section 17</a> for more ways to reach us.
        </p>
      </section>

      <section id="scope">
        <h2><span className="legal-n">02</span> Scope &amp; the laws that apply</h2>
        <p>
          This policy applies to the Seshn website, web app, and related services (the
          &quot;Platform&quot;). It covers everyone who uses Seshn, wherever you are.
        </p>
        <p>Depending on where you live, different privacy laws give you rights. We comply with:</p>
        <ul>
          <li>
            the <strong>Privacy Act 1988 (Cth)</strong> and the <strong>Australian Privacy
            Principles (APPs)</strong>, our home jurisdiction, applied to all users;
          </li>
          <li>
            the <strong>EU General Data Protection Regulation (GDPR)</strong> and{" "}
            <strong>UK GDPR</strong> for users in the European Economic Area and the United Kingdom;
          </li>
          <li>
            the <strong>California Consumer Privacy Act (CCPA/CPRA)</strong> for California residents; and
          </li>
          <li>
            <strong>PIPEDA</strong> for users in Canada.
          </li>
        </ul>
        <p>
          Where these overlap, we apply the standard most protective of you. If a specific law gives
          you a right not described below, you still have it, this policy doesn&apos;t limit your
          statutory rights.
        </p>
      </section>

      <section id="what-we-collect">
        <h2><span className="legal-n">03</span> Information we collect</h2>
        <p>
          We only collect information we actually use to run the Platform. Most of it you give us
          directly; a small amount is generated as you use Seshn or comes from services you connect.
        </p>
        <table className="legal-table">
          <thead>
            <tr>
              <th>Category</th>
              <th>What it includes</th>
              <th>Where it comes from</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>Account</td>
              <td>Email address, password (stored only as a secure hash by our auth provider), sign-in timestamps, and email-verification status.</td>
              <td>You, at sign-up</td>
            </tr>
            <tr>
              <td>Public profile</td>
              <td>Display name, username, bio, location, pronouns, roles, genres, skills, influences, languages, availability, avatar and cover images, photo gallery, credits/discography, featured links, and the services and rates you list.</td>
              <td>You, in onboarding &amp; profile editing</td>
            </tr>
            <tr>
              <td>Connected accounts</td>
              <td>Links and basic public stats (e.g. follower counts) from music platforms you choose to connect, such as Spotify or SoundCloud.</td>
              <td>You &amp; the linked platform</td>
            </tr>
            <tr>
              <td>Gigs &amp; applications</td>
              <td>Collaboration briefs you post, and the pitches and attachments you submit when applying.</td>
              <td>You</td>
            </tr>
            <tr>
              <td>Messages</td>
              <td>Direct messages between you and other members, including any audio or file attachments you send.</td>
              <td>You &amp; other members</td>
            </tr>
            <tr>
              <td>Contracts &amp; signatures</td>
              <td>Collaboration agreements you draft or sign, the agreed terms, the generated agreement PDF, and electronic-signature evidence (timestamp, IP address, browser/device user-agent, and a hash of the signed document).</td>
              <td>You &amp; the other party</td>
            </tr>
            <tr>
              <td>Payments &amp; payouts</td>
              <td>Escrow and transaction records (amounts, currency, status, platform fee) and your payout-account identifiers. Card numbers and bank details are handled by Stripe, we never see or store your full payment credentials.</td>
              <td>You, via Stripe</td>
            </tr>
            <tr>
              <td>Deliverables &amp; disputes</td>
              <td>Files, links, and notes submitted against a contract, and any dispute you open (including the reason and evidence).</td>
              <td>You &amp; the other party</td>
            </tr>
            <tr>
              <td>Notifications &amp; preferences</td>
              <td>Your in-app notifications, read state, notification preferences, and locale.</td>
              <td>Generated as you use Seshn</td>
            </tr>
            <tr>
              <td>Trust &amp; safety</td>
              <td>Reports you file or that are filed about you, blocks, and any account-restriction history.</td>
              <td>You, other members &amp; us</td>
            </tr>
            <tr>
              <td>Technical &amp; security logs</td>
              <td>IP address, browser/device information, and an append-only audit log of security-sensitive actions (e.g. signing a contract, funding or releasing escrow).</td>
              <td>Generated automatically</td>
            </tr>
          </tbody>
        </table>
        <p>
          <strong>Sensitive information.</strong> We don&apos;t ask for sensitive information (such as
          health, racial or ethnic, political, or biometric data). Please don&apos;t put it in free-text
          fields like your bio or messages. Anything you publish on your public profile is, by design,
          visible to anyone.
        </p>
      </section>

      <section id="how-we-use">
        <h2><span className="legal-n">04</span> How and why we use it</h2>
        <p>We use your information to:</p>
        <ul>
          <li>create and secure your account and authenticate you;</li>
          <li>show your public profile and match you to relevant gigs and collaborators;</li>
          <li>let you post gigs, apply, message, and collaborate;</li>
          <li>generate collaboration agreements and record valid electronic signatures;</li>
          <li>process payments, hold funds in escrow, and pay out earnings (via Stripe);</li>
          <li>send you transactional and service notifications;</li>
          <li>keep the marketplace safe, detecting fraud, abuse, and policy violations, and handling reports, blocks, and disputes;</li>
          <li>meet our legal, tax, and record-keeping obligations; and</li>
          <li>understand and improve the Platform. With your consent, we use Google Analytics to see how Seshn is used (such as pages visited, device and browser type, and approximate location derived from your IP address); if you don&apos;t consent, we rely only on aggregated, de-identified analytics.</li>
        </ul>
        <div className="legal-callout">
          <p>
            <strong>What we don&apos;t do.</strong> We don&apos;t sell your personal information. We don&apos;t
            use your private messages, attachments, or unreleased work to train AI models. We don&apos;t
            run third-party advertising networks inside the Platform.
          </p>
        </div>
      </section>

      <section id="legal-bases">
        <h2><span className="legal-n">05</span> Legal bases (GDPR / UK GDPR)</h2>
        <p>If you are in the EEA or UK, we rely on the following legal bases:</p>
        <ul>
          <li><strong>Contract</strong>, to provide the Platform you&apos;ve signed up for (your account, profile, messaging, gigs, contracts, and payments).</li>
          <li><strong>Legitimate interests</strong>, to keep Seshn secure, prevent fraud and abuse, and improve our service, balanced against your rights.</li>
          <li><strong>Legal obligation</strong>, to retain transaction and signing records and respond to lawful requests.</li>
          <li><strong>Consent</strong>, for optional things like connecting an external music account or any non-essential communications. You can withdraw consent at any time.</li>
        </ul>
      </section>

      <section id="sharing">
        <h2><span className="legal-n">06</span> When we share information</h2>
        <p>We share personal information only in these situations:</p>
        <ul>
          <li><strong>With other members</strong>, your public profile is visible to everyone. When you message, apply, contract, or transact with someone, the information needed for that interaction is shared with them (for example, the other party to a contract can see its terms and signing record).</li>
          <li><strong>With our service providers</strong>, the vendors listed in <a className="inline" href="#processors">section 7</a>, who process data on our behalf under contract.</li>
          <li><strong>For legal reasons</strong>, when we&apos;re required to comply with a valid Australian legal process, or to protect the rights, safety, and property of Seshn, our users, or the public. We assess every request and don&apos;t hand over data in response to informal requests.</li>
          <li><strong>In a business transfer</strong>, if Seshn is involved in a merger, acquisition, or sale of assets, your information may transfer as part of that deal. We&apos;ll notify you and this policy will continue to apply.</li>
        </ul>
        <p>We do <strong>not</strong> sell your personal information or share it with data brokers.</p>
      </section>

      <section id="processors">
        <h2><span className="legal-n">07</span> Service providers &amp; sub-processors</h2>
        <p>We rely on a small set of trusted providers to operate the Platform:</p>
        <ul>
          <li><strong>Supabase</strong>, database, authentication, and file storage (your profile data, messages, attachments, and uploads).</li>
          <li><strong>Stripe</strong>, payment processing and payouts via Stripe Connect. Stripe handles your card and bank details directly under its own privacy policy.</li>
          <li><strong>Vercel</strong>, application hosting and content delivery.</li>
          <li><strong>Google Analytics</strong> (Google LLC), usage analytics that help us understand how the Platform is used. It runs only if you accept analytics cookies, you can decline or withdraw consent at any time, and Google processes this data in the United States under its own privacy policy.</li>
          <li><strong>Embedded media providers</strong>, when your profile features a Spotify, SoundCloud, or YouTube player, your browser loads content from those providers, who may set their own cookies. We only embed media you choose to add.</li>
        </ul>
        <p>
          Each provider is bound by a data-processing agreement and may only use your information to
          provide their service to us. We review this list as our stack evolves.
        </p>
      </section>

      <section id="transfers">
        <h2><span className="legal-n">08</span> International data transfers</h2>
        <p>
          Seshn is based in Australia, and some of our providers process data in other countries
          (including the United States and the European Union). Where we transfer personal information
          across borders, including from the EEA or UK, we rely on appropriate safeguards such as the
          European Commission&apos;s Standard Contractual Clauses, and we take reasonable steps to ensure
          recipients protect it consistently with this policy and APP 8. By using Seshn, you understand
          your information may be processed outside your home country.
        </p>
      </section>

      <section id="retention">
        <h2><span className="legal-n">09</span> How long we keep it</h2>
        <p>We keep personal information only as long as we need it, then delete or de-identify it:</p>
        <ul>
          <li><strong>Account &amp; profile</strong>, for as long as your account is active. When you delete your account, we remove your profile and cascade-delete your gigs, applications, sent messages, notifications, connected accounts, and uploaded files (see <a className="inline" href="#your-rights">section 11</a>).</li>
          <li><strong>Transaction, contract &amp; tax records</strong>, contracts, escrows, deliverables, disputes, and the related signing/audit records are kept for <strong>up to 7 years</strong> to comply with the Corporations Act and Australian Taxation Office record-keeping rules. The other party to a deal also retains their copy. Where possible we de-identify these records after account deletion.</li>
          <li><strong>Security &amp; audit logs</strong>, kept for as long as needed for security and legal purposes, then deleted.</li>
          <li><strong>Aggregated, de-identified analytics</strong>, may be kept indefinitely, as it no longer identifies you.</li>
        </ul>
      </section>

      <section id="security">
        <h2><span className="legal-n">10</span> How we protect it</h2>
        <p>
          We take security seriously. Access to your data is governed by database row-level security so
          that, for example, your messages are visible only to you and the person you&apos;re talking to,
          and your contracts only to the parties to them. We encrypt data in transit, restrict
          internal access on a need-to-know basis, store passwords only as secure hashes, and never
          handle your full payment-card or bank details (Stripe does). No system is perfectly secure,
          so we also maintain an audit trail and an incident-response process (see{" "}
          <a className="inline" href="#breach">section 15</a>).
        </p>
      </section>

      <section id="your-rights">
        <h2><span className="legal-n">11</span> Your rights &amp; choices</h2>
        <p>Subject to the law that applies to you, you have the right to:</p>
        <ul>
          <li><strong>Access</strong>, get a copy of the personal information we hold about you.</li>
          <li><strong>Correct</strong>, fix anything inaccurate or out of date. Most profile and account details you can update yourself in Settings.</li>
          <li><strong>Delete</strong>, ask us to delete your account and personal information (subject to the records we must legally retain, per <a className="inline" href="#retention">section 9</a>).</li>
          <li><strong>Port</strong>, receive your data in a structured, machine-readable format (JSON/CSV).</li>
          <li><strong>Object or restrict</strong>, object to, or ask us to limit, certain processing.</li>
          <li><strong>Withdraw consent</strong>, where we rely on consent, withdraw it at any time without affecting prior processing.</li>
          <li><strong>Not be discriminated against</strong>, for exercising any of these rights.</li>
        </ul>
        <div className="legal-callout">
          <p>
            <strong>A note on account deletion.</strong> If you have an in-progress contract or funds
            held in escrow, we may need to pause deletion until those are resolved, because the other
            party has rights and obligations tied to them. We&apos;ll tell you if that&apos;s the case. Some
            joint records, like a shared conversation or a signed contract, are retained for the
            other party even after you leave.
          </p>
        </div>
      </section>

      <section id="exercise">
        <h2><span className="legal-n">12</span> How to exercise your rights</h2>
        <p>
          Email <a className="inline" href="mailto:privacy@seshn.fm">privacy@seshn.fm</a> from the address
          associated with your account, or use the support tools in the app. To protect your data, we&apos;ll
          first verify that you are the account holder.
        </p>
        <p>
          We respond within <strong>30 days</strong> (the legal maximum under the APPs and GDPR), and
          usually much sooner. There&apos;s no charge for a reasonable request. If we can&apos;t fully action a
          request, we&apos;ll explain why.
        </p>
        <p>
          If you&apos;re not satisfied with our response, you can complain to a regulator: in Australia, the{" "}
          <a className="inline" href="https://www.oaic.gov.au" target="_blank" rel="noopener noreferrer">
            Office of the Australian Information Commissioner (OAIC)
          </a>; in the EEA, your local supervisory authority; or in the UK, the{" "}
          <a className="inline" href="https://ico.org.uk" target="_blank" rel="noopener noreferrer">
            Information Commissioner&apos;s Office (ICO)
          </a>. We&apos;d appreciate the chance to resolve it with you first.
        </p>
      </section>

      <section id="cookies">
        <h2><span className="legal-n">13</span> Cookies &amp; local storage</h2>
        <p>
          Seshn uses only the storage it needs to work. We keep your sign-in session in your browser&apos;s
          local storage so you stay logged in, and we use essential cookies for security and to remember
          preferences like your light/dark theme. With your consent, we use Google Analytics to understand
          how the Platform is used; it sets analytics cookies only after you accept our cookie banner, and
          you can decline, or change your mind later by clearing cookies. We don&apos;t use third-party
          advertising or cross-site tracking cookies. Note that embedded media players (Spotify, SoundCloud, YouTube)
          you add to a profile may set their own cookies when they load, those are governed by the
          relevant provider&apos;s policy. You can clear cookies and local storage in your browser settings,
          though doing so will sign you out.
        </p>
      </section>

      <section id="children">
        <h2><span className="legal-n">14</span> Children</h2>
        <p>
          Seshn is not intended for children. You must be at least <strong>16 years old</strong> to
          create an account, and at least 18 (or the age of majority where you live) to enter contracts
          or transact. We don&apos;t knowingly collect personal information from children under 16. If you
          believe a child has given us their information, contact us and we&apos;ll delete it.
        </p>
      </section>

      <section id="breach">
        <h2><span className="legal-n">15</span> Data breaches</h2>
        <p>
          We maintain an incident-response process. If a data breach is likely to result in serious
          harm, we will notify the OAIC and affected individuals as required by the{" "}
          <strong>Notifiable Data Breaches scheme</strong> under Part IIIC of the Privacy Act (and the
          equivalent GDPR/UK GDPR obligations, generally within 72 hours of becoming aware where they
          apply). We&apos;ll tell you what happened, what information was involved, and the steps you can take.
        </p>
      </section>

      <section id="changes">
        <h2><span className="legal-n">16</span> Changes to this policy</h2>
        <p>
          We may update this policy as Seshn evolves or the law changes. When we make material changes,
          we&apos;ll update the &quot;Last updated&quot; date above and, where appropriate, notify you in the
          app or by email before the change takes effect. Continuing to use Seshn after an update means
          you accept the revised policy.
        </p>
      </section>

      <section id="contact">
        <h2><span className="legal-n">17</span> How to contact us</h2>
        <div className="legal-contact">
          <p><strong>Seshn Pty Ltd</strong>, Privacy team</p>
          <p>Email: <a className="inline" href="mailto:privacy@seshn.fm">privacy@seshn.fm</a></p>
          <p>General support: <a className="inline" href="mailto:support@seshn.fm">support@seshn.fm</a></p>
          <p>Registered in New South Wales, Australia.</p>
        </div>
        <p style={{ marginTop: 16 }}>
          If you have a disability and need this policy in an accessible format, let us know and we&apos;ll
          help.
        </p>
      </section>
    </div>
  );
}
