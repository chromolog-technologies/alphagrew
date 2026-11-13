import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { SITE_PAGES } from '../siteMap';

export interface FaqItem {
  question: string;
  answer: ReactNode;
  /** Plain-text version of the answer, used by the FAQ search. */
  text: string;
}

export interface FaqGroup {
  id: string;
  title: string;
  items: FaqItem[];
}

const faq = (question: string, text: string, answer?: ReactNode): FaqItem => ({ question, text, answer: answer ?? <p>{text}</p> });

export const FAQ_GROUPS: FaqGroup[] = [
  {
    id: 'general',
    title: 'General',
    items: [
      faq(
        'What is Alphagrew?',
        "Alphagrew is a campus placement and career intelligence platform developed by Chromolog Technologies. It brings academic records, resume analysis, AI mock interviews, placement drives and analytics together, with each institution's data kept separate.",
      ),
      faq(
        'Who is it for?',
        'Institutions and their leadership, placement officers, faculty and trainers, students, and the recruiters who hire from campus.',
        <p>
          Institutions and their leadership, placement officers, faculty and trainers, students, and the recruiters who hire from
          campus. See{' '}
          <Link className="mk-link" to={SITE_PAGES.solutions.path}>
            Solutions
          </Link>{' '}
          for what each role gets.
        </p>,
      ),
      faq(
        'Is Alphagrew available today?',
        'Alphagrew is in active development. Each feature on this site is marked In current build, In development or Planned, and product pictures are illustrative mockups. Book a demo to see the current build.',
      ),
      faq(
        'Do we have to replace our existing ERP?',
        'No. Alphagrew is designed to work alongside the systems you already use for fees or admissions, and to use your student and course data for placement and preparation.',
      ),
    ],
  },
  {
    id: 'students',
    title: 'For students',
    items: [
      faq(
        'How do students get access?',
        'Access is provided through your institution. Your placement cell or institution admin invites you, or approves your registration.',
      ),
      faq(
        'Will recruiters see my mock interview scores?',
        'No. Mock interview scores are for practice. They are visible to you and to the staff at your institution who support your preparation, not to recruiters.',
      ),
      faq('Can I use Alphagrew on my phone?', 'Yes. Alphagrew is a web application that works in a mobile browser. There is no separate app to install.'),
    ],
  },
  {
    id: 'ai',
    title: 'AI and fairness',
    items: [
      faq(
        'Does the AI decide who gets placed?',
        'No. Eligibility comes only from criteria set by the company and your institution. AI features help students practise and help staff decide where to focus. Hiring decisions are made by people.',
      ),
      faq(
        'Is the AI interview spoken or typed?',
        'Interviews are typed in the current build. Speech transcription is in development but not yet in the interview screen, and there is no video interview.',
      ),
      faq(
        'Where does the AI run?',
        'AI requests are made only from the Alphagrew backend. AI provider keys are never exposed in the browser.',
      ),
    ],
  },
  {
    id: 'data',
    title: 'Data and privacy',
    items: [
      faq(
        'Can another institution see our data?',
        'No. Every record belongs to one institution, and the platform is designed so that each request only reaches the data of the signed-in user\'s institution.',
      ),
      faq(
        "How does Alphagrew approach India's DPDP Act?",
        'For student and staff data your institution provides, the institution decides why the data is used and Alphagrew processes it on its behalf. Consent records, access and correction requests, retention limits and audit trails are part of the product design.',
        <p>
          For student and staff data your institution provides, the institution decides why the data is used and Alphagrew
          processes it on its behalf. Consent records, access and correction requests, retention limits and audit trails are part
          of the product design. Read the{' '}
          <Link className="mk-link" to={SITE_PAGES.privacy.path}>
            Privacy Policy
          </Link>
          .
        </p>,
      ),
    ],
  },
  {
    id: 'setup',
    title: 'Getting started',
    items: [
      faq(
        'How do we get started?',
        'Book a demo. We will walk through the current build with your team and agree the scope of a pilot.',
        <p>
          <Link className="mk-link" to={SITE_PAGES.contact.path}>
            Book a demo
          </Link>
          . We will walk through the current build with your team and agree the scope of a pilot.
        </p>,
      ),
      faq(
        'How much does it cost?',
        'Pricing has not been published yet. Book a demo and we will discuss what your institution needs.',
      ),
      faq('Do you train our staff?', 'Yes. A pilot includes short sessions for admins, the placement cell, faculty and student coordinators.'),
    ],
  },
];
