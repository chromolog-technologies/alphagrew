import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { InlineAlert } from '../components/Feedback';
import { PageHero, Section } from '../components/Layout';
import { PageMeta } from '../components/PageMeta';
import { COMPANY } from '../config';
import { SITE_PAGES, type SitePageId } from '../siteMap';

/**
 * Privacy Policy and Terms. Both are drafts written for India's DPDP Act 2023 and must be
 * reviewed by a lawyer before launch. Until then they are marked noindex in siteMap.ts and
 * every missing fact is shown as a visible [placeholder] rather than invented.
 */

function Ph({ children }: { children: ReactNode }) {
  return <span className="mk-placeholder">[{children}]</span>;
}

interface LegalSection {
  id: string;
  heading: string;
  body: ReactNode;
}

function LegalPage({ page, title, sections }: { page: SitePageId; title: string; sections: LegalSection[] }) {
  return (
    <>
      <PageMeta page={page} />
      <PageHero
        page={page}
        eyebrow="Legal"
        title={title}
        lede={
          <>
            Last updated: <Ph>date of publication</Ph>
          </>
        }
      />
      <Section labelledBy="legal-toc-title">
        <div className="grid gap-10 lg:grid-cols-[15rem_1fr] lg:gap-16">
          <nav aria-labelledby="legal-toc-title" className="lg:sticky lg:top-28 lg:self-start">
            <h2 id="legal-toc-title" className="mb-3 font-body text-sm font-semibold tracking-normal text-ink-900">
              On this page
            </h2>
            <ol className="flex flex-col gap-1.5 text-sm">
              {sections.map((section) => (
                <li key={section.id}>
                  <Link to={{ hash: section.id }} className="text-ink-500 hover:text-iris-700">
                    {section.heading}
                  </Link>
                </li>
              ))}
            </ol>
          </nav>
          <article className="mk-prose">
            <InlineAlert tone="warning" title="Draft for legal review" className="mb-8">
              This document is a starting draft written with the Digital Personal Data Protection Act, 2023 and the DPDP Rules in
              mind. It is not legal advice. A qualified lawyer must review it, and every highlighted placeholder must be filled in,
              before it is published.
            </InlineAlert>
            {sections.map((section) => (
              <section key={section.id} aria-labelledby={section.id}>
                <h2 id={section.id}>{section.heading}</h2>
                {section.body}
              </section>
            ))}
          </article>
        </div>
      </Section>
    </>
  );
}

const privacyLink = (
  <Link to={SITE_PAGES.privacy.path} className="mk-link">
    Privacy Policy
  </Link>
);

const PRIVACY: LegalSection[] = [
  {
    id: 'who',
    heading: '1. Who we are',
    body: (
      <p>
        Alphagrew is a product of {COMPANY}, <Ph>legal entity name and registered office address</Ph> (“Alphagrew”, “we”, “us”).
        This policy explains how we handle personal data when you use the Alphagrew platform, this website and related services.
      </p>
    ),
  },
  {
    id: 'roles',
    heading: "2. Our role and your institution's role",
    body: (
      <>
        <p>
          Most personal data on Alphagrew is provided by, or on behalf of, an educational institution that uses the platform. For
          that data, <strong>the institution is the Data Fiduciary</strong> and decides why and how the data is processed. Alphagrew
          acts as a <strong>Data Processor</strong> and processes it only on the institution's instructions under a written agreement.
        </p>
        <p>For data we collect for our own purposes, such as demo requests and account security logs, Alphagrew is the Data Fiduciary.</p>
      </>
    ),
  },
  {
    id: 'collect',
    heading: '3. Personal data we process',
    body: (
      <ul>
        <li><strong>Identity and contact:</strong> name, email, phone number, institution, role, enrolment or employee number.</li>
        <li><strong>Academic records:</strong> department, course, batch, attendance, marks, results and backlogs, as provided by the institution.</li>
        <li><strong>Career data:</strong> resumes, skills, documents, AI mock interview transcripts and feedback, applications and placement results.</li>
        <li><strong>Recruiter data:</strong> names and contact details of company representatives, job descriptions and drive details.</li>
        <li><strong>Technical data:</strong> device and browser information, IP address, sign-in times and security logs.</li>
        <li><strong>Website enquiries:</strong> the details you send us when you request a demo.</li>
      </ul>
    ),
  },
  {
    id: 'purpose',
    heading: '4. Why we process it',
    body: (
      <>
        <ul>
          <li>To provide the platform to your institution: records, mock interviews, career insights and placement drives.</li>
          <li>To keep the service secure, prevent misuse and keep each institution's data separate.</li>
          <li>To respond to demo requests and support queries.</li>
          <li>To improve the service using aggregated or de-identified information.</li>
          <li>To meet legal obligations.</li>
        </ul>
        <p>We do not sell personal data, and we do not use student data for advertising.</p>
      </>
    ),
  },
  {
    id: 'consent',
    heading: '5. Consent',
    body: (
      <p>
        Where consent is the basis for processing, it is collected through a clear notice in plain language, and you can withdraw
        it at any time as easily as you gave it. Withdrawal does not affect processing that happened before it.
      </p>
    ),
  },
  {
    id: 'children',
    heading: '6. Students under 18',
    body: (
      <p>
        Some students may be under 18. For them, the institution must obtain verifiable consent from a parent or lawful guardian
        before their personal data is processed on Alphagrew. We do not track, profile or target advertising at children.
      </p>
    ),
  },
  {
    id: 'ai',
    heading: '7. AI features',
    body: (
      <>
        <p>The AI Interviewer and Career Intelligence features process interview responses and resumes to generate practice feedback. These features:</p>
        <ul>
          <li>run through our servers; AI provider keys are never exposed to your browser;</li>
          <li>are used for practice and guidance only, not to make automated hiring, admission or academic decisions;</li>
          <li>show students the feedback and scores generated about them.</li>
        </ul>
        <p>
          We use third-party AI model providers as sub-processors: <Ph>name providers and confirm their data-use terms</Ph>.
        </p>
      </>
    ),
  },
  {
    id: 'share',
    heading: '8. Who we share data with',
    body: (
      <ul>
        <li><strong>Your institution</strong> and the staff it authorises, according to their roles.</li>
        <li><strong>Recruiters</strong>, only the candidate information the institution or the student chooses to share for a specific drive.</li>
        <li><strong>Sub-processors</strong> who help us run the service, such as hosting, email delivery and AI model providers: <Ph>list of sub-processors</Ph>.</li>
        <li><strong>Authorities</strong>, where the law requires it.</li>
      </ul>
    ),
  },
  {
    id: 'storage',
    heading: '9. Where data is stored',
    body: (
      <p>
        Data is stored on cloud infrastructure in <Ph>hosting region</Ph>. If any data is processed outside India, we do so only as
        permitted under the DPDP Act.
      </p>
    ),
  },
  {
    id: 'security',
    heading: '10. How we protect data',
    body: (
      <p>
        We use reasonable security safeguards, including separation of each institution's data, role-based access, encryption in
        transit and access logs. If a personal data breach occurs, we will inform the affected institution without delay so that
        the Data Protection Board of India and affected individuals can be notified as the law requires.
      </p>
    ),
  },
  {
    id: 'retention',
    heading: '11. How long we keep data',
    body: (
      <p>
        We keep personal data only as long as needed for the purposes above or as your institution's agreement specifies, and then
        delete it unless the law requires us to keep it: <Ph>retention periods by data type</Ph>.
      </p>
    ),
  },
  {
    id: 'rights',
    heading: '12. Your rights',
    body: (
      <>
        <p>Under the DPDP Act you may:</p>
        <ul>
          <li>get a summary of the personal data processed about you;</li>
          <li>ask for your data to be corrected, completed, updated or erased;</li>
          <li>withdraw consent where processing is based on consent;</li>
          <li>nominate another person to exercise your rights in case of death or incapacity;</li>
          <li>have your grievance addressed.</li>
        </ul>
        <p>If your data was provided by your institution, contact the institution first; we will help it respond.</p>
      </>
    ),
  },
  {
    id: 'grievance',
    heading: '13. Grievance Officer',
    body: (
      <p>
        <Ph>Grievance Officer name, email and postal address</Ph>. If you are not satisfied with our response, you may approach the
        Data Protection Board of India.
      </p>
    ),
  },
  {
    id: 'cookies',
    heading: '14. Cookies and storage',
    body: (
      <p>
        The platform uses essential browser storage to keep you signed in securely. This website does not use advertising cookies:{' '}
        <Ph>confirm any analytics tool before launch</Ph>.
      </p>
    ),
  },
  {
    id: 'changes',
    heading: '15. Changes to this policy',
    body: <p>We will post any changes on this page and update the date at the top. Material changes will be communicated to institutions.</p>,
  },
];

const TERMS: LegalSection[] = [
  {
    id: 'about',
    heading: '1. About these terms',
    body: (
      <p>
        These terms govern your use of the Alphagrew platform and website, operated by {COMPANY} <Ph>legal entity name</Ph>. By
        using the platform you agree to these terms. If your institution has signed a separate agreement with us, that agreement
        takes precedence where the two differ.
      </p>
    ),
  },
  {
    id: 'accounts',
    heading: '2. Accounts',
    body: (
      <ul>
        <li>Accounts are created by your institution, or with its approval.</li>
        <li>Keep your sign-in details private. You are responsible for activity under your account.</li>
        <li>Tell your institution or us at once if you think your account has been misused.</li>
        <li>We may suspend an account that breaks these terms or puts other users at risk.</li>
      </ul>
    ),
  },
  {
    id: 'institutions',
    heading: '3. Institutions',
    body: (
      <p>
        Institutions are responsible for the accuracy of the data they upload, for having a lawful basis to share it with us, for
        issuing the required notices and obtaining consents (including verifiable parental consent for students under 18), and for
        the actions of the staff they give access to.
      </p>
    ),
  },
  {
    id: 'use',
    heading: '4. Acceptable use',
    body: (
      <>
        <p>You must not:</p>
        <ul>
          <li>access data belonging to another institution or user, or try to get around access controls;</li>
          <li>upload content that is unlawful, misleading or infringes someone else's rights;</li>
          <li>impersonate another person or misrepresent academic records;</li>
          <li>scrape, disrupt or overload the platform.</li>
        </ul>
      </>
    ),
  },
  {
    id: 'ai',
    heading: '5. AI-generated feedback',
    body: (
      <p>
        Mock interview scores, resume suggestions and readiness insights are generated with AI for practice and guidance. They may
        be incomplete or wrong, they are not a guarantee of placement, and Alphagrew does not use them to make hiring, admission or
        academic decisions.
      </p>
    ),
  },
  {
    id: 'recruiters',
    heading: '6. Recruiters',
    body: (
      <p>
        Recruiters may use candidate information only for the drive it was shared for, must handle it in line with applicable law,
        and must not contact students outside the process agreed with the institution.
      </p>
    ),
  },
  {
    id: 'fees',
    heading: '7. Fees',
    body: (
      <p>
        Fees and payment terms are set out in your institution's order form or agreement: <Ph>billing, renewal and refund terms</Ph>.
      </p>
    ),
  },
  {
    id: 'ip',
    heading: '8. Intellectual property',
    body: (
      <p>
        Alphagrew owns the platform and its software. Your institution and its users own the data they upload, and give us
        permission to use it only to provide and improve the service as described in our {privacyLink}.
      </p>
    ),
  },
  {
    id: 'availability',
    heading: '9. Availability and changes',
    body: (
      <p>
        We aim to keep the platform available and will give notice of planned maintenance where we can. Service levels, if any, are
        set out in your institution's agreement: <Ph>SLA reference</Ph>.
      </p>
    ),
  },
  {
    id: 'liability',
    heading: '10. Disclaimers and liability',
    body: (
      <p>
        To the extent permitted by law, the platform is provided “as is”. We are not liable for indirect or consequential losses or
        for the outcome of any recruitment process. Our total liability is limited to <Ph>liability cap</Ph>.
      </p>
    ),
  },
  {
    id: 'ending',
    heading: '11. Ending use',
    body: (
      <p>
        You may stop using the platform at any time. When an institution's subscription ends, its data is handled as described in its
        agreement and our {privacyLink}, including export and deletion.
      </p>
    ),
  },
  {
    id: 'law',
    heading: '12. Governing law',
    body: (
      <p>
        These terms are governed by the laws of India. Courts at <Ph>city</Ph> have exclusive jurisdiction, subject to any dispute
        resolution clause in your institution's agreement.
      </p>
    ),
  },
  {
    id: 'contact',
    heading: '13. Contact',
    body: (
      <p>
        Questions about these terms: <Ph>legal contact email</Ph>.
      </p>
    ),
  },
];

export function PrivacyPage() {
  return <LegalPage page="privacy" title="Privacy Policy" sections={PRIVACY} />;
}

export function TermsPage() {
  return <LegalPage page="terms" title="Terms and Conditions" sections={TERMS} />;
}
