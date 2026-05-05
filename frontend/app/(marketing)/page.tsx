"use client";

import dynamic from "next/dynamic";
import Link from "next/link";

import { Nav } from "@/components/marketing/v2/Nav";
import Wizard from "@/components/marketing/v2/Wizard";
import { useAuthStore } from "@/lib/stores/auth";
import {
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

import { useLanguage } from "@/lib/stores/useLanguage";
import { marketingTranslations } from "@/lib/marketing-translations";

export default function MarketingPage() {
  const session = useAuthStore((s) => s.session);
  const { language } = useLanguage();
  const t = marketingTranslations[language] || marketingTranslations.en;

  return (
    <>
      <Nav t={t.nav} />

      {/* HERO */}
      <section className="hero" id="top">
        <div className="container hero-inner">
          <div>
            <span className="hero-eyebrow">
              <span className="hero-eyebrow-pill">{t.hero.eyebrowPill}</span>
              {t.hero.eyebrow}
            </span>
            <h1>
              {t.hero.title1} <em>{t.hero.title2}</em>{t.hero.title3}
            </h1>
            <p className="hero-lede">
              {t.hero.ledeBase}
              {session ? ` ${t.hero.ledeSession}` : ` ${t.hero.ledeAnon}`}
            </p>
            <div className="hero-cta-row">
              <a href="#wizard" className="btn btn-primary">{t.hero.ctaPrimary}</a>
              <a href="#how" className="btn btn-ghost">{t.hero.ctaSecondary}</a>
            </div>
            <div className="hero-meta">
              <span className="hero-meta-item">{t.hero.meta1}</span>
              <span className="hero-meta-item">{t.hero.meta2}</span>
              <span className="hero-meta-item">{t.hero.meta3}</span>
            </div>
          </div>
          <div className="hero-3d">
            <div className="hero-3d-chrome">
              <span className="hero-3d-tag">
                <span className="hero-3d-tag-dot" />{t.hero.tagLive}
              </span>
              <span className="hero-3d-tag">{t.hero.tagDim}</span>
            </div>
            <div className="hero-3d-stage">
              <HeroScene />
            </div>
            <div className="hero-3d-rationale">
              <span className="hero-3d-rationale-label">{t.hero.rationaleLabel}</span>
              <strong>&ldquo;{t.hero.rationaleTextPrefix}</strong>{t.hero.rationaleTextSuffix}&rdquo;
            </div>
          </div>
        </div>
      </section>

      {/* WIZARD */}
      <section className="section feature-anchor" id="wizard">
        <div className="container">
          <div className="section-head">
            <span className="section-tag">{t.sections.wizard.tag}</span>
            <h2 className="section-title">{t.sections.wizard.title}</h2>
            <p className="section-lede">
              {t.sections.wizard.lede}
            </p>
          </div>
          <Wizard t={t.wizard_demo} />
        </div>
      </section>

      {/* STYLES */}
      <section className="section feature-anchor" id="styles" style={{ background: "var(--grad-section)" }}>
        <div className="container">
          <div className="section-head">
            <span className="section-tag">{t.sections.styles.tag}</span>
            <h2 className="section-title">{t.sections.styles.title}</h2>
            <p className="section-lede">
              {t.sections.styles.lede}
            </p>
          </div>
          <StylesShowcase />
        </div>
      </section>

      {/* ROOMS */}
      <section className="section feature-anchor" id="rooms">
        <div className="container">
          <div className="section-head">
            <span className="section-tag">{t.sections.rooms.tag}</span>
            <h2 className="section-title">{t.sections.rooms.title}</h2>
            <p className="section-lede">
              {t.sections.rooms.lede}
            </p>
          </div>
          <RoomsGrid t={t.wizard_demo.roomTypes} />
        </div>
      </section>

      {/* TWO-PASS */}
      <section className="section feature-anchor" id="how" style={{ background: "var(--grad-section)" }}>
        <div className="container">
          <TwoPass t={t.sections.twopass} />
        </div>
      </section>

      {/* CATALOG / SWAP */}
      <section className="section feature-anchor" id="catalog">
        <div className="container">
          <CatalogSwap t={t.sections.catalog} />
        </div>
      </section>

      {/* HIERARCHY */}
      <section className="section feature-anchor" id="hierarchy" style={{ background: "var(--grad-section)" }}>
        <div className="container">
          <div className="section-head">
            <span className="section-tag">{t.sections.hierarchy.tag}</span>
            <h2 className="section-title">{t.sections.hierarchy.title}</h2>
            <p className="section-lede">
              {t.sections.hierarchy.lede}
            </p>
          </div>
          <Hierarchy t={t.sections.hierarchy} />
        </div>
      </section>

      {/* COMPARE */}
      <section className="section feature-anchor" id="compare">
        <div className="container">
          <div className="section-head">
            <span className="section-tag">{t.sections.compare.tag}</span>
            <h2 className="section-title">{t.sections.compare.title}</h2>
            <p className="section-lede">
              {t.sections.compare.lede}
            </p>
          </div>
          <CompareSlider />
        </div>
      </section>

      {/* RATIONALE */}
      <section className="section feature-anchor" id="rationale" style={{ background: "var(--grad-section)" }}>
        <div className="container">
          <Rationale t={t.sections.rationale} />
        </div>
      </section>

      {/* SHARE */}
      <section className="section feature-anchor" id="share">
        <div className="container">
          <div className="section-head">
            <span className="section-tag">{t.sections.share.tag}</span>
            <h2 className="section-title">{t.sections.share.title}</h2>
            <p className="section-lede">
              {t.sections.share.lede}
            </p>
          </div>
          <ShareDemo />
        </div>
      </section>

      {/* THEME */}
      <section className="section feature-anchor" id="theme" style={{ background: "var(--grad-section)" }}>
        <div className="container">
          <div className="section-head">
            <span className="section-tag">{t.sections.theme.tag}</span>
            <h2 className="section-title">{t.sections.theme.title}</h2>
            <p className="section-lede">
              {t.sections.theme.lede}
            </p>
          </div>
          <ThemeDemo />
        </div>
      </section>

      {/* TEMPLATES */}
      <section className="section feature-anchor" id="templates">
        <div className="container">
          <div className="section-head">
            <span className="section-tag">{t.sections.templates.tag}</span>
            <h2 className="section-title">{t.sections.templates.title}</h2>
            <p className="section-lede">
              {t.sections.templates.lede}
            </p>
          </div>
          <TemplatesGrid t={t.sections.templates} />
        </div>
      </section>

      {/* TRUST */}
      <section className="section feature-anchor" id="trust" style={{ background: "var(--grad-section)" }}>
        <div className="container">
          <div className="section-head">
            <span className="section-tag">{t.sections.trust.tag}</span>
            <h2 className="section-title">{t.sections.trust.title}</h2>
            <p className="section-lede">
              {t.sections.trust.lede}
            </p>
          </div>
          <TrustGrid t={t.sections.trust} />
        </div>
      </section>

      {/* PRICING */}
      <section className="section feature-anchor" id="pricing">
        <div className="container">
          <div className="section-head" style={{ textAlign: "center" }}>
            <span className="section-tag">{t.sections.pricing.tag}</span>
            <h2 className="section-title" style={{ marginLeft: "auto", marginRight: "auto" }}>
              {t.sections.pricing.title}
            </h2>
            <p className="section-lede" style={{ marginLeft: "auto", marginRight: "auto" }}>
              {t.sections.pricing.lede}
            </p>
          </div>
          <Pricing t={t.sections.pricing} />
        </div>
      </section>


      {/* FINAL CTA */}
      <section className="section">
        <div className="container">
          <div className="cta-band">
            <h2>{t.sections.final.title}</h2>
            <p>{t.sections.final.copy}</p>
            <a href="#wizard" className="btn">{t.sections.final.cta}</a>
          </div>
        </div>
      </section>

      <MarketingFooter t={t.footer} />
    </>
  );
}
