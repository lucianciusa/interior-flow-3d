"use client";

import dynamic from "next/dynamic";
import Link from "next/link";

import { Nav } from "@/components/marketing/v2/Nav";
import Wizard from "@/components/marketing/v2/Wizard";
import {
  Marquee,
  StylesShowcase,
  RoomsGrid,
  TwoPass,
  CatalogSwap,
  Hierarchy,
  CompareSlider,
  Rationale,
  ShareDemo,
  ThemeDemo,
  TemplatesGrid,
  TrustGrid,
  Pricing,
  MarketingFooter,
} from "@/components/marketing/v2/Sections";

const HeroScene = dynamic(() => import("@/components/marketing/v2/HeroScene"), {
  ssr: false,
});

export default function MarketingPage() {
  return (
    <>
      <Nav />

      {/* HERO */}
      <section className="hero" id="top">
        <div className="container hero-inner">
          <div>
            <span className="hero-eyebrow">
              <span className="hero-eyebrow-pill">NEW</span>
              v1.0 · 4 rooms · 5 styles · ~40 items
            </span>
            <h1>
              Designed in <em>under 10&nbsp;seconds</em>. <br />Yours forever.
            </h1>
            <p className="hero-lede">
              Interior Flow 3D is an AI design copilot that generates a real, browseable 3D scene from a few simple choices.
              No CAD, no signup to try. Just a room you can walk into.
            </p>
            <div className="hero-cta-row">
              <a href="#wizard" className="btn btn-primary">Try it free, no signup →</a>
              <a href="#how" className="btn btn-ghost">See how it works</a>
            </div>
            <div className="hero-meta">
              <span className="hero-meta-item">10 free generations / day</span>
              <span className="hero-meta-item">Anonymous trial</span>
              <span className="hero-meta-item">Light &amp; dark</span>
            </div>
          </div>
          <div className="hero-3d">
            <div className="hero-3d-chrome">
              <span className="hero-3d-tag">
                <span className="hero-3d-tag-dot" />live · auto-orbit
              </span>
              <span className="hero-3d-tag">4×5m · scandinavian</span>
            </div>
            <div className="hero-3d-stage">
              <HeroScene />
            </div>
            <div className="hero-3d-rationale">
              <span className="hero-3d-rationale-label">Rationale · sofa_3seat</span>
              <strong>&ldquo;I placed the sofa against the south wall</strong> to face the window and ground the seating zone — the rug stretches under the coffee table to tie them together.&rdquo;
            </div>
          </div>
        </div>
      </section>

      <Marquee />

      {/* WIZARD */}
      <section className="section feature-anchor" id="wizard">
        <div className="container">
          <div className="section-head">
            <span className="section-tag">The wizard</span>
            <h2 className="section-title">Three decisions. One layout.</h2>
            <p className="section-lede">
              Design your dream room in just three simple steps. No design experience needed!
              Try our interactive wizard below and see your ideas come to life.
            </p>
          </div>
          <Wizard />
        </div>
      </section>

      {/* STYLES */}
      <section className="section feature-anchor" id="styles" style={{ background: "var(--grad-section)" }}>
        <div className="container">
          <div className="section-head">
            <span className="section-tag">5 styles</span>
            <h2 className="section-title">Five hand-tuned design profiles.</h2>
            <p className="section-lede">
              Each style is carefully crafted by professional interior designers to create harmonious, beautiful spaces. From cozy Scandinavian to sleek Minimalist, find the perfect vibe for your home.
            </p>
          </div>
          <StylesShowcase />
        </div>
      </section>

      {/* ROOMS */}
      <section className="section feature-anchor" id="rooms">
        <div className="container">
          <div className="section-head">
            <span className="section-tag">4 room types</span>
            <h2 className="section-title">Living, bedroom, dining, office.</h2>
            <p className="section-lede">
              Whether you are redesigning a cozy bedroom or a productive home office, our AI understands the unique flow of each space to suggest the perfect furniture arrangement.
            </p>
          </div>
          <RoomsGrid />
        </div>
      </section>

      {/* TWO-PASS */}
      <section className="section feature-anchor" id="how" style={{ background: "var(--grad-section)" }}>
        <div className="container">
          <TwoPass />
        </div>
      </section>

      {/* CATALOG / SWAP */}
      <section className="section feature-anchor" id="catalog">
        <div className="container">
          <CatalogSwap />
        </div>
      </section>

      {/* HIERARCHY */}
      <section className="section feature-anchor" id="hierarchy" style={{ background: "var(--grad-section)" }}>
        <div className="container">
          <div className="section-head">
            <span className="section-tag">Project → Room → Layout</span>
            <h2 className="section-title">Organize a whole home.</h2>
            <p className="section-lede">
              Plan your entire home effortlessly. Organize different rooms, save multiple design ideas for each space, and pick your favorites. Designing a full house has never been this easy.
            </p>
          </div>
          <Hierarchy />
        </div>
      </section>

      {/* COMPARE */}
      <section className="section feature-anchor" id="compare">
        <div className="container">
          <div className="section-head">
            <span className="section-tag">A/B compare</span>
            <h2 className="section-title">Drag to compare two variants.</h2>
            <p className="section-lede">
              Can&apos;t decide between two looks? Use our smooth comparison slider to easily view different designs in the exact same space. Making the perfect choice is just a swipe away.
            </p>
          </div>
          <CompareSlider />
        </div>
      </section>

      {/* RATIONALE */}
      <section className="section feature-anchor" id="rationale" style={{ background: "var(--grad-section)" }}>
        <div className="container">
          <Rationale />
        </div>
      </section>

      {/* SHARE */}
      <section className="section feature-anchor" id="share">
        <div className="container">
          <div className="section-head">
            <span className="section-tag">Share</span>
            <h2 className="section-title">Send a link. No signup needed.</h2>
            <p className="section-lede">
              Every layout has a public, read-only share URL. The recipient sees the same 3D scene + rationale you do —
              no account, no app install. Revoke any time.
            </p>
          </div>
          <ShareDemo />
        </div>
      </section>

      {/* THEME */}
      <section className="section feature-anchor" id="theme" style={{ background: "var(--grad-section)" }}>
        <div className="container">
          <div className="section-head">
            <span className="section-tag">Light &amp; dark</span>
            <h2 className="section-title">Designed for both. Persisted per user.</h2>
            <p className="section-lede">
              Toggle in the top bar; we remember it. Every component, palette, and HDRI environment is tuned for both.
            </p>
          </div>
          <ThemeDemo />
        </div>
      </section>

      {/* TEMPLATES */}
      <section className="section feature-anchor" id="templates">
        <div className="container">
          <div className="section-head">
            <span className="section-tag">Template gallery</span>
            <h2 className="section-title">Start from a curated example.</h2>
            <p className="section-lede">
              Looking for inspiration? Start with one of our professionally designed template rooms. Customize it to your liking and make it your own in seconds.
            </p>
          </div>
          <TemplatesGrid />
        </div>
      </section>

      {/* TRUST */}
      <section className="section feature-anchor" id="trust" style={{ background: "var(--grad-section)" }}>
        <div className="container">
          <div className="section-head">
            <span className="section-tag">Built for trust</span>
            <h2 className="section-title">The boring parts, done right.</h2>
            <p className="section-lede">
              Your designs are securely stored and completely private. Share them only when you want to, with links you can revoke at any time. No surprises, just peace of mind.
            </p>
          </div>
          <TrustGrid />
        </div>
      </section>

      {/* PRICING */}
      <section className="section feature-anchor" id="pricing">
        <div className="container">
          <div className="section-head" style={{ textAlign: "center" }}>
            <span className="section-tag">Pricing</span>
            <h2 className="section-title" style={{ marginLeft: "auto", marginRight: "auto" }}>
              Free during beta. Pro is coming.
            </h2>
            <p className="section-lede" style={{ marginLeft: "auto", marginRight: "auto" }}>
              Everything you need to design a home is free. Pro unlocks premium catalog items, higher-res exports, and priority queue.
            </p>
          </div>
          <Pricing />
        </div>
      </section>

      {/* FINAL CTA */}
      <section className="section">
        <div className="container">
          <div className="cta-band">
            <h2>Try it free. No signup.</h2>
            <p>You&apos;ll have a 3D living room you can orbit in under 10 seconds. If you like it, save it. If you don&apos;t, close the tab.</p>
            <a href="#wizard" className="btn">Start the wizard →</a>
          </div>
        </div>
      </section>

      <MarketingFooter />
    </>
  );
}
