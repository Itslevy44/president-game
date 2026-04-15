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
  };
  history: string[];
  isGameOver: boolean;
  gamePhase: 'setup' | 'deputy_selection' | 'minister_selection' | 'playing' | 'ended';
  currentScenario: Scenario | null;
  logs: string[];
}
