// Seshn — entry point. Loads after all atoms/screens/info scripts.

const {
  LandingDesktop, LandingMobile,
  AuthDesktop, AuthMobile, OnboardingDesktop,
  ProfileDesktop, ProfileMobile,
  FeedDesktop, FeedMobile,
  GigDetailDesktop, GigDetailMobile,
  CreateDesktop, CreateMobile, CreateReviewDesktop,
  BrowseDesktop, BrowseMobile,
  ProjectDesktop, ProjectMobile,
  DMDesktop, DMMobile,
  ProDesktop, ProMobile,
  CoverCard, PaletteCard, TypeCard, ComponentsCard, EmptyStatesCard, DevNotesCard,
  DesignCanvas, DCSection, DCArtboard,
} = window;

const D = { w: 1280, h: 800 };
const M = { w: 390, h: 760 };
const CARD = { w: 1280, h: 720 };

const App = () => (
  <DesignCanvas>
    <DCSection id="intro" title="Seshn — wireframes" subtitle="Music collaboration platform · MVP · v0.1">
      <DCArtboard id="cover" label="01 · Rationale" width={CARD.w} height={CARD.h}>
        <CoverCard />
      </DCArtboard>
      <DCArtboard id="palette" label="Palette" width={CARD.w} height={CARD.h}>
        <PaletteCard />
      </DCArtboard>
      <DCArtboard id="type" label="Typography" width={CARD.w} height={CARD.h}>
        <TypeCard />
      </DCArtboard>
    </DCSection>

    <DCSection id="s1" title="01 · Landing (logged out)" subtitle="Editorial hero, live feed snippet, three-up features">
      <DCArtboard id="s1d" label="Desktop · 1280" width={D.w} height={D.h}><LandingDesktop /></DCArtboard>
      <DCArtboard id="s1m" label="Mobile · 390" width={M.w} height={M.h}><LandingMobile /></DCArtboard>
    </DCSection>

    <DCSection id="s2" title="02 · Sign up / log in + onboarding" subtitle="Split-screen form · 3-step onboarding (roles → genres → portfolio)">
      <DCArtboard id="s2d" label="Auth · Desktop" width={D.w} height={D.h}><AuthDesktop /></DCArtboard>
      <DCArtboard id="s2m" label="Auth · Mobile" width={M.w} height={M.h}><AuthMobile /></DCArtboard>
      <DCArtboard id="s2o" label="Onboarding · Step 1 · Desktop" width={D.w} height={D.h}><OnboardingDesktop /></DCArtboard>
    </DCSection>

    <DCSection id="s3" title="03 · Profile page" subtitle="Header · bio · portfolio · looking-for · recent posts · CTAs">
      <DCArtboard id="s3d" label="Desktop" width={D.w} height={D.h}><ProfileDesktop /></DCArtboard>
      <DCArtboard id="s3m" label="Mobile" width={M.w} height={M.h}><ProfileMobile /></DCArtboard>
    </DCSection>

    <DCSection id="s4" title="04 · Home feed (logged in)" subtitle="Filters · gig feed · suggested artists · Pro upsell">
      <DCArtboard id="s4d" label="Desktop" width={D.w} height={D.h}><FeedDesktop /></DCArtboard>
      <DCArtboard id="s4m" label="Mobile" width={M.w} height={M.h}><FeedMobile /></DCArtboard>
    </DCSection>

    <DCSection id="s5" title="05 · View post (gig detail)" subtitle="Full post · poster card · apply form · related">
      <DCArtboard id="s5d" label="Desktop" width={D.w} height={D.h}><GigDetailDesktop /></DCArtboard>
      <DCArtboard id="s5m" label="Mobile" width={M.w} height={M.h}><GigDetailMobile /></DCArtboard>
    </DCSection>

    <DCSection id="s6" title="06 · Create post flow" subtitle="Step 2 details · Step 3 review with boost upsell">
      <DCArtboard id="s6d" label="Step 2 · Details · Desktop" width={D.w} height={D.h}><CreateDesktop /></DCArtboard>
      <DCArtboard id="s6m" label="Step 2 · Details · Mobile" width={M.w} height={M.h}><CreateMobile /></DCArtboard>
      <DCArtboard id="s6r" label="Step 3 · Review + Boost · Desktop" width={D.w} height={D.h}><CreateReviewDesktop /></DCArtboard>
    </DCSection>

    <DCSection id="s7" title="07 · Browse profiles" subtitle="Filter sidebar · grid of artist cards · sort & layout switch">
      <DCArtboard id="s7d" label="Desktop" width={D.w} height={D.h}><BrowseDesktop /></DCArtboard>
      <DCArtboard id="s7m" label="Mobile" width={M.w} height={M.h}><BrowseMobile /></DCArtboard>
    </DCSection>

    <DCSection id="s8" title="08 · Project room" subtitle="Chat with audio/file inline · members panel · deadline">
      <DCArtboard id="s8d" label="Desktop" width={D.w} height={D.h}><ProjectDesktop /></DCArtboard>
      <DCArtboard id="s8m" label="Mobile" width={M.w} height={M.h}><ProjectMobile /></DCArtboard>
    </DCSection>

    <DCSection id="s9" title="09 · Direct messages" subtitle="Conversation list · active conversation · audio attachments">
      <DCArtboard id="s9d" label="Desktop" width={D.w} height={D.h}><DMDesktop /></DCArtboard>
      <DCArtboard id="s9m" label="Mobile" width={M.w} height={M.h}><DMMobile /></DCArtboard>
    </DCSection>

    <DCSection id="s10" title="10 · Pro upgrade" subtitle="Free vs Pro · $5/mo or $48/yr · Stripe checkout">
      <DCArtboard id="s10d" label="Desktop" width={D.w} height={D.h}><ProDesktop /></DCArtboard>
      <DCArtboard id="s10m" label="Mobile" width={M.w} height={M.h}><ProMobile /></DCArtboard>
    </DCSection>

    <DCSection id="comp" title="Components · contracts" subtitle="Gig card variants · audio embed · tag pills · avatar + role">
      <DCArtboard id="compd" label="Component spec" width={CARD.w} height={CARD.h}><ComponentsCard /></DCArtboard>
    </DCSection>

    <DCSection id="empty" title="Empty states" subtitle="Feed · portfolio · inbox · project room — desktop & mobile variants">
      <DCArtboard id="emptyd" label="Empty states" width={CARD.w} height={CARD.h}><EmptyStatesCard /></DCArtboard>
    </DCSection>

    <DCSection id="dev" title="Dev notes" subtitle="Two things that will bite if you don't plan for them">
      <DCArtboard id="devd" label="Dev notes" width={CARD.w} height={CARD.h}><DevNotesCard /></DCArtboard>
    </DCSection>
  </DesignCanvas>
);

ReactDOM.createRoot(document.getElementById('root')).render(<App />);
