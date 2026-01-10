import { writable } from "svelte/store";
import type { LevelDefinition } from "../levels/levelSchema";
import {
  createEmptyProgram,
  createLevelRuntime,
  createIdleRuntimeState,
  startRuntimeState,
  stepRuntimeState,
  stopRuntimeState,
} from "../game/gameLogic";
import type { Command, Program, RuntimeState } from "../game/types";

export type GameState = {
  level: LevelDefinition;
  program: Program;
  runtime: RuntimeState;
};

export const createGameStateStore = (level: LevelDefinition) => {
  const levelRuntime = createLevelRuntime(level);
  const initialProgram = createEmptyProgram(level);
  const initialRuntime = createIdleRuntimeState(level);
  const { subscribe, update, set } = writable<GameState>({
    level,
    program: initialProgram,
    runtime: initialRuntime,
  });

  return {
    subscribe,
    resetAll: () =>
      set({
        level,
        program: createEmptyProgram(level),
        runtime: createIdleRuntimeState(level),
      }),
    resetRuntime: () =>
      update((state) => ({
        ...state,
        runtime: createIdleRuntimeState(state.level),
      })),
    stop: () =>
      update((state) => ({
        ...state,
        runtime: stopRuntimeState(state.level),
      })),
    start: () =>
      update((state) => ({
        ...state,
        runtime: startRuntimeState(state.level),
      })),
    step: () =>
      update((state) => ({
        ...state,
        runtime: stepRuntimeState(state.level, levelRuntime, state.program, state.runtime),
      })),
    setProgram: (program: Program) =>
      update((state) => ({
        ...state,
        program,
      })),
    setCommand: (functionId: string, slotIndex: number, command: Command | null) =>
      update((state) => {
        const nextProgram: Program = {
          ...state.program,
          [functionId]: [...(state.program[functionId] ?? [])],
        };

        const slots = nextProgram[functionId];
        if (slots && slotIndex >= 0 && slotIndex < slots.length) {
          slots[slotIndex] = command;
        }

        return {
          ...state,
          program: nextProgram,
        };
      }),
  };
};
