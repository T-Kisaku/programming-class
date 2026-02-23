# アーキテクチャ概要

## システム構成

```
┌─────────────────────────────────────────────────────────────────┐
│                         SvelteKit App                            │
├─────────────────────────────────────────────────────────────────┤
│                                                                   │
│  ┌──────────────────┐         ┌──────────────────┐              │
│  │   / (Main Page)  │         │  /editor (Editor)│              │
│  │                  │◄────────┤                  │              │
│  │  - Level Play    │         │  - Level Design  │              │
│  │  - URL Loading   │         │  - Share URL     │              │
│  └────────┬─────────┘         └────────┬─────────┘              │
│           │                           │                          │
│           │                           │                          │
│  ┌────────▼───────────────────────────▼────────┐                 │
│  │           src/lib/ (Shared Logic)           │                 │
│  ├─────────────────────────────────────────────┤                 │
│  │  - game/gameLogic.ts   (Pure Functions)    │                 │
│  │  - state/gameState.ts  (Game Store)         │                 │
│  │  - levels/levelSchema.ts (Zod Schema)      │                 │
│  │  - editor/ (New)                          │                 │
│  │    - editorStore.ts    (Editor State)      │                 │
│  │    - urlEncoding.ts   (URL Encoding)       │                 │
│  │    - tileTools.ts      (Tile Helpers)      │                 │
│  └─────────────────────────────────────────────┘                 │
│                                                                   │
│  ┌─────────────────────────────────────────────┐                 │
│  │          src/lib/game/types.ts               │                 │
│  │  (Shared Types)                              │                 │
│  └─────────────────────────────────────────────┘                 │
│                                                                   │
└─────────────────────────────────────────────────────────────────┘
```

---

## モジュール構成

### 既存モジュール

#### `src/lib/game/gameLogic.ts`
**責務:** ゲームの純粋関数ロジック

**主な関数:**
- `createLevelRuntime()`: レベル実行環境の作成
- `createEmptyProgram()`: 空プログラムの作成
- `createIdleRuntimeState()`: 待機状態の作成
- `startRuntimeState()`: 実行開始
- `stepRuntimeState()`: 1ステップ実行

**特性:**
- 純粋関数（副作用なし）
- 入力: `LevelDefinition`, `Program`, `RuntimeState`
- 出力: 新しい `RuntimeState`

#### `src/lib/levels/levelSchema.ts`
**責務:** レベル定義のスキーマ定義と検証

**Zod スキーマ:**
- `tileSchema`: タイル定義
- `functionSchema`: 関数定義
- `levelSchema`: 完全なレベル定義

**特性:**
- 型安全なデータ検証
- クロスフィールドバリデーション

#### `src/lib/state/gameState.ts`
**責務:** ゲーム状態の管理

**主なメソッド:**
- `start()`: ゲーム開始
- `step()`: 1ステップ進める
- `stop()`: ゲーム停止
- `resetRuntime()`: ランタイムリセット
- `setCommand()`: コマンド設定

---

### 新規モジュール

#### `src/lib/editor/editorStore.ts`
**責務:** エディタ状態の管理

**状態:**
```typescript
type EditorState = {
  level: LevelDefinition;
  selectedTool: EditorTool;
  selectedColor: string;
}
```

**メソッド:**
- `updateTile(x, y, updates)`: タイルの更新
- `updateStart(x, y, dir)`: 開始位置の更新
- `setGridDimensions(width, height)`: グリッドサイズの変更
- `setTitle(title)`: タイトルの設定
- `setSelectedTool(tool)`: 選択ツールの変更

**ツールタイプ:**
```typescript
type EditorTool = "floor" | "wall" | "coin" | "start" | "eraser";
```

#### `src/lib/editor/urlEncoding.ts`
**責務:** レベル定義の URL エンコード/デコード

**関数:**
- `encodeLevel(level: LevelDefinition): string`
  - JSON 文字列化
  - Base64 エンコード
  - URL エンコード

- `decodeLevel(encoded: string): LevelDefinition`
  - URL デコード
  - Base64 デコード
  - JSON パース
  - Zod スキーマ検証

#### `src/lib/editor/tileTools.ts`
**責務:** タイル操作のユーティリティ関数

**関数:**
- `createDefaultTile(x, y)`: デフォルトタイルの作成
- `getTileAt(level, x, y)`: 座標からタイルを取得
- `isValidPosition(level, x, y)`: 有効な座標か判定
- `addTile(level, tile)`: タイルを追加
- `removeTile(level, x, y)`: タイルを削除

---

## UI コンポーネント階層

### メインページ (`src/routes/+page.svelte`)

```
+page.svelte
├── Header (Level Title, Controls)
├── Game Board
│   └── Grid
│       └── Tiles
│           ├── Floor/Wall
│           ├── Coin
│           └── Player
└── Side Panel
    ├── Status Display
    └── Program Display
```

### エディタページ (`src/routes/editor/+page.svelte`)

```
editor/+page.svelte
├── Header
│   ├── Title Input
│   └── Back to Game Link
├── Toolbar (Toolbar.svelte)
│   ├── Tile Tools (Floor, Wall, Coin, Eraser)
│   ├── Start Position Tool
│   └── Color Picker
├── Grid Editor (GridEditor.svelte)
│   └── Editable Grid
├── Level Properties (LevelProperties.svelte)
│   ├── Grid Size Inputs
│   ├── Start Direction Select
│   └── Function Slots Configuration
└── Share URL (ShareURL.svelte)
    ├── Generated URL Display
    └── Copy Button
```

---

## データフロー

### ゲームプレイフロー

```
URL (Query Parameter)
        ↓
[decodeLevel()]
        ↓
LevelDefinition
        ↓
[createGameStateStore()]
        ↓
GameState Store
        ↓
Game UI Updates
        ↓
User Commands
        ↓
[stepRuntimeState()]
        ↓
New Runtime State
```

### レベル作成フロー

```
Editor Actions (Click, Drag)
        ↓
Editor Store Updates
        ↓
LevelDefinition Mutations
        ↓
[encodeLevel()]
        ↓
Shared URL
        ↓
Copy/Share
```

---

## 再利用可能なコード

### ゲームロジック

- `src/lib/game/gameLogic.ts` の純粋関数群
- エディタで作成したレベルはそのまま使用可能
- 追加の改変不要

### タイプ定義

- `src/lib/game/types.ts` の型定義
- `src/lib/levels/levelSchema.ts` の `LevelDefinition`
- エディタとゲームで共有

### UI パターン

- `src/routes/+page.svelte` のグリッドレンダリング
- CSS グリッドシステムとタイルクラス
- エディタでも同様のスタイルを使用

---

## 状態管理戦略

### 2つのストア

1. **Game Store (`gameState.ts`)**
   - ゲームプレイ中の状態管理
   - ランタイム、プログラム、ステータス

2. **Editor Store (`editorStore.ts`)**
   - レベル作成中の状態管理
   - レベル定義、選択ツール、編集モード

### ストア間の連携

```
Editor → [LevelDefinition] → Game
      (保存/共有)           (ロード/プレイ)
```

---

## スキーマ構造

### LevelDefinition

```typescript
{
  id: string;              // 一意のID
  title: string;          // レベルタイトル
  grid: {
    width: number;        // グリッド幅
    height: number;       // グリッド高さ
    tiles: Array<{        // タイル配列
      x: number;
      y: number;
      type: "floor" | "wall";
      tileColor: string;
      coin?: boolean;
    }>;
  };
  start: {
    x: number;
    y: number;
    dir: "N" | "E" | "S" | "W";
  };
  rules: {
    onOutOfBounds: "reset";
    onWallCollision: "stay" | "reset";
  };
  program: {
    entry: string;
    functions: Record<string, { maxSlots: number }>;
  };
  capabilities: {
    availableCommands: CommandType[];
    callTargets: string[];
    availableColors: string[];
    colorRule: "matchTileColor" | "allowAllOnNone";
  };
  strings: {
    success: string;
    failExecuted: string;
  };
}
```

---

## 拡張ポイント

### 将来的な拡張

1. **バックエンド統合**
   - データベースへのレベル保存
   - ユーザー認証
   - コミュニティ機能

2. **詳細なエディタ機能**
   - プログラム編集UI
   - テストプレイ機能
   - インポート/エクスポート

3. **高度な機能**
   - レベルのバリデーション（解決可能かチェック）
   - 自動生成されるレベル
   - AIによる難易度推定

---

## 技術スタック

### フロントエンド
- **SvelteKit**: Web アプリケーションフレームワーク
- **Svelte**: UI コンポーネント
- **TypeScript**: 型安全

### 開発環境
- **Vite**: 開発サーバー
- **Tailwind CSS**: CSS フレームワーク（オプション）

### データ検証
- **Zod**: スキーマ検証ライブラリ

### パッケージ管理
- **npm**: 依存関係管理
- **Node.js**: ランタイム

---

## セキュリティ考慮事項

### URL からのデータロード

- Zod スキーマによる厳密な検証
- 不正なデータの拒絶
- エラーハンドリング

### XSS 防止

- Svelte の自動エスケープ
- ユーザー入力の適切なサニタイズ

---

## パフォーマンス考慮事項

### グリッドレンダリング

- 適切なグリッドサイズ制限
- 不要な再描画の回避

### URL 長さ

- 大きなレベルの圧縮
- URL 長さの上限チェック

---

## テスト戦略

### ユニットテスト

- ゲームロジック関数のテスト
- URL エンコード/デコードのテスト

### 統合テスト

- エディタ → ゲームのフロー
- URL 共有 → ロードのフロー
