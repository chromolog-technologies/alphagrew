import { fireEvent, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Routes } from 'react-router-dom';
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { marketingRoutes, preloadMarketingPages } from './MarketingRoutes';
import { demoRequestMailto, validateDemoRequest } from './pages/ContactPage';
import { APP_ROUTE_PATTERNS } from '../routes';
import { SITE_PAGES, SOLUTION_ROLES, type SitePageId } from './siteMap';

function renderSite(path: string) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>{marketingRoutes()}</Routes>
    </MemoryRouter>,
  );
}

// Pages are lazy chunks; load them all first so each test can render synchronously.
beforeAll(() => preloadMarketingPages());

// jsdom has no scrolling; route changes call window.scrollTo.
window.scrollTo = (() => {}) as typeof window.scrollTo;

const PAGE_IDS = Object.keys(SITE_PAGES) as SitePageId[];
const KNOWN_PATHS = new Set(PAGE_IDS.map((id) => SITE_PAGES[id].path));

afterEach(() => {
  vi.unstubAllEnvs();
});

describe('marketing site pages', () => {
  it.each(PAGE_IDS)('renders %s with one h1, a title and the shared shell', (id) => {
    renderSite(SITE_PAGES[id].path);

    expect(screen.getAllByRole('heading', { level: 1 })).toHaveLength(1);
    expect(screen.getByRole('banner')).toBeInTheDocument();
    expect(screen.getByRole('main')).toBeInTheDocument();
    expect(screen.getByRole('contentinfo')).toBeInTheDocument();
    expect(document.title).toContain('Alphagrew');
  });

  it('shows breadcrumbs on inner pages, ending at the current page', () => {
    renderSite(SITE_PAGES.aiInterviewer.path);

    const trail = screen.getByRole('navigation', { name: 'Breadcrumb' });
    expect(within(trail).getByRole('link', { name: 'Home' })).toHaveAttribute('href', '/');
    expect(within(trail).getByRole('link', { name: 'Platform' })).toHaveAttribute('href', '/platform');
    expect(within(trail).getByText('AI Interviewer')).toHaveAttribute('aria-current', 'page');
  });

  it('keeps draft legal pages out of search results', () => {
    renderSite(SITE_PAGES.privacy.path);
    expect(document.head.querySelector('meta[name="robots"]')).toHaveAttribute('content', 'noindex, follow');

    renderSite(SITE_PAGES.about.path);
    expect(document.head.querySelector('meta[name="robots"]')).toBeNull();
  });

  it('gives every audience its own page with a tailored call to action', () => {
    const ctas = {
      institutions: 'Book an Institutional Demo',
      'placement-officers': 'Simplify Your Placement Process',
      faculty: 'Explore Faculty Workflows',
      students: 'Prepare for Your Next Opportunity',
      recruiters: 'Discuss Campus Hiring',
    } as const;
    const titles = new Set<string>();
    for (const role of SOLUTION_ROLES) {
      const { unmount } = renderSite(SITE_PAGES[role.page].path);
      titles.add(document.title);
      const switcher = screen.getByRole('navigation', { name: 'Solutions by audience' });
      expect(within(switcher).getByRole('link', { name: role.label })).toHaveAttribute('aria-current', 'page');
      expect(screen.getAllByRole('link', { name: new RegExp(ctas[role.id]) }).length).toBeGreaterThanOrEqual(2);
      for (const title of ['What Alphagrew provides', 'How it works for you', 'Common questions']) {
        expect(screen.getByRole('heading', { level: 2, name: title })).toBeInTheDocument();
      }
      expect(screen.getByText('Access and privacy')).toBeInTheDocument();
      expect(screen.getByText(/^Illustrat/, { selector: 'figcaption' })).toBeInTheDocument();
      unmount();
    }
    expect(titles.size).toBe(SOLUTION_ROLES.length);
  });

  it('sends old /solutions#role links to the role page', () => {
    renderSite('/solutions#recruiters');

    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Campus hiring that starts from verified records.');
  });

  it('keeps recruiter and faculty pages honest about unbuilt features', () => {
    renderSite('/solutions/recruiters');
    expect(screen.getByText(/Recruiter sign-in is not available yet/)).toBeInTheDocument();
    // Features the placement cell runs today may be built; the recruiter portal itself is not.
    const portal = screen.getByText('Recruiter portal').closest('li');
    expect(portal).not.toBeNull();
    expect(within(portal as HTMLElement).getByText('Planned')).toBeInTheDocument();

    renderSite('/solutions/faculty');
    expect(screen.getByText(/Faculty views of student preparation are planned, not yet available/)).toBeInTheDocument();
  });

  it('links only to known pages, anchors or sign-in', () => {
    for (const id of PAGE_IDS) {
      const { unmount } = renderSite(SITE_PAGES[id].path);
      for (const link of screen.getAllByRole('link', { hidden: true })) {
        const href = link.getAttribute('href') ?? '';
        if (href.startsWith('mailto:') || href.startsWith('#')) continue;
        const [pathname] = href.split(/[?#]/);
        const ok = KNOWN_PATHS.has(pathname || SITE_PAGES[id].path) || APP_ROUTE_PATTERNS.some((pattern) => (pattern.endsWith('/*') ? pathname.startsWith(pattern.slice(0, -1)) : pathname === pattern));
        expect(ok, `${id}: ${href}`).toBe(true);
      }
      unmount();
    }
  });
});

describe('Phase 2 pages', () => {
  const h2s = () => screen.getAllByRole('heading', { level: 2 }).map((h) => h.textContent ?? '');

  it('home covers every required section and leads to a demo', () => {
    renderSite('/');

    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('From campus learning to career readiness.');
    for (const title of [
      'Everyone in the placement season, on one platform',
      'The tools a placement season needs',
      'Three steps from first record to final offer',
      'A mock interview for every student, not just the top twenty',
      'Know where every student stands before the first company arrives',
      'Every drive, round and offer in one list',
      'Questions institutions ask first',
    ]) {
      expect(h2s()).toContain(title);
    }
    expect(screen.getByText(/Illustrative dashboard/)).toBeInTheDocument();
    expect(screen.getAllByRole('link', { name: /book a demo/i }).length).toBeGreaterThanOrEqual(2);
    expect(document.querySelectorAll('details')).toHaveLength(4);
  });

  it('about covers problem, mission, vision, principles and the company relationship', () => {
    renderSite('/about');

    expect(h2s()).toEqual(
      expect.arrayContaining([
        'Placement work is split across too many places',
        'Mission and vision',
        'Product principles',
        'Alphagrew and Chromolog Technologies',
      ]),
    );
    expect(screen.getByText('Mission')).toBeInTheDocument();
    expect(screen.getByText('Vision')).toBeInTheDocument();
  });

  it('platform has the six feature areas, a status legend and jump links', () => {
    renderSite('/platform');

    const areas = ['placement-operations', 'profiles-resumes', 'opportunities-eligibility', 'interview-preparation', 'readiness-insights', 'notifications-reporting'];
    for (const id of areas) expect(document.getElementById(id)).not.toBeNull();
    expect(within(screen.getByRole('navigation', { name: 'Feature areas' })).getAllByRole('link')).toHaveLength(6);
    for (const label of ['In current build', 'In development', 'Planned', 'Illustrative']) {
      expect(screen.getAllByText(label).length).toBeGreaterThan(0);
    }
  });

  it('how it works lists eight stages and the configuration caveat', () => {
    renderSite('/how-it-works');

    const stages = screen.getAllByRole('heading', { level: 3 }).filter((h) => h.closest('li')?.id);
    expect(stages.map((h) => h.textContent)).toEqual([
      'Institution onboarding and setup',
      'Student and faculty onboarding',
      'Profile and resume preparation',
      'Opportunities and eligibility checks',
      'Preparation and AI interview practice',
      'Placement drive coordination',
      'Applications and outcomes',
      'Reporting and continuous improvement',
    ]);
    expect(screen.getByText('Your flow depends on your setup')).toBeInTheDocument();
  });
});

describe('product pages', () => {
  const h2s = () => screen.getAllByRole('heading', { level: 2 }).map((h) => h.textContent ?? '');
  const PRODUCTS = ['/platform/ai-interviewer', '/platform/career-intelligence', '/platform/placement-management'];

  it.each(PRODUCTS)('%s has every shared section, a demo CTA and labelled mockups', (path) => {
    renderSite(path);

    const headings = h2s();
    expect(headings.some((h) => /^What .* includes$/.test(h))).toBe(true);
    expect(screen.getByRole('heading', { level: 2, name: /^Why it helps|Interview practice|Preparation guided|Less copying/ })).toBeInTheDocument();
    expect(document.getElementById('features-title')).not.toBeNull();
    expect(document.getElementById('uses-title')).not.toBeNull();
    expect(document.getElementById('faq-title')).not.toBeNull();
    expect(screen.getByRole('complementary', { name: "What's real today" })).toBeInTheDocument();
    expect(screen.getAllByText(/^Who benefits:/).length).toBeGreaterThanOrEqual(6);
    expect(screen.getAllByRole('link', { name: /book a demo/i }).length).toBeGreaterThanOrEqual(2);
    expect(document.querySelectorAll('details').length).toBeGreaterThanOrEqual(5);
    const audienceLinks = screen.getAllByRole('link').filter((link) => link.getAttribute('href')?.startsWith('/solutions/'));
    expect(audienceLinks.length).toBeGreaterThan(3);
    for (const caption of document.querySelectorAll('figcaption')) {
      expect(caption.textContent).toMatch(/Illustrat|Simulated/);
    }
  });

  it('AI Interviewer walks the six-step flow and is honest about voice and adaptivity', () => {
    renderSite('/platform/ai-interviewer');

    const steps = within(document.getElementById('workflow')!).getAllByRole('heading', { level: 3 });
    expect(steps.map((h) => h.textContent)).toEqual([
      'Upload a resume',
      'Read skills, projects and experience',
      'Choose a role and interview type',
      'Plan the questions',
      'Answer in writing',
      'Show feedback and next steps',
    ]);
    expect(screen.getByText(/Simulated interview screen/)).toBeInTheDocument();
    expect(screen.getByText(/Illustrative feedback report/)).toBeInTheDocument();
    expect(screen.getAllByText(/there is no video/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/It is a rule, not live AI judgement/).length).toBe(1);
  });

  it('AI Interviewer example questions are real, keyboard-operable tabs', async () => {
    const user = userEvent.setup();
    renderSite('/platform/ai-interviewer');

    const tablist = screen.getByRole('tablist', { name: 'Example questions by interview type' });
    const tabs = within(tablist).getAllByRole('tab');
    expect(tabs.map((tab) => tab.textContent)).toEqual(['Technical', 'HR', 'Resume deep dive', 'System design', 'Mixed']);
    expect(tabs[0]).toHaveAttribute('aria-selected', 'true');
    expect(tabs[1]).toHaveAttribute('tabindex', '-1');

    await user.click(tabs[0]);
    await user.keyboard('{ArrowRight}');
    expect(tabs[1]).toHaveAttribute('aria-selected', 'true');
    expect(tabs[1]).toHaveFocus();
    expect(screen.getByRole('tabpanel')).toHaveTextContent(/Tell me about yourself/);

    await user.keyboard('{End}');
    expect(tabs[4]).toHaveFocus();
    await user.keyboard('{ArrowRight}');
    expect(tabs[0]).toHaveAttribute('aria-selected', 'true');
    expect(screen.getAllByRole('tabpanel')).toHaveLength(1);
  });

  it('Career Intelligence explains readiness without claiming prediction', () => {
    renderSite('/platform/career-intelligence');

    for (const title of [
      'Each competency, checked against real evidence',
      'How the readiness indicator is calculated',
      'Why a job suits a student, in plain words',
      'Support for development, not a verdict',
    ]) {
      expect(h2s()).toContain(title);
    }
    expect(screen.getByRole('table', { name: /readiness indicator/i })).toBeInTheDocument();
    expect(screen.getByText(/have not been validated against placement outcomes/)).toBeInTheDocument();
    expect(screen.getByText(/do not promise an interview, an offer or a salary/i)).toBeInTheDocument();
    for (const label of ['Illustrative readiness view', 'Illustrative skill-gap view', 'Illustration of a planned feature', 'Illustrative improvement plan']) {
      expect(screen.getByText(new RegExp(label))).toBeInTheDocument();
    }
  });

  it('Placement Management shows the nine-stage process and its limits', () => {
    renderSite('/platform/placement-management');

    const process = screen.getByRole('list', { name: 'Placement process stages' });
    expect(within(process).getAllByRole('heading', { level: 3 }).map((h) => h.textContent)).toEqual([
      'Company and job details',
      'Eligibility rules',
      'Eligible student list',
      'Applications',
      'Drive schedule',
      'Notices and notifications',
      'Interview stages',
      'Outcomes',
      'Reports',
    ]);
    expect(h2s()).toContain('Each role sees its own part of a drive');
    expect(screen.getByText(/No automated messaging/)).toBeInTheDocument();
    expect(screen.getByText(/No concurrency guarantees/)).toBeInTheDocument();
    expect(screen.getByText(/Illustrative placement dashboard/)).toBeInTheDocument();
  });
});

describe('site header', () => {
  it('opens a dropdown and closes it with Escape, returning focus', async () => {
    const user = userEvent.setup();
    renderSite('/');

    const nav = screen.getByRole('navigation', { name: 'Main' });
    const platform = within(nav).getByRole('button', { name: 'Platform' });
    expect(platform).toHaveAttribute('aria-expanded', 'false');

    await user.click(platform);
    expect(platform).toHaveAttribute('aria-expanded', 'true');
    expect(within(nav).getByRole('link', { name: /AI Interviewer/ })).toBeVisible();

    await user.keyboard('{Escape}');
    expect(platform).toHaveAttribute('aria-expanded', 'false');
    expect(platform).toHaveFocus();
  });

  it('opens the mobile menu and makes the page behind it inert', async () => {
    const user = userEvent.setup();
    renderSite('/');

    const toggle = screen.getByRole('button', { name: 'Open menu' });
    await user.click(toggle);

    expect(screen.getByRole('button', { name: 'Close menu' })).toHaveAttribute('aria-expanded', 'true');
    expect(document.getElementById('main')).toHaveAttribute('inert');

    fireEvent.keyDown(document, { key: 'Escape' });
    expect(screen.getByRole('button', { name: 'Open menu' })).toHaveAttribute('aria-expanded', 'false');
    expect(document.getElementById('main')).not.toHaveAttribute('inert');
  });
});

describe('demo request', () => {
  it('explains that requests are not open when no inbox is configured', () => {
    vi.stubEnv('VITE_CONTACT_EMAIL', '');
    renderSite('/contact');

    expect(screen.getByText('Online demo requests open soon')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /continue in your email app/i })).toBeNull();
  });

  it('preselects the role when coming from a solution page', () => {
    vi.stubEnv('VITE_CONTACT_EMAIL', 'demo@example.com');
    renderSite('/contact?role=recruiters');

    expect(screen.getByRole('combobox', { name: /your role/i })).toHaveValue('Recruiter');
  });

    it('validates required fields and moves focus to the first problem', async () => {
    vi.stubEnv('VITE_CONTACT_EMAIL', 'demo@example.com');
    const user = userEvent.setup();
    renderSite('/contact');

    await user.click(screen.getByRole('button', { name: /continue in your email app/i }));

    const name = screen.getByRole('textbox', { name: /full name/i });
    expect(name).toHaveAttribute('aria-invalid', 'true');
    expect(name).toHaveFocus();
    expect(screen.getByText('Enter your institution or company.')).toBeInTheDocument();
    expect(screen.getByText('Enter your email address.')).toBeInTheDocument();
  });

  it('builds a pre-filled email from the request', () => {
    const request = {
      name: 'Asha Rao',
      email: 'asha@college.edu.in',
      institution: 'Sample College',
      role: 'Training and placement officer',
      phone: '',
      size: '500 to 2,000',
      interests: ['AI Interviewer'],
      message: '',
    };

    expect(validateDemoRequest(request)).toEqual({});
    expect(validateDemoRequest({ ...request, email: 'not-an-email' }).email).toMatch(/email address like/);

    const url = new URL(demoRequestMailto('demo@example.com', request));
    expect(url.protocol).toBe('mailto:');
    expect(url.searchParams.get('subject')).toBe('Alphagrew demo request: Sample College');
    expect(url.searchParams.get('body')).toContain('Interested in: AI Interviewer');
    expect(url.searchParams.get('body')).not.toContain('Phone:');
  });
});
