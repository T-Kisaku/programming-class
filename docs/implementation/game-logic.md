# ゲームロジックの純粋関数化

## 目的

レベル JSON を Zod でパースした後の `LevelDefinition` を入力に、
ゲームの実行状態を **純粋関数**で更新できるようにする。
UI は Svelte の store で状態を保持し、ロジックと UI を分離する。

## 主要な構成

### 1. 型定義 (`src/lib/game/types.ts`)

- 命令や方向、実行状態 (`RuntimeState`) を明示的な型として定義する。
- `Program` は「関数ID -> 命令スロット配列」の形に統一する。

### 2. ロジック関数 (`src/lib/game/gameLogic.ts`)

- `createLevelRuntime(level)`
  - タイル参照用の `Map` とコイン座標の `Set` を生成。
- `createEmptyProgram(level)`
  - レベル定義の `maxSlots` に合わせて空の命令スロットを作成。
- `createIdleRuntimeState(level)` / `startRuntimeState(level)` / `stopRuntimeState(level)`
  - 実行状態の初期化・開始・停止を行う。
- `stepRuntimeState(level, levelRuntime, program, runtime)`
  - **1ステップだけ**命令を評価し、次の状態を返す。
  - 命令色とタイル色の一致、壁/範囲外判定、コイン取得、関数呼び出しを処理。
  - 実行が終わったら `success` / `failed` を判定して終了状態に遷移。

### 3. Svelte store (`src/lib/state/gameState.ts`)

- `createGameStateStore(level)`
  - `program` と `runtime` をまとめて管理する store を生成。
  - UI は `setCommand` / `start` / `step` / `stop` などの関数だけを呼び出す。
  - `runtime` の更新はロジック関数に限定し、UI 側で直接書き換えない。

## 設計方針

- **純粋性の担保**
  - ロジック関数は必ず入力から新しい状態を返す。
  - `RuntimeState` を直接ミューテーションしない。
- **UI との分離**
  - UI で更新する状態は store の `state` で管理する。
  - ゲーム状態は store 経由で更新し、UI 側にルールを持たせない。
