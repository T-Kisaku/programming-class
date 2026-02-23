<script lang="ts">
  import { onDestroy } from "svelte";
  import { get } from "svelte/store";
  import { goto } from "$app/navigation";
  import type { LevelDefinition } from "$lib/levels/levelSchema";
  import { createGameStateStore } from "$lib/state/gameState";

  const level: LevelDefinition = {
    id: "level-1",
    title: "Level 1",
    grid: {
      width: 3,
      height: 3,
      tiles: Array.from({ length: 3 }, (_, y) =>
        Array.from({ length: 3 }, (_, x) => ({
          x,
          y,
          type: "floor",
          tileColor: "#f8fafc",
          coin: x === 2 && y === 1,
        }))
      ).flat(),
    },
    start: { x: 0, y: 1, dir: "E" },
    rules: {
      onOutOfBounds: "reset",
      onWallCollision: "reset",
    },
    program: {
      entry: "main",
      functions: {
        main: { maxSlots: 4 },
      },
    },
    capabilities: {
      availableCommands: ["MOVE_FORWARD", "TURN_LEFT", "TURN_RIGHT"],
      callTargets: [],
      availableColors: ["none"],
      colorRule: "allowAllOnNone",
    },
    strings: {
      success: "クリア！次のレベルへ",
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
    { type: "MOVE_FORWARD", label: "直進", icon: "▲" },
    { type: "TURN_RIGHT", label: "右90°", icon: "↷" },
    { type: "TURN_LEFT", label: "左90°", icon: "↶" },
  ] as const;

  // 選択中のコマンド
  type SelectedCommand = {
    type: (typeof availableCommands)[number]["type"];
  };

  let selectedCommand: SelectedCommand | null = null;

  const selectCommand = (type: (typeof availableCommands)[number]["type"] | "delete") => {
    if (type === "delete") {
      selectedCommand = null;
    } else if (selectedCommand?.type === type) {
      selectedCommand = null;
    } else {
      selectedCommand = { type };
    }
  };

  const setSlotCommand = (functionId: string, slotIndex: number) => {
    if (selectedCommand) {
      gameState.setCommand(functionId, slotIndex, {
        type: selectedCommand.type,
        color: "none",
      });
    } else {
      gameState.setCommand(functionId, slotIndex, null);
    }
  };

  const getCommandLabel = (command: { type: string } | null) => {
    if (!command) return "";
    const cmd = availableCommands.find((c) => c.type === command.type);
    return cmd ? cmd.icon : "";
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

  const clearProgram = () => {
    gameState.resetAll();
  };

  const goToNextLevel = () => {
    // TODO: すべてのレベルをクリアしたらおめでとうページへ
    goto("/level/2");
  };

  const goBack = () => {
    goto("/");
  };

  // ステータスメッセージを取得
  const getStatusMessage = (status: string, lastEvent: string | null) => {
    if (lastEvent === "courseOut") return level.strings.courseOut;
    if (status === "success") return level.strings.success;
    if (status === "failed") return level.strings.failExecuted;
    if (status === "idle") return "待機中";
    return "";
  };

  $: if (
    autoRun &&
    ($gameState.runtime.status === "success" || $gameState.runtime.status === "failed")
  ) {
    pauseAuto();
  }

  $: if ($gameState.runtime.status === "success" && $gameState.runtime.collectedCoins.length === 1) {
    // 1ステップ待ってから次のレベルへ
    setTimeout(() => {
      if ($gameState.runtime.status === "success") {
        goToNextLevel();
      }
    }, 1000);
  }

  onDestroy(() => {
    pauseAuto();
  });
</script>

<main class="page">
  <header class="header">
    <button type="button" class="back-btn" on:click={goBack}>← 戻る</button>
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
            {@const isPlayer = $gameState.runtime.position.x === x && $gameState.runtime.position.y === y}
            {@const hasCoin =
              tile?.coin && !$gameState.runtime.collectedCoins.includes(coordKey(x, y))}
            {@const tileBackground = tile?.tileColor === "none"
              ? "#fefcf7"
              : tile?.tileColor ?? "#fefcf7"}
            <div
              class="tile"
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
            <dd>{$gameState.runtime.collectedCoins.length} / 1</dd>
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
          <button
            type="button"
            class="command-btn delete-btn"
            on:click={() => selectCommand("delete")}
            aria-label="コマンド削除"
          >
            <span class="command-icon">×</span>
            <span class="command-label">削除</span>
          </button>
        </div>

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

  .back-btn {
    align-self: flex-start;
    border: none;
    border-radius: 999px;
    padding: 0.5rem 1rem;
    background: #e2e8f0;
    color: #475569;
    cursor: pointer;
    font-weight: 600;
    transition: all 0.2s;
  }

  .back-btn:hover {
    background: #cbd5e1;
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
    grid-template-columns: repeat(var(--cols), 72px);
    gap: 6px;
    justify-content: center;
  }

  .tile {
    position: relative;
    width: 72px;
    height: 72px;
    border-radius: 10px;
    display: flex;
    align-items: center;
    justify-content: center;
    border: 2px solid rgba(15, 23, 42, 0.08);
    background-color: #fefcf7;
  }

  .coin {
    font-size: 1.3rem;
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

  .status dt {
    font-weight: 600;
    color: #475569;
  }

  .status dd {
    margin: 0.2rem 0 0;
    font-size: 1.05rem;
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
    font-size: 1.6rem;
    line-height: 1;
    font-weight: 900;
  }

  .command-label {
    font-weight: 500;
  }

  .command-btn.delete-btn {
    color: #dc2626;
  }

  .command-btn.delete-btn:hover:not(:disabled) {
    background: #fef2f2;
    border-color: #fca5a5;
  }

  .command-btn.delete-btn.selected {
    background: #fee2e2;
    border-color: #dc2626;
    color: #991b1b;
  }

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
    grid-template-columns: repeat(auto-fill, minmax(56px, 1fr));
    gap: 0.5rem;
  }

  .slot {
    width: 56px;
    height: 56px;
    border: 2px dashed #cbd5e1;
    border-radius: 8px;
    background: #f8fafc;
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    transition: all 0.2s;
    font-family: inherit;
    font-size: 1.6rem;
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
    font-weight: 900;
    filter: drop-shadow(0 1px 2px rgba(0, 0, 0, 0.1));
  }

  .slot-placeholder {
    font-size: 0.85rem;
    color: #94a3b8;
  }

  @media (max-width: 900px) {
    .layout {
      grid-template-columns: 1fr;
    }
  }
</style>
