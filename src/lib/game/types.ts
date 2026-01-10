import type { LevelDefinition } from "../levels/levelSchema";

export type CommandType = "MOVE_FORWARD" | "TURN_LEFT" | "TURN_RIGHT" | "CALL";
export type Direction = "N" | "E" | "S" | "W";

export type LevelTile = LevelDefinition["grid"]["tiles"][number];

export type Command = {
  type: CommandType;
  color: string;
  target?: string;
};

export type Program = Record<string, Array<Command | null>>;

export type ExecutionFrame = {
  functionId: string;
  instructionIndex: number;
};

export type RuntimeStatus = "idle" | "running" | "success" | "failed";

export type RuntimeEvent =
  | "started"
  | "stopped"
  | "skipped"
  | "moved"
  | "turned"
  | "called"
  | "return"
  | "coin"
  | "blocked"
  | "reset"
  | "success"
  | "failed";

export type RuntimeState = {
  position: {
    x: number;
    y: number;
    dir: Direction;
  };
  collectedCoins: string[];
  stack: ExecutionFrame[];
  steps: number;
  status: RuntimeStatus;
  lastEvent: RuntimeEvent | null;
};

export type LevelRuntime = {
  tileLookup: Map<string, LevelTile>;
  coinPositions: Set<string>;
};
