<script lang="ts">
  import { onDestroy } from "svelte";
  import { get } from "svelte/store";
  import { goto } from "$app/navigation";
  import { page } from "$app/stores";
  import type { LevelDefinition } from "$lib/levels/levelSchema";
  import { createGameStateStore } from "$lib/state/gameState";

  let level: LevelDefinition | null = null;
  let gameState: ReturnType<typeof createGameStateStore> | null = null;
  let error = "";
  let returnToEditor = false;

  const coordKey = (x: number, y: number) => `${x},${y}`;
  let tileLookup: Map<string, any> = new Map();
  let gridRows: number[] = [];
  let gridCols: number[] = [];

  // プログラム編集用のコマンド定義
  const availableCommands = [
    { type: "MOVE_FORWARD", label: "直進", icon: "▲" },
    { type: "TURN_RIGHT", label: "右90°", icon: "↷" },
    { type: "TURN_LEFT", label: "左90°", icon: "↶" },
    { type: "CALL", label: "呼出", icon: "◆" },
  ] as const;

  type SelectedCommand = {
    type: (typeof availableCommands)[number]["type"];
    target?: string;
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

  const selectCallTarget = (target: string) => {
    if (selectedCommand?.type === "CALL") {
      selectedCommand.target = target;
    }
  };

  const setSlotCommand = (functionId: string, slotIndex: number) => {
    if (!gameState) return;
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
    if (!gameState) return;
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
    if (!gameState) return;
    if (get(gameState).runtime.status !== "running") {
      gameState.start();
    }
    timer = setInterval(() => {
      gameState.step();
    }, autoRunSpeed);
  };

  const stopRuntime = () => {
    pauseAuto();
    if (!gameState) return;
    gameState.stop();
  };

  const resetRuntime = () => {
    pauseAuto();
    if (!gameState) return;
    gameState.resetRuntime();
  };

  const clearProgram = () => {
    if (!gameState) return;
    gameState.resetAll();
  };

  const goBack = () => {
    if (returnToEditor) {
      sessionStorage.removeItem("returnToEditor");
      goto("/editor");
    } else {
      goto("/");
    }
  };

  const getStatusMessage = (status: string, lastEvent: string | null) => {
    if (!level) return "";
    if (lastEvent === "courseOut") return level.strings.courseOut;
    if (status === "success") return level.strings.success;
    return "";
  };

  // UTF-8対応のBase64デコード
  const b64_to_utf8 = (str: string): string => {
    try {
      return decodeURIComponent(escape(window.atob(str)));
    } catch (e) {
      console.error("Base64 decoding error:", e);
      return "";
    }
  };

  // URLからマップデータを取得
  $: if ($page.url.searchParams.has("data")) {
    try {
      let data = $page.url.searchParams.get("data");
      if (data) {
        // URLエンコードされている場合はデコード
        data = decodeURIComponent(data);
        const json = b64_to_utf8(data);
        level = JSON.parse(json) as LevelDefinition;
        gameState = createGameStateStore(level);
        tileLookup = new Map(level.grid.tiles.map((tile) => [coordKey(tile.x, tile.y), tile]));
        gridRows = Array.from({ length: level.grid.height }, (_, index) => index);
        gridCols = Array.from({ length: level.grid.width }, (_, index) => index);
        error = "";
        // エディタから来たかチェック
        returnToEditor = sessionStorage.getItem("returnToEditor") === "true";
      }
    } catch (e) {
      error = "マップデータの読み込みに失敗しました";
      console.error("Decoding error:", e);
    }
  }

  $: if (
    gameState &&
    autoRun &&
    ($gameState.runtime.status === "success" || $gameState.runtime.status === "failed")
  ) {
    pauseAuto();
  }

  $: if (gameState && $gameState.runtime.lastEvent === "coin") {
    const totalCoins = level?.grid.tiles.filter((t) => t.coin).length || 0;
    if ($gameState.runtime.collectedCoins.length === totalCoins) {
      pauseAuto();
      setTimeout(() => {
        if (gameState && $gameState.runtime.status !== "running") {
          alert(level?.strings.success || "クリア！");
        }
      }, 500);
    }
  }

  onDestroy(() => {
    pauseAuto();
  });
</script>

<main class="page">
  <header class="header">
    <button type="button" class="back-btn" on:click={goBack}>
      {returnToEditor ? "← エディタに戻る" : "← 戻る"}
    </button>
    <div>
      <h1>{level?.title || "カスタムマップ"}</h1>
      <p>コマンドを選択してスロットをクリックし、プログラムを作成してください。</p>
    </div>
    {#if !returnToEditor}
      <button type="button" class="editor-btn" on:click={() => goto("/editor")}>マップを作る</button>
    {/if}
  </header>

  {#if error}
    <div class="error-message">{error}</div>
  {:else if !level}
    <div class="error-message">マップデータが見つかりません</div>
  {:else}
    <section class="layout">
      <!-- マップカード -->
      <div class="board">
        <div class="grid" style={`--cols: ${level.grid.width}`}>
          {#each gridRows as y}
            {#each gridCols as x}
              {@const tile = tileLookup.get(coordKey(x, y))}
              {@const isPlayer = $gameState?.runtime.position.x === x && $gameState.runtime.position.y === y}
              {@const hasCoin =
                tile?.coin && !$gameState?.runtime.collectedCoins.includes(coordKey(x, y))}
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
        {#if getStatusMessage($gameState?.runtime.status ?? "", $gameState?.runtime.lastEvent ?? null)}
          <section class="status-message-wrapper">
            <div class="status-message {$gameState?.runtime.status ?? ""} {$gameState?.runtime.lastEvent === "courseOut" ? "courseOut" : ""}">
              {getStatusMessage($gameState?.runtime.status ?? "", $gameState?.runtime.lastEvent ?? null)}
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

          <!-- ターゲット関数選択パレット（CALL選択時のみ表示） -->
          {#if selectedCommand?.type === "CALL"}
            {#if level && level.capabilities.callTargets.length > 0}
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
                  {@const command = $gameState?.program[functionId]?.[i]}
                  {@const isHighlighted =
                    $gameState?.runtime.stack.length > 0 &&
                    $gameState?.runtime.stack[$gameState.runtime.stack.length - 1].functionId ===
                      functionId &&
                    $gameState?.runtime.stack[$gameState.runtime.stack.length - 1].instructionIndex === i}
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
  {/if}
</main>

<style>
  .page {
    display: flex;
    flex-direction: column;
    gap: 1rem;
    padding: 1rem;
    font-family: "Segoe UI", system-ui, sans-serif;
    background: #f7f6f3;
    min-height: 100vh;
  }

  .header {
    display: flex;
    align-items: center;
    gap: 1rem;
    flex-wrap: wrap;
  }

  .back-btn {
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
    flex: 1;
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

  .error-message {
    background: #fef2f2;
    color: #dc2626;
    padding: 1.5rem;
    border-radius: 16px;
    text-align: center;
    font-weight: 600;
  }

  .layout {
    display: flex;
    flex-direction: column;
    gap: 2rem;
    flex: 1;
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

  .controls-section,
  .speed-section,
  .status-message-wrapper,
  .program {
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

  .program h2 {
    margin: 0 0 1rem;
    font-size: 1rem;
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

  .status-message.courseOut {
    background: #fef2f2;
    color: #dc2626;
  }

  @media (max-width: 768px) {
    .header {
      flex-direction: column;
      align-items: flex-start;
    }

    .header h1 {
      font-size: 1.4rem;
    }
  }
</style>
