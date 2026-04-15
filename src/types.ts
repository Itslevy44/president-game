/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export type Difficulty = 'Easy' | 'Statesman' | 'Iron Fist';

export interface Stats {
  economy: number;
  stability: number;
  approval: number;
  military: number;
  health: number;
}

export interface Character {
  id: string;
  name: string;
  role: string;
  brief: string;
  image: string;
  bonus?: Partial<Stats>;
  malus?: Partial<Stats>;
}

export interface ScenarioChoice {
  text: string;
  consequences: {
    stats: Partial<Stats>;
    treasury: number;
    message: string;
  };
}

export interface Scenario {
  id: string;
  title: string;
  description: string;
  image: string;
  choices: ScenarioChoice[];
}

export interface PressQuestion {
  id: string;
  journalist: string;
  outlet: string;
  question: string;
  options: {
    text: string;
    consequences: {
      stats: Partial<Stats>;
      message: string;
    };
  }[];
}

export interface DiplomacyVisit {
  id: string;
  country: string;
  leader: string;
  image: string;
  objectives: {
    id: string;
    title: string;
    description: string;
    consequences: {
      stats: Partial<Stats>;
      treasury: number;
      message: string;
    };
  }[];
}

export interface GameState {
  playerName: string;
  countryName: string;
  difficulty: Difficulty;
  year: number;
  quarter: number;
  stats: Stats;
  treasury: number;
  deputy: Character | null;
  ministers: {
    finance: Character | null;
    defense: Character | null;
    health: Character | null;
    infrastructure: Character | null;
    foreign: Character | null;
    interior: Character | null;
  };
  history: string[];
  isGameOver: boolean;
  gamePhase: 'setup' | 'deputy_selection' | 'minister_selection' | 'playing' | 'ended' | 'press_conference' | 'diplomacy_visit';
  currentScenario: Scenario | null;
  currentPressQuestion: PressQuestion | null;
  currentDiplomacyVisit: DiplomacyVisit | null;
  logs: string[];
}
