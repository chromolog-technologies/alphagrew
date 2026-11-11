# Alphagrew marketing site

The public website for Alphagrew (a product of Chromolog Technologies): the pages a prospective institution, placement officer, faculty member, student or recruiter sees before signing in. It lives in the existing React frontend under `frontend/src/marketing/` and is kept separate from the signed-in application (sign-in at `/login`, workspace at `/app/*`, Owner Console at `/owner/*`).

Status: foundation complete (shell, design system, all 12 pages with first-draft copy). Copy, legal text and contact details need product-owner and legal sign-off before launch; see [Unresolved product questions](#unresolved-product-questions).

## 1. Stack and architecture decisions

| Decision | Why |
|---|---|
| Built inside the existing Vite + React 19 + React Router 7 + Tailwind CSS 4 frontend | Same toolchain, CI job and deploy (`vercel.json` already rewrites every path to `index.html`). No new framework or backend. |
| Marketing code in `src/marketing/`, app code untouched | Marketing pages never import app modules except `src/routes.ts` (for the app's paths) and the shared `cn()` helper and loading state. |
| The signed-in app (`App.tsx`) is lazy-loaded from `Root.tsx` | Visitors to the public site no longer download the workspace. The app arrives as separate chunks (`App`, `CampusWorkspace`, modules) only on app paths. `Root` chooses app or marketing from `APP_ROUTE_PATTERNS` in `src/routes.ts` before any `<Routes>` renders, because the app's route table uses absolute paths. |
| Every marketing page except Home and the 404 is its own chunk (`MarketingRoutes.tsx`, `lazyPage`) | The first download for a visitor fell from 146 KB to 107 KB gzipped. After the first page, the others are fetched while the browser is idle, and a loaded page renders without a loading flash. Tests call `preloadMarketingPages()` first. |
| Design tokens use new names (`navy`, `iris`, `aqua`, `ink`, `mist`, `line`) | Adding them to Tailwind's theme cannot change any colour the app already uses. |
| Component styles are `mk-` classes in `@layer components`, scoped by `.mk-site` | Utilities still override them; nothing leaks into the app. The app's global input and table rules in `index.css` now skip `.mk-site` (`:not(.mk-site *)`), a no-op for the app. |
| Fonts self-hosted (Inter, Plus Jakarta Sans for the site; Geist for the signed-in app; latin-first, variable, OFL) | No third-party font request (privacy, DPDP), no layout shift beyond `font-display: swap`. The site's fonts are ~75 KB; Geist is imported from `App.tsx` (`@fontsource-variable/geist`), so only the signed-in app downloads it. |
| Product mockups built in markup, not screenshots | Sharp at any size, themable, readable by screen readers, and every one is labelled "Sample". |
| No backend for the demo form | There is no lead endpoint in the Laravel API. The form opens a pre-filled email to `VITE_CONTACT_EMAIL`; without that variable the page says requests are not open yet. No fake submit. |
| Page metadata via a small `usePageMeta` hook | Sets title, description, canonical, robots and Open Graph tags per route without a new dependency. |

### File map

```
frontend/src/
  Root.tsx                      app paths from routes.ts (lazy app) or the marketing routes
  routes.ts                     the app's paths: /login, /forgot-password, /reset-password, /register, /invitations/accept, /app/*, /owner/*
  marketing/
    siteMap.ts                  every public page: path, label, title, description, purpose, parent, noindex
    navigation.ts               header and footer menus, built from siteMap
    config.ts                   VITE_CONTACT_EMAIL, VITE_SITE_URL, brand names
    MarketingRoutes.tsx         <Route> tree under SiteLayout, plus the 404
    marketing.css               tokens (@theme), fonts, mk- component classes, motion rules
    content/
      capabilities.ts           build status of every feature the site mentions (single source of truth)
      faq.tsx                   FAQ questions and answers
    components/
      SiteLayout.tsx            skip link, header, <main>, footer, route focus/scroll, error boundary
      SiteHeader.tsx            desktop nav with disclosure dropdowns, mobile menu panel
      SiteFooter.tsx            footer navigation and legal line
      Logo.tsx                  logo mark + wordmark
      Button.tsx                ButtonLink, ButtonAnchor, Button (primary / secondary / ghost; sm / md / lg)
      Layout.tsx                Container, Section, SectionHeader, PageHero, Breadcrumbs, CardGrid, Split
      Cards.tsx                 FeatureCard, StatusBadge, CapabilityBadge, SampleBadge, IconTile, Step
      Fields.tsx                TextField, TextAreaField, SelectField, CheckboxGroup
      Feedback.tsx              Spinner, LoadingState, ErrorState, InlineAlert, PageErrorBoundary
      CtaBand.tsx               closing call to action
      PageMeta.tsx              usePageMeta hook and <PageMeta page="..."/>
      mockups/Mockups.tsx       drive board, interview, feedback, readiness, resume illustrations
    pages/                      one file per page (legal pages share LegalPages.tsx)
    fonts/                      woff2 files and their OFL licences
    marketing.test.tsx          page, navigation, accessibility and form tests
frontend/public/brand/          logo mark and favicon cropped from frontend/public/alpha-logo.png
frontend/vite.config.ts         emits robots.txt (and sitemap.xml when VITE_SITE_URL is set) at build
```

## 2. Sitemap and route plan

All routes are public and use the shared shell. Unknown public URLs show a 404 page inside the shell (previously they redirected to `/`).

| Page | Route | Breadcrumb parent | Content purpose |
|---|---|---|---|
| Home | `/` | none | Explain in one screen what Alphagrew is and who it is for, route each audience to its solution, and lead to a demo request. |
| About us | `/about` | Home | Who builds Alphagrew, why, and the principles (students first, AI assists, institution owns data). |
| Platform / Features | `/platform` | Home | Full module map with honest build status, role access table, links to each product page. |
| AI Interviewer | `/platform/ai-interviewer` | Platform | How resume- and role-aware mock interviews work, what feedback looks like, AI guardrails. |
| Career Intelligence | `/platform/career-intelligence` | Platform | Resume analysis, readiness, eligibility checks and the batch view for staff. |
| Placement Management | `/platform/placement-management` | Platform | Drive lifecycle, eligibility model (example rule), reports. |
| Solutions hub | `/solutions` | Home | Route each audience to its page; how the roles connect; access and privacy. Old `/solutions#<role>` links redirect to the role page. |
| Institutions | `/solutions/institutions` | Solutions | Institutional oversight, department visibility, reporting, readiness. CTA: Book an Institutional Demo. |
| Placement Officers | `/solutions/placement-officers` | Solutions | Company and job postings, eligibility, shortlists, schedules, applications, notifications, reports. CTA: Simplify Your Placement Process. |
| Faculty | `/solutions/faculty` | Solutions | Preparation support, assessments, progress reviews, interventions, within granted access. CTA: Explore Faculty Workflows. |
| Students | `/solutions/students` | Solutions | Profile, resume, mock interviews, feedback, eligibility, applications, readiness. CTA: Prepare for Your Next Opportunity (student registration). |
| Recruiters | `/solutions/recruiters` | Solutions | Intended (planned) campus hiring workflow. CTA: Discuss Campus Hiring. |
| How It Works | `/how-it-works` | Home | The season in seven steps, and what a pilot rollout involves. |
| FAQs | `/faq` | Home | Remove objections (data, AI fairness, access, pricing) before a demo; searchable. |
| Contact Us / Book a Demo | `/contact` | Home | Demo request form (mailto), recruiter and student routing. |
| Privacy Policy | `/privacy` | Home | DPDP-oriented privacy notice. Draft, `noindex` until legal review. |
| Terms & Conditions | `/terms` | Home | Terms of use. Draft, `noindex` until legal review. |
| Not found | any other public path | none | Recover the visitor: home, sign in, demo, popular pages. `noindex`. |
| Sign in, workspace and Owner Console | `/login`, `/app/<page>`, `/owner/*` and the account pages | n/a | Existing application, unchanged. `noindex`; `robots.txt` disallows every app path. |

Navigation: header has **Platform** (overview + 3 products) and **Solutions** (5 roles) dropdowns, then How it works, About, FAQs, Sign in and Book a demo. The footer repeats every page, including legal links and Sign in. All labels and paths come from `siteMap.ts`, and a test fails if any page links to a path that is not in the site map or an app path from `src/routes.ts`.

## 3. Design system

### Colour tokens (Tailwind utilities: `bg-navy-900`, `text-iris-700`, ...)

The palette follows the ALPHA GREW Figma design: royal blue on white and pale blue, with a deep navy footer. The signed-in app uses the same brand blue: its `--primary` is `#246bfc`, and Tailwind's `blue-*` and `indigo-*` scales in `src/index.css` map to the same scale as `iris-*`. Token names were kept from the first version (`iris` is now the royal blue) so every page picks up the palette without markup changes.

| Token | Value | Use |
|---|---|---|
| `navy-950` / `900` / `800` / `700` / `600` | `#041a38` `#06234b` `#0a2f61` `#123d78` `#1d4f93` | Footer, emphasis bands (`tone="dark"`), mockup surfaces |
| `iris-50` … `iris-800` | `#eef5ff` … `#1046b5` (primary `iris-600 #246bfc`, hover and link text `iris-700 #1557e0`) | Primary buttons, links, eyebrows, icon tiles, active navigation |
| `aqua-300` / `400` / `700` | `#7dd3fc` `#38b6ff` `#0369a1` | Accent on navy, meter gradient |
| `ink-900` / `700` / `500` / `300` / `200` | `#0b2a5b` `#33476a` `#4f6280` `#9fb0c8` `#c3cfe0` | Navy-tinted text. 900 headings, 700 body, 500 muted on light; 200 and 300 muted on navy only |
| `mist-50` / `100`, `line` | `#f0f7fe` `#e3effd` `#dbe6f3` | Pale-blue sections, borders |

Section tones: `mk-tone-hero` (pale-blue opening band on every page), `light`, `muted` (`mist-50`), `dark` (navy), and `mk-tone-brand` (solid royal blue, used by the closing `CtaBand`). The header is white with navy links and a blue underline on the current page.

Contrast (WCAG 2.1): white on `iris-600` 4.6:1, white on `iris-700` 6.0:1, `iris-700` on white 6.0:1, `ink-500` on white 6.1:1, `ink-900` on `mist-50` 13:1, white on `navy-900` 15:1.

### Typography

- Display and headings: Plus Jakarta Sans (`font-display`), tracking −0.02 to −0.03em, `text-wrap: balance`.
- Body: Inter (`font-body`), 16px / 1.65.
- Fluid scale: `.mk-display` 36→64px, `.mk-h1` 32→52px, `.mk-h2` 28→42px, `.mk-h3` 20px, `.mk-lede` 17→20px, `.mk-eyebrow` 13px uppercase +0.08em.
- One `h1` per page (tested). Headings never skip a level within a section.

### Spacing and layout

- 4px base (Tailwind spacing). Section padding `--mk-section-y` = clamp(64px, …, 120px); `.mk-section-tight` is 60% of that.
- `Container`: max 1200px, gutters 16px (phones), 24px (≥640px), 32px (≥1024px). `narrow` = 768px.
- Section tones: `light` (white), `muted` (`mist-50`), `dark` (navy with glow). Pages alternate light and muted, with one dark band for emphasis.
- Grids: `CardGrid` 1 → 2 → 3/4 columns; `Split` stacks below 1024px.

### Breakpoints (Tailwind defaults, mobile-first)

`sm` 640px · `md` 768px · `lg` 1024px (desktop navigation appears, two-column splits) · `xl` 1280px. Verified with no horizontal scroll at 390px and 1440px on every page.

### Components

- **Buttons**: `primary` (iris gradient, one per view ideally), `secondary` (outlined; translucent on dark), `ghost` (text). Sizes `sm` 36px, `md` 44px, `lg` 52px min height. `arrow` adds a trailing arrow for forward navigation. Navigation is always a link (`ButtonLink`); `Button` is only for actions and supports `busy` (spinner, disabled, `aria-busy`).
- **Cards**: `FeatureCard` (icon tile, optional status badge, heading; with `to` the heading link covers the card, so the whole card is one tab stop). `plain` variant drops the chrome.
- **Badges**: `In development`, `Planned` (from `capabilities.ts`), `Sample` (mockups), draft (legal).
- **Form fields**: label above, `(optional)` or required asterisk, hint and error wired with `aria-describedby` and `aria-invalid`; 46px min height; focus ring `iris-600`.
- **Navigation**: sticky navy header; disclosure dropdowns (button + list of links) close on Escape (focus returns), outside click, tab-away and route change. Mobile panel: full height below the header, focus moves in, Escape closes, page behind is `inert` and scroll-locked, closes when widening to desktop.
- **Footer**: four link columns, company line.
- **Breadcrumbs**: on every inner page, derived from `siteMap.ts`, last item `aria-current="page"`.
- **Icons**: `lucide-react` (already a dependency), 1.8 stroke, 20px in tiles, decorative icons `aria-hidden`.
- **Loading and error states**: `LoadingState`, `Spinner`, `ErrorState` (with optional retry), `InlineAlert` (info / success / warning / error with the right live-region role), and `PageErrorBoundary`, which keeps header and footer usable if a page throws and resets on navigation. The lazy app uses the existing `PageLoading`.

### Motion rules

- Durations: 150ms (colour), 220ms (lift, menus), 600ms (hero entrance), 900ms (meters). Easing `cubic-bezier(0.2, 0.7, 0.2, 1)`.
- Allowed: hero fade-up with 80ms staggers, card lift 2px on hover, arrow nudge, dropdown pop, meter fill. No scroll-jacking, parallax, autoplay or looping decoration.
- Content is never hidden waiting for JavaScript or scroll position.
- `prefers-reduced-motion: reduce` removes all animations and transitions on the site and turns off smooth scrolling (the spinner keeps a slow rotation so loading is still visible).

## 4. Content rules

- Statuses were last checked against the code on 11 November 2026: the eligibility engine, rounds and offers, placement policy enforcement, notifications (in-app and email), the audit log and the placement pipeline are **In current build**; placement reports stay **In development** (no downloadable files).
- Every feature claim reads its status from `content/capabilities.ts` (sourced from `documentation/audit/02-gap-analysis.md`). Three statuses: **In current build** (built and working end to end in the code, audit ✅), **In development** (partly built), **Planned** (specified, not built). "In current build" describes the code, not a commercial launch. Change a status there and every page updates. `StatusLegend` explains the chips, plus a fourth label, **Illustrative**, for mockups.
- No customer logos, testimonials, usage metrics, pricing or integrations. The earlier static draft's stats and testimonial blocks, team placeholders and pilot-duration figures were dropped.
- Mockup data is invented sample data and is labelled `Sample` with a caption on every figure.
- Legal pages show missing facts as highlighted `[placeholders]` and a "Draft for legal review" banner, and are `noindex`.

## 5. SEO defaults

- Unique title (`Page | Alphagrew`), meta description, Open Graph title/description per route (`siteMap.ts`).
- Canonical and `og:url` when `VITE_SITE_URL` is set.
- `robots.txt` always emitted at build (disallows every app path); `sitemap.xml` emitted when `VITE_SITE_URL` is set, listing indexable pages only.
- Semantic landmarks (`header`, `nav` with labels, `main`, `footer`), one `h1`, labelled sections, real links for navigation.
- Limitation: this is a client-rendered SPA. Google renders JavaScript, but social previews and some crawlers only see `index.html` defaults. Prerendering the 12 public routes is the recommended follow-up once copy is final.

## 6. Configuration

| Variable | Required | Effect |
|---|---|---|
| `VITE_CONTACT_EMAIL` | No | Enables the demo form (opens a pre-filled email to this address) and shows the address on the contact page. |
| `VITE_SITE_URL` | No | Public origin without trailing slash. Enables canonical URLs and `sitemap.xml`. |

Both are documented in `frontend/.env.example`.

## 7. Assumptions

1. The marketing site belongs in the existing frontend and deploys with it, at `/` on the same domain as the app.
2. The product name is written "Alphagrew" (as in the PRD and the brief). The signed-in app still says "AlphaGrew".
3. The primary market is Indian higher-education institutions (batches, backlogs, CGPA cut-offs, DPDP Act), as in the PRD.
4. Build status per feature follows the 22 October 2026 code audit; features at 0–10% are "Planned", partial ones "In development".
5. A mailto-based demo request is acceptable until a lead endpoint or CRM exists.
6. Recruiters are an audience for the site even though recruiter sign-in is blocked by design today.
7. Students reach Alphagrew through their institution, so the site has no student self-signup call to action.
8. The logo mark cropped from `alpha-logo.png` is the approved mark; the wordmark is set in Plus Jakarta Sans rather than the image's lettering.

## 8. Unresolved product questions

1. **Demo requests**: which inbox should receive them (`VITE_CONTACT_EMAIL`), and should they go to a CRM or a Laravel endpoint instead of email?
2. **Domain**: what is the public URL (`VITE_SITE_URL`)?
3. **Launch claims**: which capabilities will be marketed as available at launch, and when should "In development" badges change?
4. **Legal**: registered entity name and address, Grievance Officer, hosting region, AI sub-processors, retention periods, governing-law city; and legal review of both drafts.
5. **Brand**: confirm "Alphagrew" vs "AlphaGrew", and whether a vector logo exists (the current mark is a raster crop).
6. **Pricing and plans**: will pricing or AI interview credits be published?
7. **Proof points**: when pilots produce real outcomes, which metrics and named testimonials may be used (with consent)?
8. **Company page**: should About include team members and company registration details?
9. **Analytics**: is a privacy-friendly analytics tool wanted (affects the cookie section)?
10. **Prerendering**: prerender public routes for social previews and faster first paint?

## 9. Validation checklist

Automated (`npm run lint`, `npm test`, `npm run build`):

- [x] TypeScript type check passes.
- [x] Every public page renders with exactly one `h1`, a header, main and footer, and a page title (`marketing.test.tsx`).
- [x] Every link on every page points to a page in the site map, an in-page anchor, a mailto or an app path.
- [x] Every Solutions role anchor exists.
- [x] Breadcrumbs end at the current page with `aria-current`.
- [x] Draft legal pages are `noindex`; others are not.
- [x] Dropdown opens and closes with Escape, returning focus; mobile menu sets the page `inert` and closes on Escape.
- [x] Demo form validates required fields, focuses the first error, builds the mailto; without an inbox it shows the "not open yet" notice.
- [x] Existing sign-in, reset, registration, workspace and Owner Console routes still work (lazy-loaded; `src/Root.test.tsx`).
- [x] Production build succeeds; `robots.txt` and `sitemap.xml` are generated.

Manual (checked in Chromium at 1440×900 and 390×844):

- [x] No horizontal scrolling on any page; no console errors.
- [ ] Keyboard-only pass in Safari and Firefox (skip link, menus, FAQ disclosures, form).
- [ ] Screen reader pass (VoiceOver, NVDA) of header, mobile menu and contact form.
- [ ] Reduced-motion setting on: no animation.
- [ ] 200% zoom and 320px width.
- [ ] Copy review by the product owner; legal review of Privacy and Terms.
- [ ] Lighthouse on the deployed URL (performance, accessibility, SEO).

## 10. Preview

```bash
cd frontend
npm ci
npm run dev                # http://localhost:5173 (or the port Vite prints): / is the marketing site, /login is sign-in
# Optional: try the demo form
VITE_CONTACT_EMAIL=you@example.com npm run dev
# Production build, as CI runs it
VITE_API_BASE_URL=/api/v1 npm run build && npm run preview
```

## 11. Phase 2: Home, About, Platform and How It Works

Built on the Phase 1 shell and components; no design tokens changed. New shared pieces, all in existing files:

- `Cards.tsx`: `StatusLegend`, `CapabilityList`, `RelatedLinks`; `Step` takes an optional anchor `id`.
- `Mockups.tsx`: `DashboardMockup` (home hero) and `EligibilityMockup` (Platform).
- `CtaBand.tsx`: optional `secondary` link, so the How it works page does not link to itself.
- `marketing.css`: `.mk-badge-available` (green) for the new "In current build" status.

| Page | Sections |
|---|---|
| Home | Hero ("From campus learning to career readiness") with illustrative dashboard · audience cards (5 roles) · feature highlights with status · three-step workflow · AI Interviewer, Career Intelligence and Placement Management highlights · FAQ preview (4) · Book a demo band |
| About | Hero · the problem (four fragments) · approach (preparation, coordination, recruitment on one record) · mission and vision · six product principles · Alphagrew and Chromolog Technologies · related pages · CTA |
| Platform | Hero with jump links · status legend · six areas (placement operations; profiles and resumes; opportunities and eligibility; assessments and interview preparation; readiness insights; notifications and reporting), each with capability list and, where useful, a mockup · foundations · access by role · related pages · CTA |
| How it works | Hero · eight stages with sticky stage index, roles, features used (with status) and links · "depends on your setup" note · pilot phases · related pages · CTA |

Phase 2 assumptions: "In current build" follows the audit's ✅ items (roles, invitations and registration, academic structure, career profile, resume upload, text AI interviews, announcements); the mission wording is ours and the vision is taken from the PRD; the Chromolog relationship is limited to "Alphagrew is a product developed by Chromolog Technologies", with company details left to the legal pages.

## 12. Phase 3: Solutions

- `/solutions` is a hub; each audience has its own route, title, description, canonical URL and sitemap entry, rendered by one template (`pages/SolutionRolePage.tsx`) from `content/solutions.tsx`. A role can become a separate landing page (own domain, campaign or prerendered page) by reusing its content entry; no redesign needed.
- Each role page has: hero with a tailored CTA and an illustrative preview, audience switcher (`components/SolutionNav.tsx`, real links with `aria-current`), challenges, capabilities with role-specific wording and status, workflow, benefits, access and privacy note, FAQs (`components/FaqList.tsx`, now also used by Home and the FAQ page), related feature links and a closing CTA.
- Demo CTAs go to `/contact?role=<id>`, which preselects the role in the form. The student CTA goes to student registration (`/register`), since students get access through their institution.
- New illustrative previews: `DepartmentMockup`, `ClassProgressMockup`, `StudentHomeMockup`, `CandidatePipelineMockup` (Placement Officers reuse `DriveBoardMockup`).
- New capabilities: `multiCampus` (in development), `facultyInsights`, `mentorNotes`, `candidateSharing` (planned).

Status by audience (generated from `content/solutions.tsx` and `content/capabilities.ts`); every preview is illustrative:

| Audience | In current build | In development | Planned |
|---|---|---|---|
| Institutions | Departments, courses and academic years, Roles and permissions | Placement reports, Multiple campuses, Readiness score, Audit log | None |
| Placement Officers | Announcements | Companies, drives and applications, Placement policies, Notifications, Placement reports | Job eligibility checks, Rounds, shortlists and offers |
| Faculty | Announcements | Attendance, exams and marks | Faculty view of student preparation, Assessments, Mentor notes and follow-ups |
| Students | Student career profile, Resume upload, AI mock interviews (text) | Resume analysis, Interview feedback reports, Companies, drives and applications, Readiness score | Assessments, Job eligibility checks |
| Recruiters | None | None | Job eligibility checks, Shared candidate profiles, Rounds, shortlists and offers, Recruiter portal |

## 13. Phase 4: Product pages

`/platform/ai-interviewer`, `/platform/career-intelligence` and `/platform/placement-management` were rewritten as full landing pages. Each has: hero with its own story and an illustrative preview, benefits, a "What's real today" note, a step-by-step workflow (or process diagram) with a status chip per step, a dedicated preview section, feature cards that name who benefits (linking to the audience pages), use cases, guardrails or limits, FAQs, related links to audience and product pages, and a Book a demo band.

- New shared components: `components/ProductSections.tsx` (`FeatureDetails`, `Workflow`, `UseCases`, `BenefitList`, `BuildNote`) and `components/Tabs.tsx` (WAI-ARIA tabs: arrow keys, Home and End, roving tabindex), used for the AI Interviewer's example questions.
- New illustrative previews in `components/mockups/ProductMockups.tsx`: `ResumeExtractMockup`, `InterviewSessionMockup` (labelled "Simulated", no inputs or buttons), `InterviewReportMockup`, `ReadinessDashboardMockup`, `SkillGapMockup`, `OpportunityFitMockup` (planned), `RoadmapMockup`, `PlacementDashboardMockup`. `MockFrame` and `Meter` are now exported from `Mockups.tsx`.
- Placement process diagram: `.mk-flow` in `marketing.css`, a numbered list that reads as one column on phones and a 3 × 3 grid with connectors on desktop.
- New capabilities checked against the backend: `resumeParsing`, `interviewSetup`, `difficultySteps`, `skillGap`, `recommendations`, `departmentEligibility`. `aiInterviewVoice` moved to In development (server-side transcription exists, not in the UI). `placementPolicy` wording corrected: rules are recorded, not yet enforced on apply (also fixed on the Placement Officers page and How it works).
- Titles and meta descriptions updated in `siteMap.ts`.
- Claims deliberately not made: live voice or video, real-time adaptive AI, automated hiring or shortlisting, validated or predictive readiness, guaranteed outcomes, duplicate-proof concurrency, automated email or SMS, third-party integrations, production-quality live AI (only the question-bank and rule-based fallbacks were run end to end).
