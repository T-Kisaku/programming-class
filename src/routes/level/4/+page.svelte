<script lang="ts">
  import { onDestroy } from "svelte";
  import { get } from "svelte/store";
  import type { LevelDefinition } from "$lib/levels/levelSchema";
  import type { Command, CommandType } from "$lib/game/types";
  import { createGameStateStore } from "$lib/state/gameState";

  const level: LevelDefinition = {
    id: "level-4",
    title: "Level 4",
    grid: {
      width: 9,
      height: 7,
      tiles: Array.from({ length: 7 }, (_, y) =>
        Array.from({ length: 9 }, (_, x) => {
          const isFloor =
            (y === 1 && x >= 3 && x <= 5) ||
            (y >= 2 && y <= 4 && x >= 2 && x <= 6) ||
            (y === 5 && x >= 3 && x <= 5);

          return {
            x,
            y,
            type: isFloor ? "floor" : "wall",
            tileColor: isFloor ? "#12b5c0" : "none",
            coin: isFloor && ((x === 2 && y === 2) || (x === 6 && y === 2)),
          };
        })
      ).flat(),
    },
    start: { x: 4, y: 3, dir: "E" },
    rules: {
      onOutOfBounds: "reset",
      onWallCollision: "reset",
    },
    program: {
      entry: "F1",
      functions: {
        F1: { maxSlots: 5 },
        F2: { maxSlots: 4 },
      },
    },
    capabilities: {
      availableCommands: ["MOVE_FORWARD", "TURN_LEFT", "TURN_RIGHT", "CALL"],
      callTargets: ["F1", "F2"],
      availableColors: ["none", "#12b5c0"],
      colorRule: "allowAllOnNone",
    },
    strings: {
      success: "全てのコインを集めました！",
      failExecuted: "コインを取り切れませんでした。",
    },
  };

  const palette: Array<{ id: string; label: string; type: CommandType | null }> = [
    { id: "MOVE_FORWARD", label: "↑", type: "MOVE_FORWARD" },
    { id: "TURN_LEFT", label: "⟲", type: "TURN_LEFT" },
    { id: "TURN_RIGHT", label: "⟳", type: "TURN_RIGHT" },
    { id: "ERASE", label: "消", type: null },
  ];

  const commandLabels: Record<CommandType, string> = {
    MOVE_FORWARD: "↑",
    TURN_LEFT: "⟲",
    TURN_RIGHT: "⟳",
    CALL: "F",
  };

  const gameState = createGameStateStore(level);

  const coordKey = (x: number, y: number) => `${x},${y}`;
  const tileLookup = new Map(level.grid.tiles.map((tile) => [coordKey(tile.x, tile.y), tile]));
  const gridRows = Array.from({ length: level.grid.height }, (_, index) => index);
  const gridCols = Array.from({ length: level.grid.width }, (_, index) => index);
  let selectedCommand: CommandType | null = "MOVE_FORWARD";
  let selectedCallTarget = "F1";

  let autoRun = false;
  let timer: ReturnType<typeof setInterval> | null = null;
  let speedValue = 60;
  let failedNotice = false;
  let resetNotice = false;
  let failureTimeout: ReturnType<typeof setTimeout> | null = null;

  const delayFromSpeed = () => 900 - Math.round((speedValue / 100) * 650);

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
    }, delayFromSpeed());
  };

  const restartAutoTimer = () => {
    if (!autoRun) {
      return;
    }
    if (timer) {
      clearInterval(timer);
    }
    timer = setInterval(() => {
      gameState.step();
    }, delayFromSpeed());
  };

  const stopRuntime = () => {
    pauseAuto();
    gameState.stop();
  };

  const resetRuntime = () => {
    pauseAuto();
    gameState.resetRuntime();
  };

  const resetProgram = () => {
    pauseAuto();
    gameState.resetAll();
  };

  const selectCommand = (command: CommandType | null) => {
    selectedCommand = command;
  };

  const setSlotCommand = (functionId: string, slotIndex: number) => {
    if (!selectedCommand) {
      gameState.setCommand(functionId, slotIndex, null);
      return;
    }

    const command: Command = {
      type: selectedCommand,
      color: "none",
      ...(selectedCommand === "CALL" ? { target: selectedCallTarget } : {}),
    };

    gameState.setCommand(functionId, slotIndex, command);
  };

  const describeCommand = (command: Command | null) => {
    if (!command) {
      return "";
    }
    if (command.type === "CALL") {
      return `${commandLabels[command.type]}${command.target ?? ""}`;
    }
    return commandLabels[command.type];
  };

  const getActiveFrame = () =>
    $gameState.runtime.stack.length > 0
      ? $gameState.runtime.stack[$gameState.runtime.stack.length - 1]
      : null;

  const isActiveSlot = (functionId: string, slotIndex: number) => {
    if ($gameState.runtime.status !== "running") {
      return false;
    }
    const activeFrame = getActiveFrame();
    return (
      activeFrame?.functionId === functionId && activeFrame.instructionIndex === slotIndex
    );
  };

  const handleFailure = () => {
    pauseAuto();
    failedNotice = true;
    gameState.resetRuntime();
    if (failureTimeout) {
      clearTimeout(failureTimeout);
    }
    failureTimeout = setTimeout(() => {
      failedNotice = false;
      failureTimeout = null;
    }, 2000);
  };

  const closeFailure = () => {
    failedNotice = false;
    if (failureTimeout) {
      clearTimeout(failureTimeout);
      failureTimeout = null;
    }
  };

  const handleResetEvent = () => {
    pauseAuto();
    resetNotice = true;
    gameState.stop();
  };

  const closeReset = () => {
    resetNotice = false;
  };

  $: if (
    autoRun &&
    ($gameState.runtime.status === "success" || $gameState.runtime.status === "failed")
  ) {
    pauseAuto();
  }

  $: if ($gameState.runtime.status === "failed" && !failedNotice) {
    handleFailure();
  }

  $: if ($gameState.runtime.lastEvent === "reset" && !resetNotice) {
    handleResetEvent();
  }

  $: if (autoRun) {
    restartAutoTimer();
  }

  onDestroy(() => {
    pauseAuto();
    if (failureTimeout) {
      clearTimeout(failureTimeout);
    }
  });
</script>

<main class="page">
  <header class="header">
    <div>
      <p class="level">Level 4</p>
      <h1>編集パレットで挑戦</h1>
      <p class="subtitle">
        コマンドを選んで、F1・F2のスロットに配置してください。Go! で実行できます。
      </p>
    </div>
    <div class="controls">
      <button type="button" class="primary" on:click={startAuto} disabled={autoRun}>Go !</button>
      <button type="button" on:click={stepOnce}>1ステップ</button>
      <button type="button" on:click={pauseAuto} disabled={!autoRun}>一時停止</button>
      <button type="button" on:click={stopRuntime}>停止</button>
      <button type="button" on:click={resetRuntime}>リセット</button>
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
            <div
              class={`tile ${isWall ? "wall" : "floor"}`}
              style={!isWall ? "background-color: #12b5c0" : ""}
            >
              {#if hasCoin}
                <span class="coin" aria-label="coin">◆</span>
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

    <div class="side">
      <section class="palette">
        <h2>編集パレット</h2>
        <div class="palette-grid">
          {#each palette as item}
            <button
              type="button"
              class={`palette-button ${selectedCommand === item.type ? "active" : ""}`}
              on:click={() => selectCommand(item.type)}
            >
              <span>{item.label}</span>
            </button>
          {/each}
        </div>
        <div class="call-targets" aria-live="polite">
          <span>CALL:</span>
          {#each level.capabilities.callTargets as target}
            <button
              type="button"
              class={`target-button ${
                selectedCommand === "CALL" && selectedCallTarget === target ? "active" : ""
              }`}
              on:click={() => {
                selectedCallTarget = target;
                selectedCommand = "CALL";
              }}
            >
              {target}
            </button>
          {/each}
        </div>
        <div class="speed">
          <span>fast</span>
          <input
            type="range"
            min="0"
            max="100"
            bind:value={speedValue}
            on:input={restartAutoTimer}
          />
          <span>slow</span>
        </div>
      </section>

      <section class="program">
        <div class="program-header">
          <h2>プログラム</h2>
          <button type="button" class="ghost" on:click={resetProgram}>全消去</button>
        </div>
        {#each Object.entries($gameState.program) as [functionId, slots]}
          <div class="program-block">
            <div class="function-title">{functionId}</div>
            <div class="slots">
              {#each slots as command, slotIndex}
                <button
                  type="button"
                  class={`slot ${command ? "filled" : ""} ${isActiveSlot(functionId, slotIndex) ? "active" : ""}`}
                  on:click={() => setSlotCommand(functionId, slotIndex)}
                >
                  {describeCommand(command)}
                </button>
              {/each}
            </div>
          </div>
        {/each}
      </section>

    </div>
  </section>
</main>

{#if failedNotice || resetNotice}
  <div
    class="overlay"
    role="alertdialog"
    aria-live="assertive"
    aria-label={failedNotice ? "失敗" : "リセット"}
  >
    <div class="dialog">
      <h2>{failedNotice ? "失敗しました" : "コース外です"}</h2>
      <p>
        {failedNotice
          ? "キャラクターをリセットしました。もう一度試してください。"
          : "コースからはみ出したため、実行を中止しました。"}
      </p>
      <button
        type="button"
        class="primary"
        on:click={failedNotice ? closeFailure : closeReset}
      >
        OK
      </button>
    </div>
  </div>
{/if}

<style>
  :global(body) {
    margin: 0;
    background: radial-gradient(circle at top, #2b2b2b, #111);
    color: #f8fafc;
  }

  .page {
    min-height: 100vh;
    display: flex;
    flex-direction: column;
    gap: 1.5rem;
    padding: 2rem 2.5rem 3rem;
    font-family: "Segoe UI", system-ui, sans-serif;
  }

  .header {
    display: flex;
    justify-content: space-between;
    gap: 2rem;
    flex-wrap: wrap;
    align-items: center;
  }

  .level {
    text-transform: uppercase;
    letter-spacing: 0.3em;
    font-size: 0.85rem;
    margin: 0 0 0.35rem;
    color: #94a3b8;
  }

  h1 {
    margin: 0;
    font-size: 2rem;
  }

  .subtitle {
    margin: 0.4rem 0 0;
    color: #cbd5f5;
  }

  .controls {
    display: flex;
    flex-wrap: wrap;
    gap: 0.6rem;
  }

  button {
    border: none;
    border-radius: 12px;
    padding: 0.5rem 1rem;
    background: #475569;
    color: #f8fafc;
    cursor: pointer;
    font-weight: 600;
  }

  button.primary {
    background: #ffffff;
    color: #111827;
  }

  button.ghost {
    background: transparent;
    color: #cbd5f5;
    border: 1px solid #334155;
  }

  button[disabled] {
    opacity: 0.5;
    cursor: not-allowed;
  }

  .layout {
    display: grid;
    grid-template-columns: minmax(280px, 520px) minmax(280px, 1fr);
    gap: 2rem;
    align-items: start;
  }

  .board {
    background: #151515;
    border-radius: 22px;
    padding: 2rem;
    box-shadow: 0 12px 40px rgba(0, 0, 0, 0.5);
  }

  .grid {
    display: grid;
    grid-template-columns: repeat(var(--cols), 54px);
    gap: 6px;
    justify-content: center;
  }

  .tile {
    position: relative;
    width: 54px;
    height: 54px;
    border-radius: 8px;
    display: flex;
    align-items: center;
    justify-content: center;
    border: 1px solid rgba(0, 0, 0, 0.2);
  }

  .tile.wall {
    background-color: #101010;
    border-color: #1f1f1f;
  }

  .coin {
    font-size: 1.1rem;
    color: #111827;
  }

  .player {
    position: absolute;
    bottom: 6px;
    right: 6px;
    font-size: 1.4rem;
    color: #f8fafc;
    text-shadow: 0 1px 4px rgba(0, 0, 0, 0.6);
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

  .side {
    display: flex;
    flex-direction: column;
    gap: 1.5rem;
  }

  .palette,
  .program {
    background: rgba(15, 23, 42, 0.7);
    border-radius: 18px;
    padding: 1.5rem;
    box-shadow: 0 12px 30px rgba(0, 0, 0, 0.35);
  }

  .palette-grid {
    display: grid;
    grid-template-columns: repeat(5, 1fr);
    gap: 0.5rem;
    margin-top: 1rem;
  }

  .palette-button {
    font-size: 1.1rem;
    padding: 0.6rem 0;
    border: 1px solid transparent;
  }

  .palette-button.active {
    background: #f8fafc;
    color: #111827;
    border-color: #e2e8f0;
  }

  .call-targets {
    margin-top: 1rem;
    display: flex;
    align-items: center;
    gap: 0.6rem;
    color: #cbd5f5;
  }

  .target-button {
    padding: 0.35rem 0.8rem;
    border-radius: 8px;
    background: #1e293b;
  }

  .target-button.active {
    background: #f8fafc;
    color: #111827;
  }

  .speed {
    margin-top: 1rem;
    display: flex;
    align-items: center;
    gap: 0.6rem;
    color: #cbd5f5;
    font-size: 0.9rem;
  }

  .speed input {
    flex: 1;
  }

  .program-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
  }

  .program-block {
    margin-top: 1rem;
  }

  .function-title {
    font-weight: 700;
    margin-bottom: 0.5rem;
  }

  .slots {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(52px, 1fr));
    gap: 0.5rem;
  }

  .slot {
    height: 48px;
    border-radius: 10px;
    background: #1e293b;
    color: #f8fafc;
    border: 1px solid #334155;
    font-weight: 700;
    font-size: 1rem;
  }

  .slot.filled {
    background: #e2e8f0;
    color: #0f172a;
  }

  .slot.active {
    border-color: #facc15;
    box-shadow: 0 0 12px rgba(250, 204, 21, 0.7);
    animation: pulse 0.8s ease-in-out infinite;
  }

  .overlay {
    position: fixed;
    inset: 0;
    background: rgba(15, 23, 42, 0.75);
    display: grid;
    place-items: center;
    z-index: 10;
  }

  .dialog {
    background: #0f172a;
    border-radius: 18px;
    padding: 2rem 2.5rem;
    box-shadow: 0 20px 50px rgba(0, 0, 0, 0.45);
    text-align: center;
    max-width: 320px;
  }

  .dialog h2 {
    margin: 0 0 0.5rem;
  }

  .dialog p {
    margin: 0 0 1.5rem;
    color: #cbd5f5;
  }

  @keyframes pulse {
    0%,
    100% {
      transform: scale(1);
    }
    50% {
      transform: scale(1.03);
    }
  }

  @media (max-width: 960px) {
    .layout {
      grid-template-columns: 1fr;
    }

    .header {
      align-items: flex-start;
    }
  }
</style>
