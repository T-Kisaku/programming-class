import { z } from "zod";

const tileSchema = z.object({
  x: z
    .number({ message: "grid.tiles[].x は数値で指定してください" })
    .int({ message: "grid.tiles[].x は整数で指定してください" })
    .nonnegative({ message: "grid.tiles[].x は0以上で指定してください" }),
  y: z
    .number({ message: "grid.tiles[].y は数値で指定してください" })
    .int({ message: "grid.tiles[].y は整数で指定してください" })
    .nonnegative({ message: "grid.tiles[].y は0以上で指定してください" }),
  type: z.enum(["floor", "wall"], {
    message: "grid.tiles[].type は floor か wall を指定してください",
  }),
  tileColor: z
    .string({ message: "grid.tiles[].tileColor は文字列で指定してください" })
    .min(1, { message: "grid.tiles[].tileColor は空文字にできません" }),
  coin: z.boolean({ message: "grid.tiles[].coin は真偽値で指定してください" }).optional(),
});

const functionSchema = z.object({
  maxSlots: z
    .number({ message: "program.functions.*.maxSlots は数値で指定してください" })
    .int({ message: "program.functions.*.maxSlots は整数で指定してください" })
    .positive({ message: "program.functions.*.maxSlots は1以上で指定してください" }),
});

const levelSchemaBase = z.object({
  id: z.string({ message: "id は文字列で指定してください" }).min(1, { message: "id は必須です" }),
  title: z
    .string({ message: "title は文字列で指定してください" })
    .min(1, { message: "title は必須です" }),
  grid: z.object({
    width: z
      .number({ message: "grid.width は数値で指定してください" })
      .int({ message: "grid.width は整数で指定してください" })
      .positive({ message: "grid.width は1以上で指定してください" }),
    height: z
      .number({ message: "grid.height は数値で指定してください" })
      .int({ message: "grid.height は整数で指定してください" })
      .positive({ message: "grid.height は1以上で指定してください" }),
    tiles: z
      .array(tileSchema, {
        message: "grid.tiles はタイル配列で指定してください",
      })
      .min(1, { message: "grid.tiles は1件以上必要です" }),
  }),
  start: z.object({
    x: z
      .number({ message: "start.x は数値で指定してください" })
      .int({ message: "start.x は整数で指定してください" })
      .nonnegative({ message: "start.x は0以上で指定してください" }),
    y: z
      .number({ message: "start.y は数値で指定してください" })
      .int({ message: "start.y は整数で指定してください" })
      .nonnegative({ message: "start.y は0以上で指定してください" }),
    dir: z.enum(["N", "E", "S", "W"], {
      message: "start.dir は N/E/S/W のいずれかを指定してください",
    }),
  }),
  rules: z.object({
    onOutOfBounds: z.enum(["reset"], {
      message: "rules.onOutOfBounds は reset を指定してください",
    }),
    onWallCollision: z.enum(["stay", "reset"], {
      message: "rules.onWallCollision は stay か reset を指定してください",
    }),
  }),
  program: z.object({
    entry: z
      .string({ message: "program.entry は文字列で指定してください" })
      .min(1, { message: "program.entry は必須です" }),
    functions: z.record(functionSchema, {
      message: "program.functions は関数定義の連想配列で指定してください",
    }),
  }),
  capabilities: z.object({
    availableCommands: z
      .array(z.enum(["MOVE_FORWARD", "TURN_LEFT", "TURN_RIGHT", "CALL"]), {
        message: "capabilities.availableCommands は命令配列で指定してください",
      })
      .min(1, { message: "capabilities.availableCommands は1件以上必要です" }),
    callTargets: z
      .array(z.string({ message: "capabilities.callTargets は文字列配列で指定してください" }), {
        message: "capabilities.callTargets は文字列配列で指定してください",
      })
      .min(1, { message: "capabilities.callTargets は1件以上必要です" }),
    availableColors: z
      .array(z.string({ message: "capabilities.availableColors は文字列配列で指定してください" }), {
        message: "capabilities.availableColors は文字列配列で指定してください",
      })
      .min(1, { message: "capabilities.availableColors は1件以上必要です" }),
    colorRule: z.enum(["matchTileColor", "allowAllOnNone"], {
      message: "capabilities.colorRule は matchTileColor か allowAllOnNone を指定してください",
    }),
  }),
  strings: z.object({
    success: z
      .string({ message: "strings.success は文字列で指定してください" })
      .min(1, { message: "strings.success は必須です" }),
    failExecuted: z
      .string({ message: "strings.failExecuted は文字列で指定してください" })
      .min(1, { message: "strings.failExecuted は必須です" }),
  }),
});

export const levelSchema = levelSchemaBase.superRefine((level, ctx) => {
  const functionIds = Object.keys(level.program.functions);

  if (functionIds.length === 0) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["program", "functions"],
      message: "program.functions は1つ以上の関数を定義してください",
    });
  }

  if (!functionIds.includes(level.program.entry)) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["program", "entry"],
      message: "program.entry は program.functions に存在する関数名を指定してください",
    });
  }

  const callTargets = new Set(level.capabilities.callTargets);
  for (const target of callTargets) {
    if (!functionIds.includes(target)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["capabilities", "callTargets"],
        message: `capabilities.callTargets の ${target} は program.functions に存在しません`,
      });
    }
  }

  const availableColors = new Set(level.capabilities.availableColors);
  if (!availableColors.has("none")) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["capabilities", "availableColors"],
      message: "capabilities.availableColors には none を含めてください",
    });
  }

  const seenTiles = new Set<string>();
  level.grid.tiles.forEach((tile, index) => {
    const key = `${tile.x},${tile.y}`;
    if (seenTiles.has(key)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["grid", "tiles", index],
        message: "grid.tiles に同じ座標のタイルが重複しています",
      });
    } else {
      seenTiles.add(key);
    }

    if (tile.x >= level.grid.width || tile.y >= level.grid.height) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["grid", "tiles", index],
        message: "grid.tiles の座標がグリッド範囲外です",
      });
    }

    if (!availableColors.has(tile.tileColor)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["grid", "tiles", index, "tileColor"],
        message: "grid.tiles[].tileColor は capabilities.availableColors の範囲で指定してください",
      });
    }
  });
});

export type LevelDefinition = z.infer<typeof levelSchema>;

export const parseLevelDefinition = (data: unknown) => levelSchema.parse(data);
