/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Character, Scenario, Stats, PressQuestion, DiplomacyVisit } from './types';

export const INITIAL_STATS: Stats = {
  economy: 50,
  stability: 50,
  approval: 50,
  military: 50,
  health: 50,
};

export const INITIAL_TREASURY = 1000000000; // 1 Billion Ksh

export const DEPUTY_CANDIDATES: Character[] = [
  {
    id: 'deputy-1',
    name: 'Dr. Sarah Mbeki',
    role: 'Economic Strategist',
    brief: 'A former World Bank director. Highly competent in finance but lacks grassroots connection.',
    image: 'https://picsum.photos/seed/sarah/400/400',
    bonus: { economy: 15 },
    malus: { approval: -5 },
  },
  {
    id: 'deputy-2',
    name: 'General Marcus Thorne',
    role: 'Security Specialist',
    brief: 'A war hero with deep military ties. Ensures stability through strength but can be authoritarian.',
    image: 'https://picsum.photos/seed/marcus/400/400',
    bonus: { military: 15, stability: 5 },
    malus: { approval: -10 },
  },
  {
    id: 'deputy-3',
    name: 'Elena Vance',
    role: 'Social Reformer',
    brief: 'Beloved by the youth and activists. Great for approval, but struggles with the old guard.',
    image: 'https://picsum.photos/seed/elena/400/400',
    bonus: { approval: 20 },
    malus: { stability: -10 },
  },
];

export const MINISTER_CANDIDATES: Record<string, Character[]> = {
  finance: [
    {
      id: 'fin-1',
      name: 'James Wealth',
      role: 'Finance Minister',
      brief: 'Conservative spender. Focuses on treasury growth and stability.',
      image: 'https://picsum.photos/seed/james/400/400',
      bonus: { economy: 10 },
    },
    {
      id: 'fin-2',
      name: 'Linda Coin',
      role: 'Finance Minister',
      brief: 'Aggressive investor. High risk, high reward. Can boost economy fast but risky.',
      image: 'https://picsum.photos/seed/linda/400/400',
      bonus: { economy: 20 },
      malus: { stability: -5 },
    },
    {
      id: 'fin-3',
      name: 'Robert Ledger',
      role: 'Finance Minister',
      brief: 'Pragmatic accountant. Excellent at finding hidden waste.',
      image: 'https://picsum.photos/seed/robert/400/400',
      bonus: { economy: 5, stability: 5 },
    },
  ],
  defense: [
    {
      id: 'def-1',
      name: 'Col. Iron',
      role: 'Defense Minister',
      brief: 'Focuses on border security and military readiness.',
      image: 'https://picsum.photos/seed/iron/400/400',
      bonus: { military: 10 },
    },
    {
      id: 'def-2',
      name: 'Gen. Peace',
      role: 'Defense Minister',
      brief: 'Diplomacy-first approach. Good for stability.',
      image: 'https://picsum.photos/seed/peace/400/400',
      bonus: { stability: 10 },
    },
    {
      id: 'def-3',
      name: 'Admiral Tide',
      role: 'Defense Minister',
      brief: 'Naval expert. Focuses on coastal security and trade routes.',
      image: 'https://picsum.photos/seed/tide/400/400',
      bonus: { military: 5, economy: 5 },
    },
  ],
  health: [
    {
      id: 'heal-1',
      name: 'Dr. Cure',
      role: 'Health Minister',
      brief: 'Expert in pandemic prevention and public health systems.',
      image: 'https://picsum.photos/seed/cure/400/400',
      bonus: { health: 15 },
    },
    {
      id: 'heal-2',
      name: 'Nurse Mercy',
      role: 'Health Minister',
      brief: 'Grassroots health advocate. High approval but low budget discipline.',
      image: 'https://picsum.photos/seed/mercy/400/400',
      bonus: { health: 10, approval: 10 },
      malus: { economy: -5 },
    },
    {
      id: 'heal-3',
      name: 'Dr. Bio',
      role: 'Health Minister',
      brief: 'Biotech visionary. Focuses on future-proofing health.',
      image: 'https://picsum.photos/seed/bio/400/400',
      bonus: { health: 5, economy: 5 },
    },
  ],
  infrastructure: [
    {
      id: 'infra-1',
      name: 'Eng. Build',
      role: 'Infrastructure Minister',
      brief: 'Master of mega-projects. Boosts economy and stability.',
      image: 'https://picsum.photos/seed/build/400/400',
      bonus: { economy: 5, stability: 5 },
    },
    {
      id: 'infra-2',
      name: 'Sarah Steel',
      role: 'Infrastructure Minister',
      brief: 'Focuses on urban renewal and affordable housing.',
      image: 'https://picsum.photos/seed/steel/400/400',
      bonus: { approval: 10, stability: 5 },
    },
    {
      id: 'infra-3',
      name: 'Tom Road',
      role: 'Infrastructure Minister',
      brief: 'Logistics expert. Focuses on rural connectivity.',
      image: 'https://picsum.photos/seed/road/400/400',
      bonus: { economy: 10 },
    },
  ],
  foreign: [
    {
      id: 'for-1',
      name: 'Ambassador Grace',
      role: 'Foreign Minister',
      brief: 'Seasoned diplomat. Excellent at trade negotiations.',
      image: 'https://picsum.photos/seed/grace/400/400',
      bonus: { economy: 10, stability: 5 },
    },
    {
      id: 'for-2',
      name: 'Victor Global',
      role: 'Foreign Minister',
      brief: 'Aggressive nationalist. Focuses on national interest first.',
      image: 'https://picsum.photos/seed/victor/400/400',
      bonus: { military: 10 },
      malus: { stability: -5 },
    },
    {
      id: 'for-3',
      name: 'Sofia Peace',
      role: 'Foreign Minister',
      brief: 'Humanitarian focus. Boosts international approval.',
      image: 'https://picsum.photos/seed/sofia/400/400',
      bonus: { approval: 15 },
    },
  ],
  interior: [
    {
      id: 'int-1',
      name: 'Chief Law',
      role: 'Interior Minister',
      brief: 'Strict law and order advocate.',
      image: 'https://picsum.photos/seed/law/400/400',
      bonus: { stability: 15 },
      malus: { approval: -5 },
    },
    {
      id: 'int-2',
      name: 'Maria Community',
      role: 'Interior Minister',
      brief: 'Focuses on community policing and social cohesion.',
      image: 'https://picsum.photos/seed/community/400/400',
      bonus: { approval: 10, stability: 5 },
    },
    {
      id: 'int-3',
      name: 'David Order',
      role: 'Interior Minister',
      brief: 'Efficiency expert. Focuses on modernizing the civil service.',
      image: 'https://picsum.photos/seed/order/400/400',
      bonus: { economy: 5, stability: 5 },
    },
  ],
};

export const PRESS_QUESTIONS: PressQuestion[] = [
  {
    id: 'pq-1',
    journalist: 'John Reporter',
    outlet: 'The National Times',
    question: 'Mr. President, the cost of living is rising. What is your administration doing about it?',
    options: [
      {
        text: 'We are implementing price controls on essential goods.',
        consequences: { stats: { approval: 10, economy: -5 }, message: 'The public is relieved, but economists warn of shortages.' },
      },
      {
        text: 'We are focusing on long-term economic growth to raise incomes.',
        consequences: { stats: { economy: 5, approval: -5 }, message: 'The market responds well, but the public feels ignored.' },
      },
      {
        text: 'The global situation is difficult, but we are managing.',
        consequences: { stats: { stability: -5 }, message: 'Your answer is seen as evasive.' },
      },
    ],
  },
  {
    id: 'pq-2',
    journalist: 'Sarah News',
    outlet: 'Global Watch',
    question: 'There are rumors of instability in your cabinet. Can you comment?',
    options: [
      {
        text: 'My cabinet is united and focused on the people.',
        consequences: { stats: { stability: 5, approval: -5 }, message: 'A standard denial. Some are skeptical.' },
      },
      {
        text: 'Healthy debate is a sign of a strong democracy.',
        consequences: { stats: { approval: 5, stability: -5 }, message: 'The public appreciates the transparency.' },
      },
      {
        text: 'I will not comment on baseless rumors.',
        consequences: { stats: { stability: -10 }, message: 'Your silence fuels further speculation.' },
      },
    ],
  },
];

export const DIPLOMACY_VISITS: DiplomacyVisit[] = [
  {
    id: 'visit-1',
    country: 'United Republic of Aurum',
    leader: 'President Gold',
    image: 'https://picsum.photos/seed/diplomacy1/1920/1080',
    objectives: [
      {
        id: 'obj-1',
        title: 'Seek Development Funds',
        description: 'Ask for a low-interest loan to fund infrastructure projects.',
        consequences: { stats: { economy: 10 }, treasury: 500000000, message: 'Loan secured: +500M Ksh.' },
      },
      {
        id: 'obj-2',
        title: 'Negotiate Trade Agreement',
        description: 'Open markets for our agricultural exports.',
        consequences: { stats: { economy: 15, approval: 5 }, treasury: 0, message: 'Trade deal signed! Exports are booming.' },
      },
      {
        id: 'obj-3',
        title: 'Strengthen Military Alliance',
        description: 'Joint military exercises and intelligence sharing.',
        consequences: { stats: { military: 15, stability: 5 }, treasury: -50000000, message: 'Strategic partnership solidified.' },
      },
    ],
  },
  {
    id: 'visit-2',
    country: 'The Northern Federation',
    leader: 'Chancellor Frost',
    image: 'https://picsum.photos/seed/diplomacy2/1920/1080',
    objectives: [
      {
        id: 'obj-4',
        title: 'Energy Partnership',
        description: 'Secure a steady supply of natural gas.',
        consequences: { stats: { economy: 10, stability: 10 }, treasury: -200000000, message: 'Energy security guaranteed.' },
      },
      {
        id: 'obj-5',
        title: 'Technology Exchange',
        description: 'Collaborate on AI and digital infrastructure.',
        consequences: { stats: { economy: 15, health: 5 }, treasury: -100000000, message: 'Tech hub initiative launched.' },
      },
    ],
  },
];

export const SCENARIOS: Scenario[] = [
  {
    id: 'recession',
    title: 'The Great Slump',
    description: 'Global markets have crashed. Our exports are worth half what they were yesterday. Inflation is rising.',
    image: 'https://picsum.photos/seed/recession/800/400',
    choices: [
      {
        text: 'Austerity Measures: Cut public spending and raise taxes.',
        consequences: {
          stats: { economy: 10, approval: -20, stability: -10 },
          treasury: 200000000,
          message: 'The treasury grows, but the people are furious. Protests break out.',
        },
      },
      {
        text: 'Stimulus Package: Inject funds into small businesses.',
        consequences: {
          stats: { economy: 15, approval: 10, stability: 5 },
          treasury: -300000000,
          message: 'The economy breathes, but the debt is heavy.',
        },
      },
      {
        text: 'Do Nothing: Let the market correct itself.',
        consequences: {
          stats: { economy: -20, approval: -10, stability: -15 },
          treasury: 0,
          message: 'The economy plummets. Faith in your leadership wavers.',
        },
      },
    ],
  },
  {
    id: 'epidemic',
    title: 'The Crimson Fever',
    description: 'A new viral strain is spreading in the northern provinces. Hospitals are overwhelmed.',
    image: 'https://picsum.photos/seed/virus/800/400',
    choices: [
      {
        text: 'Total Lockdown: Stop all movement immediately.',
        consequences: {
          stats: { health: 25, economy: -20, stability: -10 },
          treasury: -100000000,
          message: 'The virus is contained, but the economy takes a massive hit.',
        },
      },
      {
        text: 'Vaccine Drive: Invest heavily in research and distribution.',
        consequences: {
          stats: { health: 15, approval: 10 },
          treasury: -400000000,
          message: 'A slow but steady recovery. The public appreciates the effort.',
        },
      },
      {
        text: 'Herd Immunity: Keep businesses open and advise caution.',
        consequences: {
          stats: { health: -30, economy: 5, approval: -20 },
          treasury: 0,
          message: 'The death toll rises. You are blamed for the tragedy.',
        },
      },
    ],
  },
  {
    id: 'border-tension',
    title: 'Drums of War',
    description: 'Our neighbor has moved heavy artillery to the disputed border region.',
    image: 'https://picsum.photos/seed/border/800/400',
    choices: [
      {
        text: 'Mobilize Troops: Show strength at the border.',
        consequences: {
          stats: { military: 15, stability: -5, approval: 5 },
          treasury: -150000000,
          message: 'A tense standoff. The military feels supported.',
        },
      },
      {
        text: 'Diplomatic Summit: Call for immediate peace talks.',
        consequences: {
          stats: { stability: 15, military: -10, approval: 5 },
          treasury: -20000000,
          message: 'War is averted, but the generals think you are weak.',
        },
      },
      {
        text: 'Pre-emptive Strike: Neutralize the threat before they act.',
        consequences: {
          stats: { military: 20, stability: -30, approval: -10, economy: -10 },
          treasury: -500000000,
          message: 'Full-scale conflict begins. The world condemns your aggression.',
        },
      },
    ],
  },
  {
    id: 'protests',
    title: 'Social Unrest',
    description: 'A controversial new law has sparked massive protests in the capital. The opposition is calling for your resignation.',
    image: 'https://picsum.photos/seed/protest/800/400',
    choices: [
      {
        text: 'Police Crackdown: Restore order by any means.',
        consequences: {
          stats: { stability: 20, approval: -30, health: -10 },
          treasury: -50000000,
          message: 'The streets are clear, but the blood is on your hands.',
        },
      },
      {
        text: 'Dialogue: Meet with protest leaders to negotiate.',
        consequences: {
          stats: { approval: 15, stability: -10 },
          treasury: 0,
          message: 'Tensions ease, but you look indecisive to your supporters.',
        },
      },
      {
        text: 'Repeal Law: Give in to all demands.',
        consequences: {
          stats: { approval: 25, stability: -20, economy: -5 },
          treasury: -100000000,
          message: 'The people cheer, but your authority is severely weakened.',
        },
      },
    ],
  },
  {
    id: 'corruption',
    title: 'The Minister Scandal',
    description: 'Your Finance Minister is accused of embezzling millions. The press is having a field day.',
    image: 'https://picsum.photos/seed/scandal/800/400',
    choices: [
      {
        text: 'Fire Immediately: Show zero tolerance for corruption.',
        consequences: {
          stats: { approval: 15, stability: -5, economy: -5 },
          treasury: 0,
          message: 'You look strong, but the cabinet is in disarray.',
        },
      },
      {
        text: 'Internal Investigation: Wait for the facts.',
        consequences: {
          stats: { approval: -10, stability: 5 },
          treasury: 0,
          message: 'The public thinks you are covering it up.',
        },
      },
      {
        text: 'Defend Minister: Claim it is an opposition witch hunt.',
        consequences: {
          stats: { approval: -25, stability: 10 },
          treasury: 0,
          message: 'Loyalty is rewarded, but the public is outraged.',
        },
      },
    ],
  },
];

export const SPEECH_OPTIONS = {
  openings: ['My fellow citizens,', 'People of this great nation,', 'Today, we stand at a crossroads,'],
  middles: [
    'We must work together to overcome these challenges.',
    'Our strength lies in our unity and our shared vision.',
    'The path ahead is difficult, but we will prevail.',
  ],
  closings: ['God bless our country.', 'Forward ever, backward never.', 'Thank you, and good night.'],
};

