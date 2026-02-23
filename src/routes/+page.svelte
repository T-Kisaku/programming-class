<script lang="ts">
  import { onDestroy } from "svelte";
  import { get } from "svelte/store";
  import type { LevelDefinition } from "$lib/levels/levelSchema";
  import { createGameStateStore } from "$lib/state/gameState";

  const level: LevelDefinition = {
    id: "demo-level",
    title: "Demo Level",
    grid: {
      width: 5,
      height: 5,
      tiles: Array.from({ length: 5 }, (_, y) =>
        Array.from({ length: 5 }, (_, x) => {
          const isBorder = x === 0 || y === 0 || x === 4 || y === 4;
          return {
            x,
            y,
            type: isBorder ? "wall" : "floor",
            tileColor: isBorder ? "none" : (x + y) % 2 === 0 ? "#cce7ff" : "#dff7d2",
            coin: !isBorder && ((x === 2 && y === 1) || (x === 3 && y === 2) || (x === 2 && y === 3)),
          };
        })
      ).flat(),
    },
    start: { x: 1, y: 1, dir: "E" },
    rules: {
      onOutOfBounds: "reset",
      onWallCollision: "reset",
    },
    program: {
      entry: "main",
      functions: {
        main: { maxSlots: 5 },
        helper: { maxSlots: 4 },
      },
    },
    capabilities: {
      availableCommands: ["MOVE_FORWARD", "TURN_LEFT", "TURN_RIGHT", "CALL"],
      callTargets: ["main", "helper"],
      availableColors: ["none", "#cce7ff", "#dff7d2"],
      colorRule: "allowAllOnNone",
    },
    strings: {
      success: "全てのコインを集めました！",
      failExecuted: "プログラムを実行し終えました。",
      courseOut: "コースアウトしました",
    },
  };

  const gameState = createGameStateStore(level);

  const coordKey = (x: number, y: number) => `${x},${y}`;
  const tileLookup = new Map(level.grid.tiles.map((tile) => [coordKey(tile.x, tile.y), tile]));
  const gridRows = Array.from({ length: level.grid.height }, (_, index) => index);
  const gridCols = Array.from({ length: level.grid.width }, (_, index) => index);

  // プログラム編集用のコマンド定義
  const availableCommands = [
    { type: "MOVE_FORWARD", label: "直進", icon: "↑" },
    { type: "TURN_RIGHT", label: "右90°", icon: "↻" },
    { type: "TURN_LEFT", label: "左90°", icon: "↺" },
    { type: "CALL", label: "呼出", icon: "◆" },
  ] as const;

  // 選択中のコマンドとターゲット関数
  type SelectedCommand = {
    type: (typeof availableCommands)[number]["type"];
    target?: string;
  };

  let selectedCommand: SelectedCommand | null = null;

  const selectCommand = (type: (typeof availableCommands)[number]["type"]) => {
    if (selectedCommand?.type === type) {
      selectedCommand = null;
    } else {
      selectedCommand = { type };
    }
  };

  const selectCallTarget = (target: string) => {
    if (selectedCommand?.type === "CALL") {
      selectedCommand.target = target;
    }
  };

  const setSlotCommand = (functionId: string, slotIndex: number) => {
    if (selectedCommand) {
      gameState.setCommand(functionId, slotIndex, {
        type: selectedCommand.type,
        color: "none",
        target: selectedCommand.type === "CALL" ? selectedCommand.target : undefined,
      });
    } else {
      gameState.setCommand(functionId, slotIndex, null);
    }
  };

  const getCommandLabel = (command: { type: string; target?: string } | null) => {
    if (!command) return "";
    if (command.type === "CALL") {
      return `◆${command.target}`;
    }
    const cmd = availableCommands.find((c) => c.type === command.type);
    return cmd ? cmd.icon : "";
  };

  // 利用可能なターゲット関数（自分以外の関数）
  const getAvailableTargets = (functionId: string) => {
    return level.capabilities.callTargets.filter((target) => target !== functionId);
  };

  const clearProgram = () => {
    gameState.resetAll();
  };

  // ステータスメッセージを取得
  const getStatusMessage = (status: string, lastEvent: string | null) => {
    if (lastEvent === "courseOut") return level.strings.courseOut;
    if (status === "success") return level.strings.success;
    if (status === "failed") return level.strings.failExecuted;
    if (status === "idle") return "待機中";
    return "";
  };

  let autoRun = false;
  let timer: ReturnType<typeof setInterval> | null = null;

  const pauseAuto = () => {
    autoRun = false;
    if (timer) {
      clearInterval(timer);
      timer = null;
    }
  };

  const stepOnce = () => {
    const state = get(gameState);
    if (state.runtime.status !== "running") {
      gameState.start();
    }
    gameState.step();
  };

  const startAuto = () => {
    if (autoRun) {
      return;
    }
    autoRun = true;
    if (get(gameState).runtime.status !== "running") {
      gameState.start();
    }
    timer = setInterval(() => {
      gameState.step();
    }, 350);
  };

  const stopRuntime = () => {
    pauseAuto();
    gameState.stop();
  };

  const resetRuntime = () => {
    pauseAuto();
    gameState.resetRuntime();
  };

  $: if (
    autoRun &&
    ($gameState.runtime.status === "success" || $gameState.runtime.status === "failed")
  ) {
    pauseAuto();
  }

  onDestroy(() => {
    pauseAuto();
  });
</script>

<main class="page">
  <header class="header">
    <div>
      <h1>{level.title}</h1>
      <p>コマンドを選択してスロットをクリックし、プログラムを作成してください。</p>
    </div>
    <div class="controls">
      <button type="button" on:click={stepOnce}>1ステップ進める</button>
      <button type="button" on:click={startAuto} disabled={autoRun}>自動再生</button>
      <button type="button" on:click={pauseAuto} disabled={!autoRun}>一時停止</button>
      <button type="button" on:click={stopRuntime}>停止</button>
      <button type="button" on:click={resetRuntime}>リセット</button>
      <button type="button" on:click={clearProgram}>クリア</button>
    </div>
  </header>

  <section class="layout">
    <div class="board">
      <div class="grid" style={`--cols: ${level.grid.width}`}>
        {#each gridRows as y}
          {#each gridCols as x}
            {@const tile = tileLookup.get(coordKey(x, y))}
            {@const isWall = tile?.type === "wall"}
            {@const isPlayer = $gameState.runtime.position.x === x && $gameState.runtime.position.y === y}
            {@const hasCoin =
              tile?.coin && !$gameState.runtime.collectedCoins.includes(coordKey(x, y))}
            {@const tileBackground = isWall
              ? ""
              : tile?.tileColor === "none"
                ? "#fefcf7"
                : tile?.tileColor ?? "#fefcf7"}
            <div
              class={`tile ${isWall ? "wall" : "floor"}`}
              style={tileBackground ? `background-color: ${tileBackground}` : ""}
            >
              {#if hasCoin}
                <span class="coin" aria-label="coin">●</span>
              {/if}
              {#if isPlayer}
                <span class="player" data-dir={$gameState.runtime.position.dir} aria-label="player">
                  ▶
                </span>
              {/if}
            </div>
          {/each}
        {/each}
      </div>
    </div>

    <div class="panel">
      <section class="status">
        <h2>ステータス</h2>
        {#if getStatusMessage($gameState.runtime.status, $gameState.runtime.lastEvent)}
          <div class="status-message {$gameState.runtime.status} {$gameState.runtime.lastEvent === "courseOut" ? "courseOut" : ""}">
            {getStatusMessage($gameState.runtime.status, $gameState.runtime.lastEvent)}
          </div>
        {/if}
        <dl>
          <div>
            <dt>状態</dt>
            <dd>{$gameState.runtime.status}</dd>
          </div>
          <div>
            <dt>イベント</dt>
            <dd>{$gameState.runtime.lastEvent ?? "-"}</dd>
          </div>
          <div>
            <dt>歩数</dt>
            <dd>{$gameState.runtime.steps}</dd>
          </div>
          <div>
            <dt>取得コイン</dt>
            <dd>{$gameState.runtime.collectedCoins.length} / 3</dd>
          </div>
          <div>
            <dt>スタック</dt>
            <dd>
              {#if $gameState.runtime.stack.length === 0}
                -
              {:else}
                <ul>
                  {#each $gameState.runtime.stack as frame}
                    <li>{frame.functionId} #{frame.instructionIndex + 1}</li>
                  {/each}
                </ul>
              {/if}
            </dd>
          </div>
        </dl>
      </section>

      <section class="program">
        <h2>プログラム</h2>

        <!-- コマンドパレット -->
        <div class="command-palette">
          {#each availableCommands as cmd}
            {@const isSelected = selectedCommand?.type === cmd.type}
            <button
              type="button"
              class={`command-btn ${isSelected ? "selected" : ""}`}
              on:click={() => selectCommand(cmd.type)}
              aria-label={cmd.label}
              aria-pressed={isSelected}
            >
              <span class="command-icon">{cmd.icon}</span>
              <span class="command-label">{cmd.label}</span>
            </button>
          {/each}
        </div>

        <!-- ターゲット関数選択パレット（CALL選択時のみ表示） -->
        {#if selectedCommand?.type === "CALL"}
          <div class="target-palette">
            <h4>呼び出す関数を選択</h4>
            <div class="target-buttons">
              {#each level.capabilities.callTargets as target}
                {@const isTargetSelected = selectedCommand.target === target}
                <button
                  type="button"
                  class={`target-btn ${isTargetSelected ? "selected" : ""}`}
                  on:click={() => selectCallTarget(target)}
                  aria-label={`関数 ${target}を呼び出す`}
                  aria-pressed={isTargetSelected}
                >
                  {target}()
                </button>
              {/each}
            </div>
          </div>
        {/if}

        <!-- 関数パレット -->
        {#each Object.entries(level.program.functions) as [functionId, definition]}
          <div class="function-palette">
            <div class="function-header">
              <h3>function {functionId}</h3>
              <span class="max-slots">{definition.maxSlots} スロット</span>
            </div>
            <div class="slots">
              {#each Array(definition.maxSlots) as _, i}
                {@const command = $gameState.program[functionId]?.[i]}
                {@const isHighlighted =
                  $gameState.runtime.stack.length > 0 &&
                  $gameState.runtime.stack[$gameState.runtime.stack.length - 1].functionId ===
                    functionId &&
                  $gameState.runtime.stack[$gameState.runtime.stack.length - 1].instructionIndex === i}
                <button
                  type="button"
                  class={`slot ${command ? "filled" : "empty"} ${isHighlighted ? "active" : ""}`}
                  on:click={() => setSlotCommand(functionId, i)}
                  aria-label={`スロット ${i + 1}`}
                >
                  {#if command}
                    <span class="slot-icon">{getCommandLabel(command)}</span>
                  {:else}
                    <span class="slot-placeholder">{i + 1}</span>
                  {/if}
                </button>
              {/each}
            </div>
          </div>
        {/each}
      </section>
    </div>
  </section>
</main>

<style>
  :global(body) {
    background: #f7f6f3;
    color: #1b1b1b;
  }

  .page {
    display: flex;
    flex-direction: column;
    gap: 1.5rem;
    padding: 2rem;
    font-family: "Segoe UI", system-ui, sans-serif;
  }

  .header {
    display: flex;
    flex-direction: column;
    gap: 1rem;
  }

  .header h1 {
    margin: 0 0 0.25rem;
    font-size: 1.8rem;
  }

  .controls {
    display: flex;
    flex-wrap: wrap;
    gap: 0.5rem;
  }

  button {
    border: none;
    border-radius: 999px;
    padding: 0.5rem 1rem;
    background: #1f6feb;
    color: #fff;
    cursor: pointer;
    font-weight: 600;
  }

  button[disabled] {
    background: #9aa4b2;
    cursor: not-allowed;
  }

  .layout {
    display: grid;
    grid-template-columns: minmax(260px, 360px) minmax(280px, 1fr);
    gap: 2rem;
    align-items: start;
  }

  .board {
    background: #ffffff;
    padding: 1.5rem;
    border-radius: 16px;
    box-shadow: 0 8px 30px rgba(15, 23, 42, 0.08);
  }

  .grid {
    display: grid;
    grid-template-columns: repeat(var(--cols), 56px);
    gap: 6px;
    justify-content: center;
  }

  .tile {
    position: relative;
    width: 56px;
    height: 56px;
    border-radius: 10px;
    display: flex;
    align-items: center;
    justify-content: center;
    border: 2px solid rgba(15, 23, 42, 0.08);
    background-color: #fefcf7;
  }

  .tile.wall {
    background-color: #3f3f46;
    border-color: #27272a;
  }

  .coin {
    font-size: 1.1rem;
    color: #f59e0b;
  }

  .player {
    position: absolute;
    bottom: 6px;
    right: 6px;
    font-size: 1.4rem;
    color: #2563eb;
    text-shadow: 0 1px 3px rgba(15, 23, 42, 0.3);
  }

  .player[data-dir="N"] {
    transform: rotate(-90deg);
  }

  .player[data-dir="E"] {
    transform: rotate(0deg);
  }

  .player[data-dir="S"] {
    transform: rotate(90deg);
  }

  .player[data-dir="W"] {
    transform: rotate(180deg);
  }

  .panel {
    display: flex;
    flex-direction: column;
    gap: 1.5rem;
  }

  .status,
  .program {
    background: #ffffff;
    padding: 1.5rem;
    border-radius: 16px;
    box-shadow: 0 8px 30px rgba(15, 23, 42, 0.08);
  }

  .status dl {
    display: grid;
    gap: 0.75rem;
    margin: 1rem 0 0;
  }

  .status-message {
    padding: 0.75rem 1rem;
    border-radius: 8px;
    font-weight: 600;
    text-align: center;
    margin-bottom: 1rem;
  }

  .status-message.success {
    background: #dcfce7;
    color: #166534;
  }

  .status-message.failed {
    background: #fef3c7;
    color: #92400e;
  }

  .status-message.idle {
    background: #f1f5f9;
    color: #475569;
  }

  .status-message.courseOut {
    background: #fef2f2;
    color: #dc2626;
  }

  .status dt {
    font-weight: 600;
    color: #475569;
  }

  .status dd {
    margin: 0.2rem 0 0;
    font-size: 1.05rem;
  }

  .status ul {
    margin: 0.3rem 0 0;
    padding-left: 1.2rem;
  }

  .program-block {
    margin-top: 1rem;
  }

  .program-block h3 {
    margin: 0 0 0.5rem;
    font-size: 1rem;
  }

  .program ol {
    margin: 0;
    padding-left: 1.2rem;
    color: #1e293b;
  }

  .command {
    font-weight: 600;
  }

  .target {
    margin-left: 0.35rem;
    color: #0f766e;
  }

  .color {
    margin-left: 0.35rem;
    color: #64748b;
    font-size: 0.9rem;
  }

  @media (max-width: 900px) {
    .layout {
      grid-template-columns: 1fr;
    }
  }

  /* コマンドパレット */
  .command-palette {
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    gap: 0.5rem;
    margin-bottom: 1.5rem;
  }

  .command-btn {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 0.25rem;
    padding: 0.6rem 0.5rem;
    background: #f1f5f9;
    border: 2px solid #e2e8f0;
    border-radius: 8px;
    cursor: pointer;
    transition: all 0.2s;
    font-family: inherit;
    font-size: 0.85rem;
    color: #475569;
  }

  .command-btn:hover:not(:disabled) {
    background: #e2e8f0;
    border-color: #cbd5e1;
  }

  .command-btn.selected {
    background: #dbeafe;
    border-color: #3b82f6;
    color: #1d4ed8;
  }

  .command-btn[aria-pressed="true"] {
    background: #dbeafe;
    border-color: #3b82f6;
    color: #1d4ed8;
  }

  .command-icon {
    font-size: 1.5rem;
    line-height: 1;
  }

  .command-label {
    font-weight: 500;
  }

  /* 関数パレット */
  .function-palette {
    margin-top: 1rem;
  }

  .function-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 0.5rem;
  }

  .function-header h3 {
    margin: 0;
    font-size: 1rem;
  }

  .max-slots {
    font-size: 0.85rem;
    color: #64748b;
  }

  .slots {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(48px, 1fr));
    gap: 0.5rem;
  }

  .slot {
    width: 48px;
    height: 48px;
    border: 2px dashed #cbd5e1;
    border-radius: 8px;
    background: #f8fafc;
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    transition: all 0.2s;
    font-family: inherit;
    font-size: 1.2rem;
    color: #475569;
  }

  .slot:hover {
    border-color: #94a3b8;
    background: #f1f5f9;
  }

  .slot.filled {
    border-style: solid;
    border-color: #94a3b8;
    background: #fff;
  }

  .slot.filled:hover {
    border-color: #dc2626;
    background: #fef2f2;
  }

  .slot.empty:hover {
    border-color: #3b82f6;
    background: #eff6ff;
  }

  .slot.active {
    border-color: #22c55e;
    background: #dcfce7;
    box-shadow: 0 0 0 2px rgba(34, 197, 94, 0.3);
  }

  .slot-icon {
    font-weight: bold;
  }

  .slot-placeholder {
    font-size: 0.85rem;
    color: #94a3b8;
  }

  /* ターゲット関数選択パレット */
  .target-palette {
    margin: 1rem 0;
    padding: 1rem;
    background: #f0f9ff;
    border: 1px solid #bae6fd;
    border-radius: 8px;
  }

  .target-palette h4 {
    margin: 0 0 0.75rem;
    font-size: 0.9rem;
    font-weight: 600;
    color: #0369a1;
  }

  .target-buttons {
    display: flex;
    flex-wrap: wrap;
    gap: 0.5rem;
  }

  .target-btn {
    padding: 0.4rem 0.8rem;
    background: #fff;
    border: 2px solid #bae6fd;
    border-radius: 6px;
    cursor: pointer;
    transition: all 0.2s;
    font-family: inherit;
    font-size: 0.85rem;
    font-weight: 600;
    color: #475569;
  }

  .target-btn:hover {
    background: #e0f2fe;
    border-color: #7dd3fc;
  }

  .target-btn.selected {
    background: #0ea5e9;
    border-color: #0284c7;
    color: #fff;
  }
</style>
