# Marketing claims — sources & citations

Every statistic and fee figure used on the marketing site (`lib/landing/content.ts`),
with its source, the exact figure, and a confidence note. Keep this in sync when
copy changes — it's what we point to if a claim is ever challenged.

Confidence key: ✅ verified against a primary/strong secondary source ·
⚠️ directionally supported but the exact number needs the original survey ·
🔁 suggested swap to a stronger, verifiable figure.

---

## CH 05 — Fee comparison ("Make more of what you earn")

The whole table is built on published, typical industry rates. Seshn's flat 10%
(Stripe processing included) is **both** dramatically cheaper than the
traditional team stack **and** competitive with the best creative marketplaces.

| Claim in copy | Figure | Confidence | Source |
|---|---|---|---|
| Personal/artist manager commission | 15–20% of gross | ✅ | Orphiq, *How Much Do Music Managers Charge?*; Sonicbids, *Understanding Artist Management Agreements Pt.3*; Briffa Legal |
| Booking agent commission | ~10% (typical 5–15%) | ✅ | Music Admin, *Booking Agents in the Music Industry*; Recording Academy, go.grammy.com |
| Business manager commission | 5% of gross | ✅ | Music Connection Magazine, *Business Managers: Bills and Investments*; Josiah Soren, *Industry Roles & Rates* |
| Entertainment lawyer | ~5% of advance (or $150–500/hr) | ✅ | TAXI FAQ, *Music Lawyers: What They Cost*; Josiah Soren |
| "Full team stack ≈ 40% combined" | 20 + 10 + 5 + 5 = 40% | ✅ | Sum of the four rows above |
| Major-label artist royalty | 15–20% (new artists 13–16%) | ✅ | Julia Holt Law Firm, *Recoupment in Record Deals*; Curve Royalty Systems, *Royalties 101*; Indie Music Academy |
| "Label recoups advances before you see a cent" | Recoupment is standard | ✅ | Julia Holt Law Firm; Mark Tavern Management, *Royalties, Recoupment & Cross-Collateralization* |
| "Label keeps ~80%" | Artist 15–20% ⇒ label ~80% | ✅ | Implied by the royalty rate above |

### Marketplace comparison (footnote / optional row)

| Platform | Seller-side fee | Source |
|---|---|---|
| Fiverr | 20% flat (plus buyer-side service fee) | GigRadar; BestJobSearchApps, *Upwork vs Fiverr 2026* |
| Upwork | 0–15% variable, ~10% typical (changed May 2025) | GigRadar, *Upwork Fees 2026*; UseFreelance |
| SoundBetter | ~10% (7% service + 3% transaction) | Gearspace, *Commission fee SoundBetter.com?* |
| AirGigs | 8–15% by seller tier | AirGigs.com |
| **Seshn** | **Flat 10%, Stripe processing included** | `lib/stripe/config.ts` (`PLATFORM_FEE_BPS = 1000`) |

> Takeaway: Seshn matches the *cheapest* music marketplace (SoundBetter ~10%) while
> **absorbing the card-processing fee inside that 10%** — Fiverr (20%) and AirGigs
> (up to 15%) add processing on top. Versus the traditional career stack it isn't close.

---

## CH 01 — The problem ("signal-to-noise is broken")

| Claim in copy | Figure | Confidence | Source |
|---|---|---|---|
| "100K+ songs uploaded to streaming / day" | ~99,000/day (2024); ~106,000/day (2025) | ✅ | Luminate Year-End Reports 2024 & 2025, via Music Business Worldwide |
| "~47.6% of tracks got fewer than ten plays" | 93.2M of 202M tracks <10 plays in 2024 (≈46%); 120.5M of 253M in 2025 | ✅ | Music Business Worldwide / Luminate 2024–2025 |
| "77.8% earn under $15K/yr from music" | 77.8% of surveyed artists <$15K | ✅ | Xposure Music, *Independent Music Industry Report 2025* |
| "Financial pressure is the #1 reason artists leave" | Financial strain replaced "lack of exposure" as the #1 career barrier | ✅ | Xposure Music 2025; corroborated by Mixmag (*76% say a music career is financially unsustainable*) |
| "64.4% cite financial pressure (up from 39% in 2023)" | The trend (up sharply) is supported; **exact 64.4%/39% needs the original Xposure report** | ⚠️ | Xposure Music 2025 / 2023 — verify the precise numbers in the source PDF before quoting |
| "96% of new music is independent or DIY" *(swapped in)* | Indie/DIY = 96.2% of daily uploads in 2025 | ✅ | Luminate 2025, via Music Business Worldwide. Replaced the unverifiable "78% / CoCreatea" stat. |
| "0.2% of tracks drive half of all streams" *(swapped in)* | ~541,000 tracks (0.2%) = 49.4% of global audio streams in 2025 | ✅ | Luminate 2025, via MBW. Replaced the unverifiable "57K/7.94M" stat. |

---

## Action items before a paid campaign

1. ~~Confirm or replace the two soft stats (78% collaborators, 57K/7.94M streams).~~
   **Done** — both swapped to the Luminate-grounded figures above.
2. **Pull exact figures** for the 64.4%/39% financial-pressure line from the Xposure
   2025 PDF and record the page here.
3. Keep this file updated whenever `content.ts` stats change.

---

### Full source URLs

**Fees**
- https://orphiq.com/resources/music-manager-commission
- https://blog.sonicbids.com/understanding-artist-management-agreements-part-3-how-are-managers-paid-and-how-much
- https://www.briffa.com/blog/music-management-contracts-payment/
- https://www.musicadmin.com/guides/booking-agents-in-the-music-industry/
- https://go.grammy.com/music-careers/music-agent/
- https://www.musicconnection.com/business-managers-bills-and-investments/
- https://www.josiahsoren.com/articles/music-industry-professional-roles-rates-and-responsibilities
- https://www.taxi.com/music-business-faq/artists-management/music-lawyers-cost/
- https://www.juliaholtlaw.com/blog/understanding-recoupment-in-record-deals-a-guide-for-artists
- https://www.curveroyaltysystems.com/royalties-101-recorded-music/lesson-4-what-a-record-label-deal-looks-like
- https://www.indiemusicacademy.com/blog/music-royalties-explained
- https://www.marktavern.com/blog/2020/8/1/an-artists-guide-to-royalties-recoupment-amp-cross-collateralization

**Marketplaces**
- https://gigradar.io/blog/upwork-vs-fiverr-compare
- https://gigradar.io/blog/upwork-fee-breakdown
- https://www.usefreelance.com/post/upworks-new-fee-structure-explained-what-freelancers-need-to-know-in-2026
- https://gearspace.com/board/career-work/1271997-commission-fee-soundbetter-com.html
- https://www.airgigs.com/

**Problem / market**
- https://www.musicbusinessworldwide.com/there-are-now-more-than-200m-tracks-on-audio-streaming-services-nearly-100m-of-them-attracted-no-more-than-10-plays-each/
- https://www.musicbusinessworldwide.com/quarter-of-a-billion-tracks-now-sit-on-music-streaming-services-where-does-it-end/
- https://luminatedata.com/reports/yearend-music-industry-report-2024/
- https://luminatedata.com/reports/yearend-music-industry-report-2025/
- https://info.xposuremusic.com/article/music-industry-report-2025
- https://mixmag.net/read/new-artists-career-financially-unsustainable-study-news
