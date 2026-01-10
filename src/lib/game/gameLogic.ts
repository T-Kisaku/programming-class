import type { LevelDefinition } from "../levels/levelSchema";
import type {
  Command,
  Direction,
  ExecutionFrame,
  LevelRuntime,
  LevelTile,
  Program,
  RuntimeEvent,
  RuntimeState,
  RuntimeStatus,
} from "./types";

const coordKey = (x: number, y: number) => `${x},${y}`;

export const createLevelRuntime = (level: LevelDefinition): LevelRuntime => {
  const tileLookup = new Map<string, LevelTile>();
  const coinPositions = new Set<string>();

  for (const tile of level.grid.tiles) {
    const key = coordKey(tile.x, tile.y);
    tileLookup.set(key, tile);
    if (tile.coin) {
      coinPositions.add(key);
    }
  }

  return { tileLookup, coinPositions };
};

export const createEmptyProgram = (level: LevelDefinition): Program => {
  const program: Program = {};

  for (const [functionId, definition] of Object.entries(level.program.functions)) {
    program[functionId] = Array.from({ length: definition.maxSlots }, () => null);
  }

  return program;
};

export const createIdleRuntimeState = (level: LevelDefinition): RuntimeState => ({
  position: {
    x: level.start.x,
    y: level.start.y,
    dir: level.start.dir,
  },
  collectedCoins: [],
  stack: [],
  steps: 0,
  status: "idle",
  lastEvent: null,
});

export const startRuntimeState = (level: LevelDefinition): RuntimeState => ({
  position: {
    x: level.start.x,
    y: level.start.y,
    dir: level.start.dir,
  },
  collectedCoins: [],
  stack: [{ functionId: level.program.entry, instructionIndex: 0 }],
  steps: 0,
  status: "running",
  lastEvent: "started",
});

export const stopRuntimeState = (level: LevelDefinition): RuntimeState => ({
  position: {
    x: level.start.x,
    y: level.start.y,
    dir: level.start.dir,
  },
  collectedCoins: [],
  stack: [],
  steps: 0,
  status: "idle",
  lastEvent: "stopped",
});

const resetRuntime = (level: LevelDefinition, status: RuntimeStatus): RuntimeState => ({
  position: {
    x: level.start.x,
    y: level.start.y,
    dir: level.start.dir,
  },
  collectedCoins: [],
  stack: status === "running" ? [{ functionId: level.program.entry, instructionIndex: 0 }] : [],
  steps: 0,
  status,
  lastEvent: "reset",
});

const rotateLeft = (dir: Direction): Direction => {
  switch (dir) {
    case "N":
      return "W";
    case "W":
      return "S";
    case "S":
      return "E";
    case "E":
      return "N";
  }
};

const rotateRight = (dir: Direction): Direction => {
  switch (dir) {
    case "N":
      return "E";
    case "E":
      return "S";
    case "S":
      return "W";
    case "W":
      return "N";
  }
};

const forwardDelta = (dir: Direction) => {
  switch (dir) {
    case "N":
      return { dx: 0, dy: -1 };
    case "E":
      return { dx: 1, dy: 0 };
    case "S":
      return { dx: 0, dy: 1 };
    case "W":
      return { dx: -1, dy: 0 };
  }
};

const shouldExecute = (command: Command, tileColor: string, level: LevelDefinition) => {
  if (command.color === "none") {
    return true;
  }

  if (tileColor === "none") {
    return level.capabilities.colorRule === "allowAllOnNone";
  }

  return command.color === tileColor;
};

const evaluateCompletion = (
  runtime: RuntimeState,
  levelRuntime: LevelRuntime
): { status: RuntimeStatus; event: RuntimeEvent } => {
  const collected = new Set(runtime.collectedCoins);
  const isSuccess = levelRuntime.coinPositions.size === collected.size;
  return {
    status: isSuccess ? "success" : "failed",
    event: isSuccess ? "success" : "failed",
  };
};

const advanceFrame = (frame: ExecutionFrame) => ({
  ...frame,
  instructionIndex: frame.instructionIndex + 1,
});

export const stepRuntimeState = (
  level: LevelDefinition,
  levelRuntime: LevelRuntime,
  program: Program,
  runtime: RuntimeState
): RuntimeState => {
  if (runtime.status !== "running") {
    return runtime;
  }

  if (runtime.stack.length === 0) {
    const completion = evaluateCompletion(runtime, levelRuntime);
    return { ...runtime, status: completion.status, lastEvent: completion.event };
  }

  const stack = [...runtime.stack];
  const activeFrame = stack[stack.length - 1];
  const functionCommands = program[activeFrame.functionId] ?? [];

  if (activeFrame.instructionIndex >= functionCommands.length) {
    stack.pop();
    const nextStack = stack;

    if (nextStack.length === 0) {
      const completion = evaluateCompletion(runtime, levelRuntime);
      return {
        ...runtime,
        stack: nextStack,
        status: completion.status,
        steps: runtime.steps + 1,
        lastEvent: completion.event,
      };
    }

    return {
      ...runtime,
      stack: nextStack,
      steps: runtime.steps + 1,
      lastEvent: "return",
    };
  }

  const command = functionCommands[activeFrame.instructionIndex];
  const currentTile = levelRuntime.tileLookup.get(
    coordKey(runtime.position.x, runtime.position.y)
  );
  const tileColor = currentTile?.tileColor ?? "none";

  if (!command) {
    const nextStack = stack.map((frame, index) =>
      index === stack.length - 1 ? advanceFrame(frame) : frame
    );

    return {
      ...runtime,
      stack: nextStack,
      steps: runtime.steps + 1,
      lastEvent: "skipped",
    };
  }

  if (!shouldExecute(command, tileColor, level)) {
    const nextStack = stack.map((frame, index) =>
      index === stack.length - 1 ? advanceFrame(frame) : frame
    );

    return {
      ...runtime,
      stack: nextStack,
      steps: runtime.steps + 1,
      lastEvent: "skipped",
    };
  }

  switch (command.type) {
    case "TURN_LEFT": {
      const nextStack = stack.map((frame, index) =>
        index === stack.length - 1 ? advanceFrame(frame) : frame
      );
      return {
        ...runtime,
        position: { ...runtime.position, dir: rotateLeft(runtime.position.dir) },
        stack: nextStack,
        steps: runtime.steps + 1,
        lastEvent: "turned",
      };
    }
    case "TURN_RIGHT": {
      const nextStack = stack.map((frame, index) =>
        index === stack.length - 1 ? advanceFrame(frame) : frame
      );
      return {
        ...runtime,
        position: { ...runtime.position, dir: rotateRight(runtime.position.dir) },
        stack: nextStack,
        steps: runtime.steps + 1,
        lastEvent: "turned",
      };
    }
    case "CALL": {
      if (!command.target) {
        const nextStack = stack.map((frame, index) =>
          index === stack.length - 1 ? advanceFrame(frame) : frame
        );
        return {
          ...runtime,
          stack: nextStack,
          steps: runtime.steps + 1,
          lastEvent: "skipped",
        };
      }

      const updatedStack = stack.map((frame, index) =>
        index === stack.length - 1 ? advanceFrame(frame) : frame
      );

      updatedStack.push({ functionId: command.target, instructionIndex: 0 });

      return {
        ...runtime,
        stack: updatedStack,
        steps: runtime.steps + 1,
        lastEvent: "called",
      };
    }
    case "MOVE_FORWARD": {
      const { dx, dy } = forwardDelta(runtime.position.dir);
      const nextX = runtime.position.x + dx;
      const nextY = runtime.position.y + dy;

      if (nextX < 0 || nextY < 0 || nextX >= level.grid.width || nextY >= level.grid.height) {
        return resetRuntime(level, runtime.status);
      }

      const nextTile = levelRuntime.tileLookup.get(coordKey(nextX, nextY));
      if (!nextTile || nextTile.type === "wall") {
        if (level.rules.onWallCollision === "reset") {
          return resetRuntime(level, runtime.status);
        }

        const nextStack = stack.map((frame, index) =>
          index === stack.length - 1 ? advanceFrame(frame) : frame
        );

        return {
          ...runtime,
          stack: nextStack,
          steps: runtime.steps + 1,
          lastEvent: "blocked",
        };
      }

      const nextKey = coordKey(nextX, nextY);
      const collected = new Set(runtime.collectedCoins);
      let event: RuntimeEvent = "moved";

      if (nextTile.coin && !collected.has(nextKey)) {
        collected.add(nextKey);
        event = "coin";
      }

      const nextStack = stack.map((frame, index) =>
        index === stack.length - 1 ? advanceFrame(frame) : frame
      );

      return {
        ...runtime,
        position: { x: nextX, y: nextY, dir: runtime.position.dir },
        collectedCoins: Array.from(collected),
        stack: nextStack,
        steps: runtime.steps + 1,
        lastEvent: event,
      };
    }
  }
};
