# レベル JSON の Zod スキーマ設計

## 目的

`docs/features.md` のレベル JSON 仕様を TypeScript 側で厳密に検証できるようにするため、
Zod のスキーマと cross-field バリデーションを用意した。
起動時に fail-fast し、エラー理由を明確に返すことを重視している。

## 実装の要点

- **単項バリデーション**
  - `grid.width` や `program.entry` などの必須値を Zod の基本バリデーションで保証する。
  - それぞれの項目に日本語のメッセージを付け、JSON 作成者が問題を特定しやすくした。

- **cross-field バリデーション**
  - `program.entry` が `program.functions` のキーに存在することを検証。
  - `capabilities.callTargets` が `program.functions` の範囲内であることを検証。
  - `capabilities.availableColors` に `none` を必須とし、命令色とタイル色の基準が崩れないようにした。
  - `grid.tiles` の座標重複と範囲外座標を検出し、ステージ生成ミスを早期に発見できるようにした。

## 設計理由

- `program.entry` や `callTargets` は **構成間の整合性** が重要であり、
  単純な型チェックだけでは不整合を検出できない。
  そのため `superRefine` で cross-field の検証を追加している。
- `tileColor` と `availableColors` の整合性もレベル JSON の編集ミスが起きやすいポイントなので、
  スキーマ側で範囲チェックを行う。
- エラーメッセージは JSON 制作時の修正コストを下げるため、
  **どのキーがどの条件を満たしていないかを明示する**表現に統一した。
