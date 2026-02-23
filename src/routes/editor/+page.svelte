<script lang="ts">
  import type { LevelDefinition } from "$lib/levels/levelSchema";
  import { goto } from "$app/navigation";

  // エディタの状態
  let gridSize = 5;
  let gridTiles: Array<{ x: number; y: number; type: "floor" | "wall"; coin: boolean }> = [];

  const initGrid = () => {
    gridTiles = [];
    for (let y = 0; y < gridSize; y++) {
      for (let x = 0; x < gridSize; x++) {
        gridTiles.push({ x, y, type: "floor", coin: false });
      }
    }
  };

  initGrid();

  // プレイヤーの開始位置
  let startX = 0;
  let startY = 0;
  let startDir: "N" | "E" | "S" | "W" = "E";

  // プログラム設定
  let maxSlots = 5;
  let functionName = "main";

  // マップ名
  let mapName = "My Map";

  // タイルをクリックしたときの処理
  const toggleWall = (x: number, y: number) => {
    const tile = gridTiles.find((t) => t.x === x && t.y === y);
    if (tile) {
      tile.type = tile.type === "floor" ? "wall" : "floor";
      tile.coin = false; // 壁にしたらコインを消す
    }
  };

  const toggleCoin = (x: number, y: number) => {
    const tile = gridTiles.find((t) => t.x === x && t.y === y);
    if (tile && tile.type === "floor") {
      tile.coin = !tile.coin;
    }
  };

  // マップをJSONとしてエクスポート
  const exportMap = () => {
    const level: LevelDefinition = {
      id: "custom-" + Date.now(),
      title: mapName,
      grid: {
        width: gridSize,
        height: gridSize,
        tiles: gridTiles.map((tile) => ({
          ...tile,
          tileColor: "none",
        })),
      },
      start: { x: startX, y: startY, dir: startDir },
      rules: {
        onOutOfBounds: "reset",
        onWallCollision: "reset",
      },
      program: {
        entry: functionName,
        functions: {
          [functionName]: { maxSlots },
        },
      },
      capabilities: {
        availableCommands: ["MOVE_FORWARD", "TURN_LEFT", "TURN_RIGHT"],
        callTargets: [],
        availableColors: ["none"],
        colorRule: "allowAllOnNone",
      },
      strings: {
        success: "クリア！",
        failExecuted: "プログラムを実行し終えました。",
        courseOut: "コースアウトしました",
      },
    };

    const json = JSON.stringify(level, null, 2);
    const blob = new Blob([json], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${mapName.replace(/\s+/g, "_")}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // マップをURLで共有
  const shareMap = () => {
    const level: LevelDefinition = {
      id: "custom-" + Date.now(),
      title: mapName,
      grid: {
        width: gridSize,
        height: gridSize,
        tiles: gridTiles.map((tile) => ({
          ...tile,
          tileColor: "none",
        })),
      },
      start: { x: startX, y: startY, dir: startDir },
      rules: {
        onOutOfBounds: "reset",
        onWallCollision: "reset",
      },
      program: {
        entry: functionName,
        functions: {
          [functionName]: { maxSlots },
        },
      },
      capabilities: {
        availableCommands: ["MOVE_FORWARD", "TURN_LEFT", "TURN_RIGHT"],
        callTargets: [],
        availableColors: ["none"],
        colorRule: "allowAllOnNone",
      },
      strings: {
        success: "クリア！",
        failExecuted: "プログラムを実行し終えました。",
        courseOut: "コースアウトしました",
      },
    };

    const json = JSON.stringify(level);
    const encoded = btoa(unescape(encodeURIComponent(json)));
    goto(`/custom?data=${encoded}`);
  };

  const goBack = () => {
    goto("/");
  };
</script>

<main class="page">
  <header class="header">
    <button type="button" class="back-btn" on:click={goBack}>← 戻る</button>
    <h1>マップエディタ</h1>
  </header>

  <section class="editor-layout">
    <!-- 左側：設定パネル -->
    <div class="settings-panel">
      <h2>設定</h2>

      <div class="setting-group">
        <label>マップ名</label>
        <input type="text" bind:value={mapName} class="text-input" />
      </div>

      <div class="setting-group">
        <label>グリッドサイズ</label>
        <input type="number" bind:value={gridSize} min="3" max="10" on:change={initGrid} class="number-input" />
      </div>

      <div class="setting-group">
        <label>開始位置 (X)</label>
        <input type="number" bind:value={startX} min="0" max={gridSize - 1} class="number-input" />
      </div>

      <div class="setting-group">
        <label>開始位置 (Y)</label>
        <input type="number" bind:value={startY} min="0" max={gridSize - 1} class="number-input" />
      </div>

      <div class="setting-group">
        <label>開始方向</label>
        <select bind:value={startDir} class="select-input">
          <option value="N">北 (上)</option>
          <option value="E">東 (右)</option>
          <option value="S">南 (下)</option>
          <option value="W">西 (左)</option>
        </select>
      </div>

      <div class="setting-group">
        <label>関数名</label>
        <input type="text" bind:value={functionName} class="text-input" />
      </div>

      <div class="setting-group">
        <label>スロット数</label>
        <input type="number" bind:value={maxSlots} min="1" max="10" class="number-input" />
      </div>

      <div class="action-buttons">
        <button type="button" class="export-btn" on:click={exportMap}>JSONダウンロード</button>
        <button type="button" class="share-btn" on:click={shareMap}>URLで共有</button>
      </div>
    </div>

    <!-- 右側：グリッドエディタ -->
    <div class="grid-editor">
      <h2>グリッドエディタ</h2>
      <div class="instructions">
        <p>• タイルをクリック：壁/床を切り替え</p>
        <p>• 右クリック：コインを置く/消す</p>
      </div>
      <div class="grid-container" style={`--grid-size: ${gridSize}`}>
        {#each gridTiles as tile}
          {@const isStart = tile.x === startX && tile.y === startY}
          <div
            class="editor-tile ${tile.type} ${tile.coin ? "coin" : ""} ${isStart ? "start" : ""}"
            style={`--x: ${tile.x}; --y: ${tile.y}`}
            on:click={() => toggleWall(tile.x, tile.y)}
            on:contextmenu|preventDefault={() => toggleCoin(tile.x, tile.y)}
          >
            {#if isStart}
              <span class="start-marker" data-dir={startDir}>▶</span>
            {/if}
            {#if tile.coin}
              <span class="coin-marker">●</span>
            {/if}
          </div>
        {/each}
      </div>
    </div>
  </section>
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
    padding: 0.5rem 0;
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
    margin: 0;
    font-size: 1.5rem;
  }

  .editor-layout {
    display: grid;
    grid-template-columns: 280px 1fr;
    gap: 2rem;
    flex: 1;
  }

  .settings-panel {
    background: #ffffff;
    padding: 1.5rem;
    border-radius: 16px;
    box-shadow: 0 4px 20px rgba(0, 0, 0, 0.1);
    height: fit-content;
  }

  .settings-panel h2 {
    margin: 0 0 1.5rem;
    font-size: 1.2rem;
  }

  .setting-group {
    margin-bottom: 1rem;
  }

  .setting-group label {
    display: block;
    margin-bottom: 0.4rem;
    font-weight: 600;
    font-size: 0.9rem;
    color: #475569;
  }

  .text-input,
  .number-input,
  .select-input {
    width: 100%;
    padding: 0.6rem;
    border: 2px solid #e2e8f0;
    border-radius: 8px;
    font-size: 1rem;
    font-family: inherit;
  }

  .text-input:focus,
  .number-input:focus,
  .select-input:focus {
    outline: none;
    border-color: #3b82f6;
  }

  .action-buttons {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
    margin-top: 2rem;
  }

  .export-btn,
  .share-btn {
    border: none;
    border-radius: 999px;
    padding: 0.8rem 1.5rem;
    font-weight: 600;
    font-size: 1rem;
    cursor: pointer;
    transition: all 0.2s;
  }

  .export-btn {
    background: #1f6feb;
    color: #fff;
  }

  .export-btn:hover {
    background: #1a5fd8;
  }

  .share-btn {
    background: #10b981;
    color: #fff;
  }

  .share-btn:hover {
    background: #059669;
  }

  .grid-editor {
    background: #ffffff;
    padding: 1.5rem;
    border-radius: 16px;
    box-shadow: 0 4px 20px rgba(0, 0, 0, 0.1);
  }

  .grid-editor h2 {
    margin: 0 0 1rem;
    font-size: 1.2rem;
  }

  .instructions {
    background: #f1f5f9;
    padding: 0.75rem;
    border-radius: 8px;
    margin-bottom: 1rem;
    font-size: 0.9rem;
    color: #475569;
  }

  .instructions p {
    margin: 0.25rem 0;
  }

  .grid-container {
    display: grid;
    grid-template-columns: repeat(var(--grid-size), 60px);
    gap: 4px;
    justify-content: center;
    padding: 1rem;
    background: #f8fafc;
    border-radius: 8px;
  }

  .editor-tile {
    width: 60px;
    height: 60px;
    border: 2px solid #e2e8f0;
    border-radius: 8px;
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    transition: all 0.2s;
    background: #fff;
  }

  .editor-tile:hover {
    border-color: #94a3b8;
    background: #f1f5f9;
  }

  .editor-tile.wall {
    background: #3f3f46;
    border-color: #27272a;
  }

  .editor-tile.start {
    border-color: #3b82f6;
    border-width: 3px;
  }

  .start-marker {
    font-size: 1.2rem;
    color: #3b82f6;
  }

  .start-marker[data-dir="N"] {
    transform: rotate(-90deg);
  }

  .start-marker[data-dir="E"] {
    transform: rotate(0deg);
  }

  .start-marker[data-dir="S"] {
    transform: rotate(90deg);
  }

  .start-marker[data-dir="W"] {
    transform: rotate(180deg);
  }

  .coin-marker {
    font-size: 1.3rem;
    color: #f59e0b;
  }

  @media (max-width: 768px) {
    .editor-layout {
      grid-template-columns: 1fr;
    }
  }
</style>
