<script lang="ts">
  import { onDestroy } from "svelte";
  import { get } from "svelte/store";
  import { goto } from "$app/navigation";
  import type { LevelDefinition } from "$lib/levels/levelSchema";
  import { createGameStateStore } from "$lib/state/gameState";
  import levelData from "$lib/levels/data/3.json";

  const level: LevelDefinition = levelData as unknown as LevelDefinition;

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

  // 関数呼び出しが利用可能かどうか
  const hasCall = level.capabilities.callTargets.length > 0;

  if (hasCall) {
    availableCommands.push({ type: "CALL", label: "呼出", icon: "◆" });
  }

  // 色の定義
  const colorLabelMap: Record<string, { label: string; color: string }> = {
    "none": { label: "無色", color: "#64748b" },
    "#1d4ed8": { label: "青", color: "#1d4ed8" },
    "#3b82f6": { label: "青", color: "#3b82f6" },
    "#15803d": { label: "緑", color: "#15803d" },
    "#22c55e": { label: "緑", color: "#22c55e" },
    "#a16207": { label: "黄", color: "#a16207" },
    "#eab308": { label: "黄", color: "#eab308" },
    "#991b1b": { label: "赤", color: "#991b1b" },
    "#ef4444": { label: "赤", color: "#ef4444" },
  };

  const colorOptions = level.capabilities.availableColors.map((value) => ({
    value,
    label: colorLabelMap[value]?.label ?? value,
    color: colorLabelMap[value]?.color ?? value,
  }));

  const hasColors = level.capabilities.availableColors.length > 1;

  type SelectedCommand = {
    type: (typeof availableCommands)[number]["type"];
    target?: string;
    color: string;
  };

  let selectedCommand: SelectedCommand | null = null;

  const selectCommand = (type: (typeof availableCommands)[number]["type"] | "delete") => {
    if (type === "delete") {
      selectedCommand = null;
    } else if (selectedCommand?.type === type) {
      selectedCommand = null;
    } else {
      selectedCommand = { type, color: "none" };
    }
  };

  const selectCommandColor = (color: string) => {
    if (selectedCommand) {
      selectedCommand.color = color;
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
        color: selectedCommand.color,
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

  const getCommandColor = (command: { type: string; color: string } | null) => {
    if (!command) return "";
    const colorOption = colorOptions.find((c) => c.value === command.color);
    return colorOption?.color || command.color;
  };

  let autoRun = false;
  let timer: ReturnType<typeof setInterval> | null = null;
  let autoRunSpeed = 350;

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
    }, autoRunSpeed);
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
    goto("/level/4");
  };

  const goBack = () => {
    goto("/");
  };

  const totalCoins = level.grid.tiles.filter((t) => t.coin).length;

  const getStatusMessage = (status: string, lastEvent: string | null) => {
    if (lastEvent === "courseOut") return level.strings.courseOut;
    if (status === "success") return level.strings.success;
    return "";
  };

  $: if (
    autoRun &&
    ($gameState.runtime.status === "success" || $gameState.runtime.status === "failed")
  ) {
    pauseAuto();
  }

  // コインを取得した時点で次のレベルへ
  $: if ($gameState.runtime.lastEvent === "coin" && $gameState.runtime.collectedCoins.length === totalCoins) {
    pauseAuto();
    setTimeout(() => {
      goToNextLevel();
    }, 500);
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
    <button type="button" class="editor-btn" on:click={() => goto("/editor")}>マップを作る</button>
  </header>

  <section class="layout">
    <!-- マップカード -->
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
            {@const isWall = tile?.type === "wall"}
            <div
              class="tile {isWall ? 'wall' : ''}"
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

    <!-- 下側のパネル -->
    <div class="panel">
      <!-- コントロールボタン -->
      <section class="controls-section">
        <div class="control-buttons">
          <button type="button" on:click={stepOnce}>1ステップ進める</button>
          <button type="button" on:click={startAuto} disabled={autoRun}>自動再生</button>
          <button type="button" on:click={pauseAuto} disabled={!autoRun}>一時停止</button>
          <button type="button" on:click={stopRuntime}>停止</button>
          <button type="button" on:click={resetRuntime}>リセット</button>
          <button type="button" on:click={clearProgram}>クリア</button>
        </div>
      </section>

      <!-- 自動再生速度 -->
      <section class="speed-section">
        <h3>自動再生速度</h3>
        <div class="speed-buttons">
          {#each [100, 200, 350, 500, 750, 1000] as speed}
            {@const isSelected = autoRunSpeed === speed}
            <button
              type="button"
              class={`speed-btn ${isSelected ? "selected" : ""}`}
              on:click={() => { autoRunSpeed = speed; }}
              aria-label={`速度 ${speed}ms`}
              aria-pressed={isSelected}
            >
              {speed}
            </button>
          {/each}
        </div>
      </section>

      <!-- ステータスメッセージ -->
      {#if getStatusMessage($gameState.runtime.status, $gameState.runtime.lastEvent)}
        <section class="status-message-wrapper">
          <div class="status-message {$gameState.runtime.status} {$gameState.runtime.lastEvent === "courseOut" ? "courseOut" : ""}">
            {getStatusMessage($gameState.runtime.status, $gameState.runtime.lastEvent)}
          </div>
        </section>
      {/if}

      <!-- プログラムパレット -->
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

        <!-- 色選択パレット（コマンド選択時かつ色が利用可能な場合のみ表示） -->
        {#if selectedCommand && hasColors}
          <div class="color-palette">
            <h4>命令の色</h4>
            <div class="color-buttons">
              {#each colorOptions as color}
                {@const isColorSelected = selectedCommand?.color === color.value}
                <button
                  type="button"
                  class={`color-btn ${isColorSelected ? "selected" : ""}`}
                  on:click={() => selectCommandColor(color.value)}
                  aria-label={color.label}
                  aria-pressed={isColorSelected}
                  style={`--color: ${color.color}`}
                >
                  <span class="color-swatch"></span>
                  <span class="color-label">{color.label}</span>
                </button>
              {/each}
            </div>
          </div>
        {/if}

        <!-- ターゲット関数選択パレット（CALL選択時のみ表示） -->
        {#if selectedCommand?.type === "CALL"}
          {#if level.capabilities.callTargets.length > 0}
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
                {@const commandColor = command ? getCommandColor(command) : null}
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
                  style={commandColor && commandColor !== "#64748b" ? `--command-color: ${commandColor}` : ""}
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

  .header p {
    margin: 0;
    color: #64748b;
  }

  .editor-btn {
    border: none;
    border-radius: 999px;
    padding: 0.5rem 1rem;
    background: #10b981;
    color: #fff;
    cursor: pointer;
    font-weight: 600;
    transition: all 0.2s;
  }

  .editor-btn:hover {
    background: #059669;
  }

  @media (max-width: 600px) {
    .header {
      flex-direction: column;
      align-items: flex-start;
      gap: 0.5rem;
    }

    .editor-btn {
      align-self: flex-start;
    }
  }

  .layout {
    display: flex;
    flex-direction: column;
    gap: 2rem;
  }

  .board {
    background: #ffffff;
    padding: 1.5rem;
    border-radius: 16px;
    box-shadow: 0 8px 30px rgba(15, 23, 42, 0.08);
    flex: 1;
    min-height: 400px;
  }

  .grid {
    display: grid;
    grid-template-columns: repeat(var(--cols), 72px);
    gap: 6px;
    justify-content: center;
    place-items: center;
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

  .tile.wall {
    background-color: #3f3f46;
    border-color: #27272a;
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

  .panel section {
    flex-shrink: 0;
  }

  .status-message-wrapper {
    background: #ffffff;
    padding: 1.5rem;
    border-radius: 16px;
    box-shadow: 0 8px 30px rgba(15, 23, 42, 0.08);
  }

  .program {
    background: #ffffff;
    padding: 1.5rem;
    border-radius: 16px;
    box-shadow: 0 8px 30px rgba(15, 23, 42, 0.08);
  }

  .controls-section,
  .speed-section {
    background: #ffffff;
    padding: 1.5rem;
    border-radius: 16px;
    box-shadow: 0 8px 30px rgba(15, 23, 42, 0.08);
  }

  .control-buttons,
  .speed-buttons {
    display: flex;
    flex-wrap: wrap;
    gap: 0.5rem;
  }

  .control-buttons button,
  .speed-btn {
    border: none;
    border-radius: 999px;
    padding: 0.5rem 1rem;
    background: #1f6feb;
    color: #fff;
    cursor: pointer;
    font-weight: 600;
    transition: all 0.2s;
  }

  .control-buttons button:hover,
  .speed-btn:hover:not(:disabled) {
    background: #1a5fd8;
  }

  .control-buttons button[disabled],
  .speed-btn[disabled] {
    background: #9aa4b2;
    cursor: not-allowed;
  }

  .speed-section h3 {
    margin: 0 0 0.75rem;
    font-size: 0.95rem;
    font-weight: 600;
    color: #475569;
  }

  .speed-btn {
    font-size: 0.9rem;
    padding: 0.4rem 0.8rem;
  }

  .speed-btn.selected {
    background: #dbeafe;
    color: #1d4ed8;
  }

  .status-message {
    padding: 0.75rem 1rem;
    border-radius: 8px;
    font-weight: 600;
    text-align: center;
  }

  .status-message.success {
    background: #dcfce7;
    color: #166534;
  }

  .status-message.failed {
    background: #fef3c7;
    color: #92400e;
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
    border-color: #7dd3fc;
    background: #e0f2fe;
  }

  .target-btn.selected {
    border-color: #0284c7;
    background: #0ea5e9;
    color: #fff;
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

  /* 色選択パレット */
  .color-palette {
    margin: 1rem 0;
    padding: 1rem;
    background: #f8fafc;
    border: 1px solid #e2e8f0;
    border-radius: 8px;
  }

  .color-palette h4 {
    margin: 0 0 0.75rem;
    font-size: 0.9rem;
    font-weight: 600;
    color: #475569;
  }

  .color-buttons {
    display: flex;
    flex-wrap: wrap;
    gap: 0.5rem;
  }

  .color-btn {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    padding: 0.4rem 0.75rem;
    background: #fff;
    border: 2px solid #e2e8f0;
    border-radius: 6px;
    cursor: pointer;
    transition: all 0.2s;
    font-family: inherit;
    font-size: 0.85rem;
    font-weight: 600;
    color: #475569;
  }

  .color-btn:hover {
    border-color: #cbd5e1;
    background: #f1f5f9;
  }

  .color-btn.selected {
    border-color: var(--color);
    background: #f0f9ff;
  }

  .color-swatch {
    width: 16px;
    height: 16px;
    border-radius: 4px;
    background: var(--color);
    border: 1px solid rgba(0, 0, 0, 0.1);
  }

  .color-label {
    font-size: 0.85rem;
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

  .slot.filled[style*="--command-color"] {
    border-color: var(--command-color);
    background: color-mix(in srgb, var(--command-color) 15%, #fff);
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
