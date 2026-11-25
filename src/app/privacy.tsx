import { Body, Card, Heading, Screen, Title } from '@/components/kit';
import { POLICY_VERSION } from '@/lib/supabase';

// DRAFT privacy policy. Everything in [square brackets] must be filled in by the owner,
// and the whole policy must be reviewed by a lawyer (UK GDPR, ICO Children's Code, COPPA)
// before real children use Kidstagram. Keep this in step with the consent screen and
// bump POLICY_VERSION when it changes, so parents are asked to consent again.

type Section = { heading: string; paras?: string[]; bullets?: string[] };

const KIDS: string[] = [
  'Kidstagram is a place to make games and shows and help your friends make theirs.',
  'Your grown-up set up your account. We only know your nickname, your cartoon avatar, your username and the month and year you were born. We do not know your real name, where you live, your school or what you look like.',
  'What you make is saved so you can keep working on it. It is private unless you share it with friends.',
  'Only friends you and your grown-up said yes to can see what you share. Strangers can’t find you, and nobody can send you private messages.',
  'Never put your real name, address, school, phone number or photos of yourself in a project or comment.',
  'If something upsets or worries you, press Report and tell your grown-up.',
  'Your grown-up can see, pause or delete your account whenever they want.',
  'We never show adverts and never sell anything about you.',
];

const SECTIONS: Section[] = [
  {
    heading: 'Who we are',
    paras: [
      'Kidstagram is run by [OWNER’S FULL LEGAL NAME or COMPANY NAME] (“we”, “us”), the data controller for the information below.',
      'Contact: [PRIVACY CONTACT EMAIL] · [POSTAL ADDRESS] · ICO registration: [ICO REGISTRATION NUMBER].',
    ],
  },
  {
    heading: 'What we collect about parents',
    bullets: [
      'Your first name, email address and password (stored scrambled).',
      'That you confirmed you are 18+ and the child’s parent or legal guardian.',
      'Your consent record: your typed name, the date and the policy version you agreed to.',
      'Your choices in the parent dashboard, such as friendship approvals, pausing or deleting.',
    ],
  },
  {
    heading: 'What we collect about children',
    bullets: [
      'A nickname and a cartoon avatar (not a photo). Friends see these.',
      'A username and password for signing in. Friends never see the username.',
      'Birth month and year (never the exact date), only to pick age-appropriate safety settings.',
      'A friend code, which parents share in person so friends can connect.',
      'The games, shows, steps and comments they make, their friendships and helper invites, and any reports they make.',
    ],
    paras: [
      'We do not collect a child’s real full name, email, phone number, address, school, location, contacts, or photos or recordings of them. Our filter blocks emails, phone numbers, links, social handles, addresses and personal questions.',
    ],
  },
  {
    heading: 'Cookies and technical data',
    paras: [
      'We save a sign-in token in your browser or device so you stay signed in. We do not use advertising, analytics or tracking cookies. Our hosting and database providers keep short server logs (such as IP addresses) for security.',
    ],
  },
  {
    heading: 'Why we use it',
    bullets: [
      'To run the parent account (contract).',
      'To run your child’s account, with your consent as their parent. We ask for parental consent for all children aged 5 to 16.',
      'To keep children safe: filtering, reports, moderation and security logs (legitimate interests and legal obligations).',
      'To keep proof of consent (legal obligation).',
    ],
    paras: ['We never use children’s information for advertising, marketing or profiling, and we never sell it.'],
  },
  {
    heading: 'Who can see it',
    bullets: [
      'Your child and you (their parent or guardian).',
      'Approved friends: nickname, avatar and projects your child chose to share with friends. Projects are private by default.',
      'Helpers your child invites can edit that project.',
      'Kidstagram moderators, when something is reported or flagged.',
      'Nobody else. There is no public search and no direct messaging.',
    ],
  },
  {
    heading: 'Who we share it with',
    paras: [
      'Only service providers that help run Kidstagram, under contracts that protect the data: Supabase (database, sign-in and storage, region [SUPABASE REGION]) and GitHub Pages (hosts the website files, sees only standard web request data). Where data is handled outside the UK we use UK-approved safeguards. We may share information if the law requires it or to protect a child from harm.',
    ],
  },
  {
    heading: 'How long we keep it',
    bullets: [
      'Your child’s account and everything in it: until you delete it. Deleting it in the parent dashboard removes it straight away. Backups are overwritten within [X DAYS].',
      'Parent account: until you ask us to delete it, which also deletes your children’s accounts.',
      'Consent records: while the account exists, then up to [RETENTION PERIOD].',
      'Reports: up to [RETENTION PERIOD] after they are closed, unless needed to protect a child.',
    ],
  },
  {
    heading: 'Keeping it safe',
    paras: [
      'Database rules make sure each person only sees what they are allowed to, and these rules are tested. Connections are encrypted and passwords are never visible to us. If a breach puts anyone at risk, we will tell affected parents and, where required, the ICO.',
    ],
  },
  {
    heading: 'Your rights',
    paras: [
      'Under UK GDPR you (and your child) can ask to see, correct, delete or get a copy of your information, restrict or object to how we use it, and withdraw consent at any time. You can delete your child’s account in the parent dashboard. For anything else, email [PRIVACY CONTACT EMAIL]. It’s free and we reply within one month.',
    ],
  },
  {
    heading: 'Families in the United States (COPPA)',
    paras: [
      'For children under 13, we get verifiable parental consent before collecting their information, collect only what they need to take part, and let parents review, delete or stop further collection at any time. Operator contact: [OWNER’S FULL LEGAL NAME / COMPANY], [POSTAL ADDRESS], [PRIVACY CONTACT EMAIL], [PHONE NUMBER].',
    ],
  },
  {
    heading: 'Changes and complaints',
    paras: [
      'If we make important changes we will tell parents and, where needed, ask for consent again.',
      'If you’re unhappy, please contact us first. You can also complain to the UK Information Commissioner’s Office at ico.org.uk (0303 123 1113), or in the US to the Federal Trade Commission at ftc.gov.',
    ],
  },
];

export default function Privacy() {
  return (
    <Screen>
      <Title>Privacy policy</Title>
      <Body muted>Draft version {POLICY_VERSION}. Last updated 25 November 2026.</Body>
      <Card>
        <Heading>For kids: the short version</Heading>
        {KIDS.map((t) => (
          <Body key={t}>• {t}</Body>
        ))}
      </Card>
      {SECTIONS.map((s) => (
        <Card key={s.heading}>
          <Heading>{s.heading}</Heading>
          {s.bullets?.map((t) => (
            <Body key={t}>• {t}</Body>
          ))}
          {s.paras?.map((t) => (
            <Body key={t}>{t}</Body>
          ))}
        </Card>
      ))}
    </Screen>
  );
}
