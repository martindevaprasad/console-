import React, { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  IconArrowRight, IconArrowLeft, IconArrowDown, IconCheck, IconMenu2, IconX, IconCloud, IconCalendarEvent,
  IconCashRegister, IconChefHat, IconLayoutGrid, IconArchive, IconUsersGroup, IconUsers, IconChartBar,
  IconDiscount2, IconCash, IconToolsKitchen2, IconShieldLock, IconBolt, IconAdjustmentsHorizontal,
  IconReceipt, IconDeviceTablet, IconDeviceDesktop, IconDeviceMobile, IconBrandWindows, IconBrandApple,
  IconBrandAndroid, IconPrinter, IconBrowser, IconBurger, IconCoffee, IconCake, IconGlassFull, IconTruck,
  IconBuildingSkyscraper, IconSoup, IconBed, IconToolsKitchen, IconHeadset, IconStar,
} from '@tabler/icons-react';
import { MageWordmark } from '../layout/AppSvgs';
import { Clouds, Landscape, MarkGlow, Mascot } from './LandingArt';
import './landing.css';

const NAV_LINKS = [
  { href: '#product', label: 'Product' },
  { href: '#formats', label: 'Formats' },
  { href: '#features', label: 'Features' },
  { href: '#pricing', label: 'Pricing' },
];

// Mirrors the business-type presets the onboarding wizard offers (backend/src/lib/templates.ts).
const FORMATS = [
  { icon: IconToolsKitchen, label: 'Fine Dining' },
  { icon: IconSoup, label: 'Casual Dining' },
  { icon: IconBurger, label: 'Quick Service' },
  { icon: IconCoffee, label: 'Café & Coffee' },
  { icon: IconCake, label: 'Bakery' },
  { icon: IconGlassFull, label: 'Bar & Pub' },
  { icon: IconTruck, label: 'Food Truck' },
  { icon: IconBuildingSkyscraper, label: 'Cloud Kitchen' },
  { icon: IconBed, label: 'Hotel Outlets' },
];

const DEVICES = [
  { icon: IconBrowser, label: 'Any browser' },
  { icon: IconDeviceTablet, label: 'iPad & tablets' },
  { icon: IconBrandApple, label: 'macOS' },
  { icon: IconBrandWindows, label: 'Windows' },
  { icon: IconBrandAndroid, label: 'Android' },
  { icon: IconDeviceDesktop, label: 'Kitchen screens' },
  { icon: IconDeviceMobile, label: 'Phones' },
  { icon: IconPrinter, label: 'Receipt printers' },
];

const PILLARS = [
  { k: 'Configurable', v: 'Service flow, stations, order types and modules preset for your format' },
  { k: 'Real-time', v: 'Orders fire to the right kitchen station the moment they are sent' },
  { k: 'Multi-location', v: 'Outlets, stations and devices managed from one console' },
  { k: 'Role-based', v: 'Every screen gated by permissions, every server with a POS PIN' },
];

const CHAOS = ['lost tickets', 'split-bill maths', "86'd items", 'drawer mismatches', 'stock-outs', 'double bookings'];

const FEATURES = [
  { icon: IconCashRegister, label: 'POS terminal & payments' },
  { icon: IconChefHat, label: 'Kitchen display & bump' },
  { icon: IconLayoutGrid, label: 'Live floor plan' },
  { icon: IconCalendarEvent, label: 'Reservations & waitlist' },
  { icon: IconToolsKitchen2, label: 'Menu, modifiers & taxes' },
  { icon: IconDiscount2, label: 'Promotions & happy hours' },
  { icon: IconArchive, label: 'Inventory & recipes' },
  { icon: IconUsersGroup, label: 'Guests & loyalty' },
  { icon: IconUsers, label: 'Staff, roles & time clock' },
  { icon: IconCash, label: 'Cash, shifts & Z reports' },
  { icon: IconChartBar, label: 'Sales analytics' },
  { icon: IconShieldLock, label: 'Permissions & audit' },
];

// Placeholder pricing — confirm before launch.
const PLANS = [
  { name: 'Starter', blurb: 'Everything one counter needs to start taking orders.', monthly: 0,
    lead: 'Get started with:', perks: ['1 location, 2 devices', 'POS terminal & payments', 'Menu with modifiers & taxes', 'Daily sales reports'] },
  { name: 'Growth', badge: 'Most popular', blurb: 'For busy single sites running front and back of house.', monthly: 49,
    lead: 'Everything in Starter, plus:', perks: ['Unlimited devices', 'Kitchen display & stations', 'Floor plan & reservations', 'Inventory, recipes & purchasing'] },
  { name: 'Multi-site', blurb: 'Groups and franchises that need one view across outlets.', monthly: 199,
    lead: 'Everything in Growth, plus:', perks: ['Up to 10 locations', 'Central menu & promotions', 'Cross-location analytics', 'Priority support'] },
  { name: 'Enterprise', blurb: 'Chains, hotels and catering with custom rollouts.', monthly: null,
    lead: 'Everything in Multi-site, plus:', perks: ['Unlimited locations', 'Guided onboarding', 'Uptime SLA', 'Dedicated success manager'] },
];

const ROLES = [
  { role: 'Owner', icon: IconChartBar, say: 'Sales, labour and stock for every outlet on one dashboard, before I have finished my coffee.' },
  { role: 'Server', icon: IconCashRegister, say: 'Seat the table, send the order, split the check three ways. No running back to the till.' },
  { role: 'Head chef', icon: IconChefHat, say: 'Tickets land on my station already sorted. Bump when it is up, and the pass knows.' },
  { role: 'Manager', icon: IconUsers, say: 'Open the shift, count the drawer, close with a Z report. Roles keep everyone in their lane.' },
  { role: 'Barista', icon: IconCoffee, say: 'Oat, extra shot, half sweet. Modifiers come through exactly how the guest asked.' },
  { role: 'Buyer', icon: IconArchive, say: 'Recipes deduct stock as we sell, so reorders queue up before we run dry.' },
];

/** Adds `.in` to `.lp-reveal` elements as they scroll into view. */
function useReveal(root: React.RefObject<HTMLElement>) {
  useEffect(() => {
    const els = root.current?.querySelectorAll('.lp-reveal');
    if (!els?.length) return;
    if (!('IntersectionObserver' in window)) { els.forEach((el) => el.classList.add('in')); return; }
    const io = new IntersectionObserver((entries) => {
      entries.forEach((e) => { if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); } });
    }, { threshold: 0.12 });
    els.forEach((el) => io.observe(el));
    return () => io.disconnect();
  }, [root]);
}

export const LandingPage: React.FC = () => {
  const rootRef = useRef<HTMLDivElement>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [yearly, setYearly] = useState(false);
  useReveal(rootRef);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  useEffect(() => {
    const prev = document.title;
    document.title = 'MaGe · The restaurant operating system';
    return () => { document.title = prev; };
  }, []);

  const price = (m: number) => (yearly ? Math.round(m * 0.8) : m);

  return (
    <div className="lp" ref={rootRef}>
      {/* ── Nav ── */}
      <header className={`lp-nav${scrolled ? ' scrolled' : ''}${menuOpen ? ' open' : ''}`}>
        <div className="lp-nav-inner">
          <a href="#top" className="lp-logo" aria-label="MaGe home" onClick={() => setMenuOpen(false)}>
            <MageWordmark height={34} />
          </a>
          <nav className="lp-nav-links" aria-label="Primary">
            {NAV_LINKS.map((l) => <a key={l.href} href={l.href} onClick={() => setMenuOpen(false)}>{l.label}</a>)}
          </nav>
          <div className="lp-nav-cta">
            <Link to="/login" className="lp-btn lp-btn-ghost">Sign in</Link>
            <Link to="/register" className="lp-btn lp-btn-primary">Get started</Link>
          </div>
          <button type="button" className="lp-burger" aria-label={menuOpen ? 'Close menu' : 'Open menu'} aria-expanded={menuOpen}
            onClick={() => setMenuOpen((o) => !o)}>
            {menuOpen ? <IconX size={24} /> : <IconMenu2 size={24} />}
          </button>
        </div>
      </header>

      {/* ── Hero ── */}
      <section className="lp-hero" id="top">
        <Clouds className="lp-hero-clouds" />
        <div className="lp-container lp-hero-copy">
          <span className="lp-eyebrow lp-eyebrow-mint">The restaurant operating system</span>
          <h1 className="lp-hero-title">Escape the dinner-rush scramble</h1>
          <p className="lp-hero-sub">
            MaGe keeps your counter, floor and kitchen in sync on every screen.
            <br className="lp-br" /> Stop shouting orders across the pass and start running service.
          </p>
        </div>

        <div className="lp-container lp-hero-flow">
          <div className="lp-flow-card">
            <h3>Front of house</h3>
            <div className="lp-icon-grid">
              <span><IconCashRegister size={24} stroke={1.5} /></span>
              <span><IconLayoutGrid size={24} stroke={1.5} /></span>
              <span><IconReceipt size={24} stroke={1.5} /></span>
              <span><IconCalendarEvent size={24} stroke={1.5} /></span>
            </div>
          </div>
          <div className="lp-flow-arrow" aria-hidden><IconArrowLeft size={40} stroke={2.5} /><i /><IconArrowRight size={40} stroke={2.5} /></div>
          <div className="lp-flow-card lp-flow-hub"><MarkGlow size={130} /></div>
          <div className="lp-flow-arrow" aria-hidden><IconArrowLeft size={40} stroke={2.5} /><i /><IconArrowRight size={40} stroke={2.5} /></div>
          <div className="lp-flow-card">
            <h3>Back of house</h3>
            <div className="lp-icon-grid">
              <span><IconChefHat size={24} stroke={1.5} /></span>
              <span><IconArchive size={24} stroke={1.5} /></span>
              <span><IconCash size={24} stroke={1.5} /></span>
              <span><IconChartBar size={24} stroke={1.5} /></span>
            </div>
          </div>
        </div>

        <div className="lp-hero-ground">
          <Landscape className="lp-hero-land" />
          <Mascot className="lp-hero-mascot" size={150} />
          <div className="lp-hero-ctas">
            <Link to="/register" className="lp-btn lp-btn-mint lp-btn-lg"><IconCloud size={20} /> Start free in the cloud</Link>
            <a href="#pricing" className="lp-btn lp-btn-outline-amber lp-btn-lg"><IconHeadset size={20} /> See plans</a>
          </div>
        </div>
      </section>

      {/* ── Formats + devices ── */}
      <section className="lp-section" id="formats">
        <div className="lp-container lp-stack">
          <div className="lp-panel lp-reveal">
            <h2 className="lp-panel-title">Preconfigured for your format</h2>
            <div className="lp-format-grid">
              {FORMATS.map(({ icon: Icon, label }) => (
                <Link to="/register" key={label} className="lp-format">
                  <Icon size={26} stroke={1.5} />
                  <span>{label}</span>
                  <IconArrowRight size={18} className="lp-format-go" />
                </Link>
              ))}
            </div>
          </div>
          <div className="lp-panel lp-reveal">
            <h2 className="lp-panel-title">Runs on the hardware you already own</h2>
            <div className="lp-device-row">
              {DEVICES.map(({ icon: Icon, label }) => (
                <span key={label} className="lp-device" data-tip={label} tabIndex={0} aria-label={label}>
                  <Icon size={28} stroke={1.6} />
                </span>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── What is MaGe ── */}
      <section className="lp-section" id="product">
        <div className="lp-container">
          <h2 className="lp-h2 lp-center lp-reveal">What is MaGe?</h2>
          <p className="lp-lede lp-center lp-reveal">
            MaGe is one platform with two halves: a <strong>console</strong> where you configure menus, stations, staff and
            locations, and the <strong>service screens</strong> your team uses on shift — POS, floor plan and kitchen display — all
            reading from the same live data.
          </p>

          <div className="lp-arch lp-reveal">
            <div className="lp-arch-col">
              <div className="lp-arch-box">
                <h4>POS & floor</h4>
                <div className="lp-icon-grid sm">
                  <span><IconCashRegister size={20} stroke={1.5} /></span>
                  <span><IconLayoutGrid size={20} stroke={1.5} /></span>
                  <span><IconDeviceTablet size={20} stroke={1.5} /></span>
                </div>
              </div>
              <div className="lp-arch-up" aria-hidden><IconArrowDown size={30} stroke={2.5} /></div>
              <div className="lp-arch-pill">Payments & receipts</div>
            </div>
            <div className="lp-arch-arrow" aria-hidden><IconArrowRight size={36} stroke={2.5} /></div>
            <div className="lp-arch-box lp-arch-core">
              <h4>MaGe Cloud</h4>
              <MarkGlow size={70} />
            </div>
            <div className="lp-arch-arrow" aria-hidden><IconArrowRight size={36} stroke={2.5} /></div>
            <div className="lp-arch-out">
              <div className="lp-arch-out-head"><MarkGlow size={44} /><span>Every station</span></div>
              <div className="lp-arch-out-body">
                <div className="lp-arch-box inner">
                  <h4>Kitchen display</h4>
                  <IconChefHat size={40} stroke={1.3} />
                </div>
                <ul>
                  <li>fired instantly</li>
                  <li>routed by station</li>
                  <li>bumped to the pass</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Bring your own format ── */}
      <section className="lp-section">
        <div className="lp-container">
          <div className="lp-split lp-reveal">
            <div className="lp-split-copy">
              <span className="lp-eyebrow lp-eyebrow-lime">Bring your own format, run it on MaGe</span>
              <h2 className="lp-display">One console built for real service</h2>
              <p>Food truck at lunch, fine dining at night, a hotel with four outlets. Pick a format and MaGe presets the
                service flow, kitchen stations, order types and modules for you.</p>
              <p className="lp-muted-link">Everything stays editable later — <a href="#features">see what is included</a>.</p>
              <Mascot size={110} className="lp-split-mascot" />
            </div>
            <div className="lp-split-art">
              <h3 className="lp-split-art-title">The power of one source of truth</h3>
              <div className="lp-split-cards">
                <div className="lp-paper">
                  <div className="lp-paper-head"><IconAdjustmentsHorizontal size={44} stroke={1.3} /><span>The MaGe console</span></div>
                  {PILLARS.map((p) => (
                    <div key={p.k} className="lp-paper-row"><b>{p.k}</b><span>{p.v}</span></div>
                  ))}
                </div>
                <div className="lp-adds">
                  <h4>Your team gets</h4>
                  <div>Orders that fire straight to the kitchen</div>
                  <div>A live floor plan with table status</div>
                  <div>Checks that split, comp and refund</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Chaos vs calm ── */}
      <section className="lp-section">
        <div className="lp-container">
          <div className="lp-split lp-reveal">
            <div className="lp-split-copy">
              <span className="lp-eyebrow lp-eyebrow-amber">Avoid getting buried in tickets</span>
              <h2 className="lp-display">Make service feel calm again</h2>
              <p>When front and back of house share one live system, nobody chases paper tickets or recounts the
                drawer at midnight.</p>
              <p>Stop micromanaging the rush and let MaGe carry orders, stock and cash from the counter to the close.</p>
            </div>
            <div className="lp-compare">
              <div className="lp-compare-block">
                <h4 className="lp-compare-title">Service chaos</h4>
                <div className="lp-chaos">
                  <div className="lp-mini lp-mini-blue"><IconCashRegister size={30} /><small>Counter</small></div>
                  <div className="lp-pit">
                    {CHAOS.map((c, i) => <span key={c} className={`lp-chip lp-chip-${i}`}>{c}</span>)}
                    <div className="lp-pit-hole" />
                  </div>
                  <div className="lp-mini lp-mini-white"><IconChefHat size={30} /><small>Kitchen</small></div>
                </div>
              </div>
              <div className="lp-compare-block">
                <h4 className="lp-compare-title">Calm, synced service</h4>
                <div className="lp-calm">
                  <div className="lp-mini lp-mini-dashed"><IconCashRegister size={30} /><small>Counter</small></div>
                  <div className="lp-calm-line"><span>Synced in real time</span></div>
                  <div className="lp-mini lp-mini-dashed lp-mini-relax"><IconChefHat size={30} /><small>Kitchen</small><Mascot size={64} shades className="lp-calm-mascot" /></div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Key features ── */}
      <section className="lp-features" id="features">
        <div className="lp-container">
          <h2 className="lp-h2 lp-center lp-reveal">Key features</h2>
          <div className="lp-feature-grid lp-reveal">
            {FEATURES.map(({ icon: Icon, label }) => (
              <div key={label} className="lp-feature"><Icon size={40} stroke={1.5} /><span>{label}</span></div>
            ))}
          </div>
        </div>
        <Landscape className="lp-features-land" river />
        <Mascot size={110} shades className="lp-features-mascot" />
      </section>

      {/* ── Pricing ── */}
      <section className="lp-section lp-pricing" id="pricing">
        <div className="lp-container">
          <h2 className="lp-h1 lp-center lp-reveal">MaGe pricing</h2>
          <p className="lp-lede lp-center lp-reveal">Start taking orders for free today. No card required.</p>
          <p className="lp-caps lp-center">Choose your billing</p>
          <div className="lp-toggle" role="tablist" aria-label="Billing period">
            <button type="button" role="tab" aria-selected={!yearly} className={!yearly ? 'on' : ''} onClick={() => setYearly(false)}>
              <IconCalendarEvent size={18} /> Monthly
            </button>
            <button type="button" role="tab" aria-selected={yearly} className={yearly ? 'on' : ''} onClick={() => setYearly(true)}>
              <IconBolt size={18} /> Yearly <em>−20%</em>
            </button>
          </div>

          <div className="lp-plans lp-reveal">
            {PLANS.map((p) => (
              <article key={p.name} className="lp-plan">
                <h3>{p.name} {p.badge && <span className="lp-badge">{p.badge}</span>}</h3>
                <p className="lp-plan-blurb">{p.blurb}</p>
                <div className="lp-plan-price">
                  {p.monthly === null ? <strong className="custom">Custom</strong> : (
                    <>
                      <strong className={p.monthly === 0 ? 'free' : ''}>{p.monthly === 0 ? '$0' : `From $${price(p.monthly)}`}</strong>
                      <span>/location/month</span>
                    </>
                  )}
                </div>
                <p className="lp-plan-lead">{p.lead}</p>
                <ul>
                  {p.perks.map((x) => <li key={x}><IconCheck size={16} stroke={2.5} /> {x}</li>)}
                </ul>
                <Link to="/register" className={`lp-btn ${p.badge ? 'lp-btn-mint' : 'lp-btn-ghost'} lp-btn-block`}>
                  {p.monthly === null ? 'Talk to us' : 'Get started'}
                </Link>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* ── Start today ── */}
      <section className="lp-section">
        <div className="lp-container">
          <h2 className="lp-h2 lp-center lp-reveal">Open your doors on MaGe today</h2>
          <div className="lp-start lp-reveal">
            <div className="lp-start-card">
              <h3>Start on your own</h3>
              <div className="lp-start-art lp-start-sky">
                <Clouds className="lp-start-clouds" />
                <Mascot size={170} className="lp-start-mascot" />
              </div>
              <Link to="/register" className="lp-btn lp-btn-mint lp-btn-lg lp-btn-block"><IconCloud size={20} /> Create a free account</Link>
            </div>
            <div className="lp-start-card">
              <h3>Set up with our team</h3>
              <div className="lp-start-art lp-start-night">
                <div className="lp-laptop"><MarkGlow size={56} /></div>
                <Mascot size={150} className="lp-start-mascot right" />
              </div>
              <a href="#pricing" className="lp-btn lp-btn-amber lp-btn-lg lp-btn-block"><IconHeadset size={20} /> Book a guided setup</a>
            </div>
          </div>
        </div>
      </section>

      {/* ── Roles ── */}
      <section className="lp-section">
        <div className="lp-container">
          <h2 className="lp-h1 lp-center lp-reveal">Built for everyone on shift</h2>
          <div className="lp-roles lp-reveal">
            {ROLES.map(({ role, icon: Icon, say }) => (
              <figure key={role} className="lp-role">
                <blockquote>“{say}”</blockquote>
                <figcaption><span className="lp-role-ico"><Icon size={22} /></span><b>{role}</b></figcaption>
              </figure>
            ))}
          </div>
        </div>
      </section>

      {/* ── Footer ── */}
      <footer className="lp-footer">
        <div className="lp-container lp-footer-cta lp-reveal">
          <h2 className="lp-display">Ready for tonight’s rush?</h2>
          <div className="lp-footer-btns">
            <Link to="/register" className="lp-btn lp-btn-primary lp-btn-lg">Get started <IconArrowRight size={18} /></Link>
            <Link to="/login" className="lp-btn lp-btn-ghost lp-btn-lg">Sign in</Link>
          </div>
        </div>
        <div className="lp-container lp-footer-grid">
          <div className="lp-footer-brand">
            <MageWordmark height={30} />
            <p>The restaurant operating system — from a single food truck to a global chain.</p>
          </div>
          <div>
            <h5>Product</h5>
            <a href="#product">Overview</a><a href="#features">Features</a><a href="#pricing">Pricing</a>
          </div>
          <div>
            <h5>Formats</h5>
            <a href="#formats">Restaurants</a><a href="#formats">Cafés & bakeries</a><a href="#formats">Bars & hotels</a>
          </div>
          <div>
            <h5>Account</h5>
            <Link to="/login">Sign in</Link><Link to="/register">Create account</Link>
          </div>
        </div>
        <div className="lp-container lp-footer-base">
          <span>© {new Date().getFullYear()} MaGe. All rights reserved.</span>
          <span className="lp-stars"><IconStar size={14} /> Made for the people who run the pass.</span>
        </div>
      </footer>
    </div>
  );
};

export default LandingPage;
