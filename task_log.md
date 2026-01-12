# タスクログ

## 弱点→ダウン→総攻撃の追加（調査・設計メモ）
- 主要変更候補:
  - 戦闘進行/行動順: `battle_manager.js`, `battle_state.js`
  - ダメージ/スキル処理: `action_executor.js`, `battle_calculator.js`, `skills.js`
  - 敵/味方データ: `entities.js`
  - コマンドUI/敵表示: `ui_manager.js`, `CSS/battle.css`
- 行動順の内部表現: `actionValue`（`10000 / spd`、`battle_state.js`の`advanceTimeAndGetActor`で減算）
- 雑魚敵データ: `entities.js`（`cragen`, `Goblin` など）
- 実装方針メモ:
  - 攻撃タグ/弱点タグを追加し、命中後に弱点一致で`down`付与 + `actionValue`遅延
  - `downUsed`で同一行動サイクル中の再ダウンを抑制
  - 敵手番で`down`解除（攻撃せずにターン終了）
  - 全敵ダウン時に「総攻撃」をコマンドに表示
