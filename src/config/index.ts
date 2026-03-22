export { GameConf } from "./GameConf";
export { ColorConf, FontConf, UIConf } from "./UIConf";
export { DIFFICULTY_LEVELS, DEFAULT_DIFFICULTY } from "./DifficultyConf";

import { DIFFICULTY_LEVELS, DEFAULT_DIFFICULTY } from "./DifficultyConf";

export type DifficultyKey = keyof typeof DIFFICULTY_LEVELS;

let currentDifficultyKey: DifficultyKey = DEFAULT_DIFFICULTY;

export function getDifficulty() {
  return DIFFICULTY_LEVELS[currentDifficultyKey] ?? DIFFICULTY_LEVELS[DEFAULT_DIFFICULTY];
}

export function setDifficulty(key: DifficultyKey) {
  if (DIFFICULTY_LEVELS[key]) currentDifficultyKey = key;
}

export function getDifficultyKey(): DifficultyKey {
  return currentDifficultyKey;
}

