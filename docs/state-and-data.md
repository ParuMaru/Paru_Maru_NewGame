# B. データの保持場所（最重要）

## プレイヤー（味方）
- **保持場所**: `GameManager.party`（定義: `GameManager` コンストラクタ）。（source: game_manager.js GameManager.constructor L25-L31）
- **作成**: `new Hero/Wizard/Healer()` を `GameManager` が生成。（source: game_manager.js GameManager.constructor L25-L31）（source: entities.js Hero/Wizard/Healer L157-L186）
- **更新**: 戦闘中は `ActionExecutor` が `Entity.add_hp/add_mp` を呼び、HP/MP/バフ/デバフを更新。（source: action_executor.js ActionExecutor._executeAttack/_executeSkill L69-L260）（source: entities.js Entity.add_hp/add_mp L81-L107）
- **参照**: `BattleManager.setupBattle` が `GameManager.party` を `BattleState.party` に渡し、`runTurn` や UI が参照。（source: battle_manager.js BattleManager.setupBattle/runTurn L81-L335）

## 敵
- **保持場所**: `BattleState.enemies`（`BattleManager.setupBattle` でセット）。（source: battle_manager.js BattleManager.setupBattle L83-L121）
- **作成**: `BattleManager.setupBattle` 内で敵タイプに応じた `entities.js` の敵クラスを `new` して生成。（source: battle_manager.js BattleManager.setupBattle L85-L121）
- **更新**: `ActionExecutor` が `Entity.add_hp`、`down`、`breakGauge` を更新。（source: action_executor.js ActionExecutor._executeAttack/_applyWeaknessDown/_applyBossBreakDamage L69-L380）（source: entities.js Entity.add_hp L81-L98）
- **参照**: `BattleState.getAliveEnemies`/`BattleManager.runTurn` が参照。（source: battle_state.js BattleState.getAliveEnemies L132-L138）（source: battle_manager.js BattleManager.runTurn L195-L335）

## 所持品（インベントリ）
- **保持場所**: `GameManager.inventory`（定義: `GameManager` コンストラクタ）。（source: game_manager.js GameManager.constructor L33-L39）
- **作成**: `ItemData` を展開して初期化。（source: game_manager.js GameManager.constructor L33-L39）（source: items.js ItemData L7-L18）
- **更新**:
  - 戦闘中: `ActionExecutor._executeItem` が `item.count` を減らし効果適用。（source: action_executor.js ActionExecutor._executeItem/applyItemEffect L396-L434）
  - マップ/ステータス画面: `GameManager.useItemOnMap` が `inventory` の `count` を減算/削除。（source: game_manager.js GameManager.useItemOnMap L192-L228）
- **参照**: `UIManager.setInventory` で戦闘UIに渡され、`showItemMenu` で表示に使われる。（source: battle_manager.js BattleManager.setupBattle L81-L83）（source: ui_manager.js UIManager.setInventory/showItemMenu L148-L376）

## 進行度（マップ）
- **保持場所**: `MapManager.mapData/currentFloor/currentNodeIndex/pathHistory`。（source: map_manager.js MapManager.constructor L17-L26）
- **作成**: `MapManager.generateMap` が `mapData` を生成。（source: map_manager.js MapManager.generateMap L431-L469）
- **更新**: `MapManager.onNodeSelect` が `currentFloor/currentNodeIndex/pathHistory` を更新。（source: map_manager.js MapManager.onNodeSelect L231-L239）
- **参照**: `MapManager.render/getNodeStatus` が表示状態を決める。（source: map_manager.js MapManager.render/getNodeStatus L552-L615）

## 戦闘状態
- **保持場所**: `BattleState`（`party/enemies/turnOrder/currentRound/totalBattleAV`）。（source: battle_state.js BattleState.constructor L12-L36）
- **作成**: `BattleState` コンストラクタで初期化、`initBattleAV` で行動値を設定。（source: battle_state.js BattleState.constructor/initBattleAV L12-L55）
- **更新**: `BattleState.advanceTimeAndGetActor` が `actionValue/totalBattleAV/currentRound` を更新。（source: battle_state.js BattleState.advanceTimeAndGetActor/updateRound L71-L115）
- **参照**: `BattleManager.runTurn` が `advanceTimeAndGetActor` を使い行動者を取得。（source: battle_manager.js BattleManager.runTurn L195-L335）

## 表示状態（UI）
- **保持場所**:
  - 戦闘UI: `UIManager` の `commandContainer/turnLabel/logElement` など。（source: ui_manager.js UIManager.constructor L18-L32）
  - ステータス画面: `StatusScreen.pendingAction/activeTab/selectedIndex` など。（source: status.js StatusScreen.constructor L19-L29）
- **更新**:
  - 戦闘UI: `UIManager.showCommands/showTargetMenu` がボタン/クリックイベントを構築。（source: ui_manager.js UIManager.showCommands/showTargetMenu L176-L455）
  - ステータス画面: `StatusScreen._handleItemSelect/_handleSkillSelect` が `pendingAction` を更新。（source: status.js StatusScreen._handleItemSelect/_handleSkillSelect L601-L670）
- **参照**: `BattleManager.updateUI` がHP/MPやバフ表示を更新。（source: battle_manager.js BattleManager.updateUI L688-L783）

## レリック
- **保持場所**: `GameManager.relics`。（source: game_manager.js GameManager.constructor L41-L42）
- **作成**: 初期は空配列。報酬で `GameManager.addRelic` が追加。（source: game_manager.js GameManager.constructor/addRelic L41-L773）（source: reward_manager.js RewardManager.applyReward L416-L419）
- **更新/参照**: 戦闘開始時に `BattleManager.setupBattle` が効果を適用。（source: battle_manager.js BattleManager.setupBattle L132-L171）

## 保存データ
- **保持場所**: `localStorage` のキー `parm_rpg_save`（JSON）。（source: game_manager.js GameManager.saveGame L563-L599）
- **作成**: `GameManager.saveGame` が `party/inventory/map/relics` を保存。（source: game_manager.js GameManager.saveGame L563-L599）
- **更新/参照**: `GameManager.loadGame` が復元し `showMap` で反映。（source: game_manager.js GameManager.loadGame/showMap L615-L657）
