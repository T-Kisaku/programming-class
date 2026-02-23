<script lang="ts">
  import type { LevelDefinition } from "$lib/levels/levelSchema";
  import { goto } from "$app/navigation";

  // エディタの状態
  let gridWidth = 5;
  let gridHeight = 5;
  let gridTiles: Array<{ x: number; y: number; type: "floor" | "wall"; coin: boolean; tileColor: string }> = [];

  // タイル編集モード
  type TileEditMode = "wall" | "floor" | "coin";
  let editMode: TileEditMode = "wall";

  // タイル色
  let selectedTileColor = "none";
  const tileColors = [
    { value: "none", label: "なし", color: "#e2e8f0" },
    { value: "#3b82f6", label: "青", color: "#3b82f6" },
    { value: "#22c55e", label: "緑", color: "#22c55e" },
    { value: "#eab308", label: "黄", color: "#eab308" },
    { value: "#ef4444", label: "赤", color: "#ef4444" },
  ];

  // プレイヤーの開始位置
  let startX = 0;
  let startY = 0;
  let startDir: "N" | "E" | "S" | "W" = "E";

  // プログラム設定
  let functions: Array<{ name: string; maxSlots: number }> = [{ name: "main", maxSlots: 5 }];

  const addFunction = () => {
    const newId = functions.length + 1;
    functions = [...functions, { name: `func${newId}`, maxSlots: 5 }];
  };

  const removeFunction = (index: number) => {
    if (functions.length > 1) {
      functions = functions.filter((_, i) => i !== index);
    }
  };

  const updateFunctionName = (index: number, name: string) => {
    functions[index].name = name;
    functions = [...functions];
  };

  const updateFunctionSlots = (index: number, slots: number) => {
    functions[index].maxSlots = slots;
    functions = [...functions];
  };

  // マップ名
  let mapName = "My Map";

  // グリッド初期化
  const initGrid = () => {
    gridTiles = [];
    for (let y = 0; y < gridHeight; y++) {
      for (let x = 0; x < gridWidth; x++) {
        gridTiles.push({ x, y, type: "floor", coin: false, tileColor: "none" });
      }
    }
  };

  initGrid();

  // グリッドサイズ変更時に再初期化
  $: if (gridWidth > 0 && gridHeight > 0) {
    initGrid();
  }

  // タイルを編集
  const editTile = (x: number, y: number) => {
    const tile = gridTiles.find((t) => t.x === x && t.y === y);
    if (!tile) return;

    switch (editMode) {
      case "wall":
        tile.type = tile.type === "floor" ? "wall" : "floor";
        tile.coin = false;
        tile.tileColor = "none";
        break;
      case "floor":
        tile.type = "floor";
        tile.tileColor = selectedTileColor;
        break;
      case "coin":
        if (tile.type === "floor") {
          tile.coin = !tile.coin;
        }
        break;
    }
    // Svelteのリアクティビティをトリガーするために再代入
    gridTiles = [...gridTiles];
  };

  // 右クリックでコイン
  const toggleCoin = (x: number, y: number) => {
    const tile = gridTiles.find((t) => t.x === x && t.y === y);
    if (tile && tile.type === "floor") {
      tile.coin = !tile.coin;
      // Svelteのリアクティビティをトリガーするために再代入
      gridTiles = [...gridTiles];
    }
  };

  // マップをJSONとしてエクスポート
  const exportMap = () => {
    const level: LevelDefinition = {
      id: "custom-" + Date.now(),
      title: mapName,
      grid: {
        width: gridWidth,
        height: gridHeight,
        tiles: gridTiles.map((tile) => ({
          x: tile.x,
          y: tile.y,
          type: tile.type,
          coin: tile.coin,
          tileColor: tile.tileColor,
        })),
      },
      start: { x: startX, y: startY, dir: startDir },
      rules: {
        onOutOfBounds: "reset",
        onWallCollision: "reset",
      },
      program: {
        entry: functions[0].name,
        functions: Object.fromEntries(functions.map((f) => [f.name, { maxSlots: f.maxSlots }])),
      },
      capabilities: {
        availableCommands: ["MOVE_FORWARD", "TURN_LEFT", "TURN_RIGHT"],
        callTargets: functions.map((f) => f.name),
        availableColors: ["none", ...tileColors.map((c) => c.value).filter((c) => c !== "none")],
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
        width: gridWidth,
        height: gridHeight,
        tiles: gridTiles.map((tile) => ({
          x: tile.x,
          y: tile.y,
          type: tile.type,
          coin: tile.coin,
          tileColor: tile.tileColor,
        })),
      },
      start: { x: startX, y: startY, dir: startDir },
      rules: {
        onOutOfBounds: "reset",
        onWallCollision: "reset",
      },
      program: {
        entry: functions[0].name,
        functions: Object.fromEntries(functions.map((f) => [f.name, { maxSlots: f.maxSlots }])),
      },
      capabilities: {
        availableCommands: ["MOVE_FORWARD", "TURN_LEFT", "TURN_RIGHT"],
        callTargets: functions.map((f) => f.name),
        availableColors: ["none", ...tileColors.map((c) => c.value).filter((c) => c !== "none")],
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

  // マップを作成してテストプレイ
  const testPlay = () => {
    const level: LevelDefinition = {
      id: "test-" + Date.now(),
      title: mapName,
      grid: {
        width: gridWidth,
        height: gridHeight,
        tiles: gridTiles.map((tile) => ({
          x: tile.x,
          y: tile.y,
          type: tile.type,
          coin: tile.coin,
          tileColor: tile.tileColor,
        })),
      },
      start: { x: startX, y: startY, dir: startDir },
      rules: {
        onOutOfBounds: "reset",
        onWallCollision: "reset",
      },
      program: {
        entry: functions[0].name,
        functions: Object.fromEntries(functions.map((f) => [f.name, { maxSlots: f.maxSlots }])),
      },
      capabilities: {
        availableCommands: ["MOVE_FORWARD", "TURN_LEFT", "TURN_RIGHT"],
        callTargets: functions.map((f) => f.name),
        availableColors: ["none", ...tileColors.map((c) => c.value).filter((c) => c !== "none")],
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
    // セッションストレージにエディタに戻るためのフラグを設定
    sessionStorage.setItem("returnToEditor", "true");
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

      <div class="setting-group grid-size">
        <div>
          <label>グリッド幅</label>
          <input type="number" bind:value={gridWidth} min="3" max="15" class="number-input" />
        </div>
        <div>
          <label>グリッド高</label>
          <input type="number" bind:value={gridHeight} min="3" max="15" class="number-input" />
        </div>
      </div>

      <div class="setting-group">
        <label>開始位置 (X, Y)</label>
        <div class="pos-inputs">
          <input type="number" bind:value={startX} min="0" max={gridWidth - 1} class="number-input" />
          <input type="number" bind:value={startY} min="0" max={gridHeight - 1} class="number-input" />
        </div>
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

      <div class="divider"></div>

      <h3>タイル編集</h3>

      <div class="edit-modes">
        {#each ["wall", "floor", "coin"] as mode}
          {@const isSelected = editMode === mode}
          <button
            type="button"
            class={`edit-mode-btn ${isSelected ? "selected" : ""}`}
            on:click={() => editMode = mode}
          >
            {mode === "wall" ? "🧱" : mode === "floor" ? "🎨" : "🪙"}
            {mode === "wall" ? "壁/床" : mode === "floor" ? "床の色" : "コイン"}
          </button>
        {/each}
      </div>

      {#if editMode === "floor"}
        <div class="color-selection">
          <label>タイル色</label>
          <div class="color-options">
            {#each tileColors as color}
              {@const isSelected = selectedTileColor === color.value}
              <button
                type="button"
                class={`color-option ${isSelected ? "selected" : ""}`}
                on:click={() => selectedTileColor = color.value}
                style={`--bg-color: ${color.color}`}
              >
              </button>
            {/each}
          </div>
        </div>
      {/if}

      <div class="divider"></div>

      <h3>関数定義</h3>

      <div class="functions-list">
        {#each functions as func, index}
          <div class="function-item">
            <div class="function-header">
              <input
                type="text"
                bind:value={func.name}
                on:input={(e) => updateFunctionName(index, e.currentTarget.value)}
                class="function-name-input"
              />
              {#if functions.length > 1}
                <button
                  type="button"
                  class="remove-func-btn"
                  on:click={() => removeFunction(index)}
                >
                  ×
                </button>
              {/if}
            </div>
            <div class="function-slots">
              <label>スロット数</label>
              <input
                type="number"
                bind:value={func.maxSlots}
                min="1"
                max="10"
                on:input={(e) => updateFunctionSlots(index, parseInt(e.currentTarget.value))}
                class="slots-input"
              />
            </div>
          </div>
        {/each}
      </div>

      <button type="button" class="add-func-btn" on:click={addFunction}>
        + 関数を追加
      </button>

      <div class="divider"></div>

      <div class="action-buttons">
        <button type="button" class="test-play-btn" on:click={testPlay}>テストプレイ</button>
        <button type="button" class="export-btn" on:click={exportMap}>JSONダウンロード</button>
        <button type="button" class="share-btn" on:click={shareMap}>URLで共有</button>
      </div>
    </div>

    <!-- 右側：グリッドエディタ -->
    <div class="grid-editor">
      <h2>グリッドエディタ</h2>
      <div class="instructions">
        <p>• タイルをクリック：現在の編集モードを適用</p>
        <p>• 右クリック：コインを置く/消す</p>
        <p>• 現在のモード: <strong class="current-mode">{editMode === "wall" ? "壁/床" : editMode === "floor" ? "床の色" : "コイン"}</strong></p>
      </div>
      <div class="grid-container" style={`--grid-width: ${gridWidth}; --grid-height: ${gridHeight}`}>
        {#each gridTiles as tile}
          {@const isStart = tile.x === startX && tile.y === startY}
          <div
            class={`editor-tile ${tile.type} ${tile.coin ? "coin" : ""} ${isStart ? "start" : ""}`}
            style={tile.tileColor !== "none" ? `background-color: ${tile.tileColor}` : ""}
            on:click={() => editTile(tile.x, tile.y)}
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
    flex: 1;
  }

  .editor-layout {
    display: grid;
    grid-template-columns: 320px 1fr;
    gap: 2rem;
    flex: 1;
    min-height: 0;
  }

  .settings-panel {
    background: #ffffff;
    padding: 1.5rem;
    border-radius: 16px;
    box-shadow: 0 4px 20px rgba(0, 0, 0, 0.1);
    height: fit-content;
    overflow-y: auto;
    max-height: calc(100vh - 2rem);
  }

  .settings-panel h2,
  .settings-panel h3 {
    margin: 0 0 1rem;
    font-size: 1.1rem;
    color: #1e293b;
  }

  .settings-panel h3 {
    margin: 1.5rem 0 0.75rem;
    font-size: 1rem;
    font-weight: 600;
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
    box-sizing: border-box;
  }

  .text-input:focus,
  .number-input:focus,
  .select-input:focus {
    outline: none;
    border-color: #3b82f6;
  }

  .grid-size {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 1rem;
  }

  .grid-size > div {
    display: flex;
    flex-direction: column;
  }

  .pos-inputs {
    display: flex;
    gap: 0.5rem;
  }

  .pos-inputs input {
    flex: 1;
  }

  .divider {
    height: 1px;
    background: #e2e8f0;
    margin: 1.5rem 0;
  }

  .edit-modes {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 0.5rem;
    margin-bottom: 1rem;
  }

  .edit-mode-btn {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 0.3rem;
    padding: 0.8rem 0.5rem;
    border: 2px solid #e2e8f0;
    border-radius: 8px;
    background: #f8fafc;
    cursor: pointer;
    transition: all 0.2s;
    font-size: 0.85rem;
    font-family: inherit;
  }

  .edit-mode-btn:hover {
    border-color: #94a3b8;
    background: #f1f5f9;
  }

  .edit-mode-btn.selected {
    border-color: #3b82f6;
    background: #dbeafe;
    color: #1d4ed8;
  }

  .color-selection {
    margin-bottom: 1rem;
  }

  .color-selection label {
    margin-bottom: 0.5rem;
  }

  .color-options {
    display: flex;
    gap: 0.5rem;
    flex-wrap: wrap;
  }

  .color-option {
    width: 32px;
    height: 32px;
    border-radius: 6px;
    border: 2px solid transparent;
    cursor: pointer;
    transition: all 0.2s;
    background-color: var(--bg-color);
  }

  .color-option:hover {
    transform: scale(1.1);
  }

  .color-option.selected {
    border-color: #1e293b;
    box-shadow: 0 0 0 2px rgba(30, 41, 59, 0.3);
  }

  .functions-list {
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
    margin-bottom: 1rem;
  }

  .function-item {
    background: #f8fafc;
    border: 1px solid #e2e8f0;
    border-radius: 8px;
    padding: 0.75rem;
  }

  .function-header {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    margin-bottom: 0.5rem;
  }

  .function-name-input {
    flex: 1;
    padding: 0.4rem 0.5rem;
    border: 1px solid #e2e8f0;
    border-radius: 4px;
    font-size: 0.9rem;
  }

  .function-slots {
    display: flex;
    align-items: center;
    gap: 0.5rem;
  }

  .function-slots label {
    font-size: 0.8rem;
    color: #64748b;
    white-space: nowrap;
  }

  .slots-input {
    width: 60px;
    padding: 0.3rem 0.4rem;
    border: 1px solid #e2e8f0;
    border-radius: 4px;
    font-size: 0.9rem;
  }

  .remove-func-btn {
    border: none;
    background: #ef4444;
    color: #fff;
    width: 24px;
    height: 24px;
    border-radius: 4px;
    cursor: pointer;
    font-size: 1rem;
    line-height: 1;
  }

  .remove-func-btn:hover {
    background: #dc2626;
  }

  .add-func-btn {
    width: 100%;
    border: 2px dashed #3b82f6;
    background: transparent;
    color: #3b82f6;
    border-radius: 8px;
    padding: 0.5rem;
    cursor: pointer;
    font-weight: 600;
    transition: all 0.2s;
  }

  .add-func-btn:hover {
    background: #dbeafe;
  }

  .action-buttons {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
    margin-top: 2rem;
  }

  .export-btn,
  .share-btn,
  .test-play-btn {
    border: none;
    border-radius: 999px;
    padding: 0.8rem 1.5rem;
    font-weight: 600;
    font-size: 1rem;
    cursor: pointer;
    transition: all 0.2s;
  }

  .test-play-btn {
    background: #8b5cf6;
    color: #fff;
  }

  .test-play-btn:hover {
    background: #7c3aed;
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
    display: flex;
    flex-direction: column;
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

  .current-mode {
    color: #3b82f6;
  }

  .grid-container {
    display: grid;
    grid-template-columns: repeat(var(--grid-width), 60px);
    grid-template-rows: repeat(var(--grid-height), 60px);
    gap: 4px;
    justify-content: center;
    padding: 1rem;
    background: #f8fafc;
    border-radius: 8px;
    overflow: auto;
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
    transform: scale(1.05);
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

    .settings-panel {
      max-height: none;
    }
  }
</style>
