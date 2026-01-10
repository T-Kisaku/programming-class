<script lang="ts">
  import { onDestroy } from "svelte";
  import { get } from "svelte/store";
  import type { LevelDefinition } from "$lib/levels/levelSchema";
  import type { Program } from "$lib/game/types";
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
      onWallCollision: "stay",
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
      failExecuted: "コインを取り切れませんでした。",
    },
  };

  const testProgram: Program = {
    main: [
      { type: "MOVE_FORWARD", color: "none" },
      { type: "MOVE_FORWARD", color: "none" },
      { type: "TURN_RIGHT", color: "none" },
      { type: "MOVE_FORWARD", color: "none" },
      { type: "CALL", color: "none", target: "helper" },
    ],
    helper: [
      { type: "TURN_RIGHT", color: "none" },
      { type: "MOVE_FORWARD", color: "none" },
      { type: "TURN_LEFT", color: "none" },
      { type: "MOVE_FORWARD", color: "none" },
    ],
  };

  const gameState = createGameStateStore(level);
  gameState.setProgram(testProgram);

  const coordKey = (x: number, y: number) => `${x},${y}`;
  const tileLookup = new Map(level.grid.tiles.map((tile) => [coordKey(tile.x, tile.y), tile]));
  const gridRows = Array.from({ length: level.grid.height }, (_, index) => index);
  const gridCols = Array.from({ length: level.grid.width }, (_, index) => index);

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
      <p>ゲームロジックのテスト用UIです。プログラムは固定です。</p>
    </div>
    <div class="controls">
      <button type="button" on:click={stepOnce}>1ステップ進める</button>
      <button type="button" on:click={startAuto} disabled={autoRun}>自動再生</button>
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
        <h2>テストプログラム</h2>
        {#each Object.entries(testProgram) as [functionId, commands]}
          <div class="program-block">
            <h3>function {functionId}</h3>
            <ol>
              {#each commands as command}
                <li>
                  <span class="command">{command.type}</span>
                  {#if command.type === "CALL"}
                    <span class="target">→ {command.target}</span>
                  {/if}
                  <span class="color">({command.color})</span>
                </li>
              {/each}
            </ol>
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
</style>
