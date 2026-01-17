# D. 分かりにくい関数・危ない境界

## 意味が読み取りづらい/役割が広い関数
- `BattleManager.runTurn`: 1ターン内で分裂チェック、影合体、勝敗判定、状態異常処理、コマンド表示までを含み責務が大きい。（source: battle_manager.js BattleManager.runTurn L195-L335）
- `BattleManager.processEndGame`: 勝敗判定、演出、結果UI構築、ボタン生成まで担当し、画面遷移まで含むため境界が広い。（source: battle_manager.js BattleManager.processEndGame L982-L1040）

## 引数/戻り値の意図が曖昧な箇所
- `BattleManager.nextTurn(actor)`: 引数 `actor` があるが内部では `this.currentActor` を使っており、引数の意図が曖昧。（source: battle_manager.js BattleManager.nextTurn L656-L684）
- `GameManager.useItemOnMap(itemId, targetIndex)`: `targetIndex` の扱いが `targetType` によって変わり、`all/self/single` で挙動が分岐する。（source: game_manager.js GameManager.useItemOnMap L185-L233）

## 同じ種類のデータを複数箇所で保持
- **パーティ**: `GameManager.party` と `BattleState.party` が同一参照として二重に保持される前提。（source: game_manager.js GameManager.constructor/startBattle L25-L337）（source: battle_manager.js BattleManager.setupBattle L81-L127）
- **インベントリ**: `GameManager.inventory` と `UIManager.inventory` が別参照で保持されるため、同期タイミングに依存。（source: game_manager.js GameManager.constructor L33-L39）（source: ui_manager.js UIManager.setInventory L148-L153）
- **敵リスト**: `BattleState.enemies` と `ActionExecutor.enemies` が別参照で保持され、`setupBattle` で同期している。（source: battle_manager.js BattleManager.setupBattle L83-L127）（source: action_executor.js ActionExecutor.constructor L16-L31）

## グローバル/モジュールスコープの共有データ
- `ItemData`/`SkillData`/`RelicData` はモジュールスコープの静的データとして共有される。（source: items.js ItemData L7-L18）（source: skills.js SkillData L7-L55）（source: relics.js RelicData L6-L40）

## 未確認
- ダメージ計算の詳細ロジックは `BattleCalculator.calculateDamage` に依存しているが、この関数の定義ファイル（`battle_calculator.js`）の詳細挙動は未確認。（source: action_executor.js ActionExecutor._executeAttack/_executeSkill L69-L200）
