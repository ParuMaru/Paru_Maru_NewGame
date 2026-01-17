# C. 主要フローの呼び出し順（関数の動きが分かる形）

## ゲーム開始（新規開始）
- `window.onload` → `new GameManager()` →（開始ボタン押下）`GameManager.start()` → `GameManager.showMap()`。（source: main.js window.onload L9-L124）（source: game_manager.js GameManager.start/showMap L270-L525）

## メニューを開く/閉じる（ステータス画面）
- 開く: `MapManager.initUI` の「ステータス」ボタン → `GameManager.openStatusScreen()` → `StatusScreen.open()`。（source: map_manager.js MapManager.initUI L65-L75）（source: game_manager.js GameManager.openStatusScreen L61-L67）（source: status.js StatusScreen.open L149-L159）
- 閉じる: `StatusScreen` の×ボタン/背景クリック/Escape → `StatusScreen.close()`。（source: status.js StatusScreen.init/open/close L37-L170）

## 戦闘開始 → コマンド選択 → ダメージ計算 → ターン終了 → 戦闘終了
- 戦闘開始: `MapManager.onNodeSelect` → `GameManager.startBattle()` → `BattleManager.setupBattle()` → `BattleManager.runTurn()`。（source: map_manager.js MapManager.onNodeSelect L242-L253）（source: game_manager.js GameManager.startBattle L316-L337）（source: battle_manager.js BattleManager.setupBattle/runTurn L66-L335）
- コマンド選択: `BattleManager.runTurn()` → `UIManager.showCommands()` → `BattleManager.handlePlayerAction()`。（source: battle_manager.js BattleManager.runTurn/showCommandMenu/handlePlayerAction L195-L541）（source: ui_manager.js UIManager.showCommands L176-L214）
- ダメージ計算/適用: `BattleManager._startExecute()` → `ActionExecutor.execute()` → `ActionExecutor._executeAttack/_executeSkill` → `BattleCalculator.calculateDamage`（未確認: 計算詳細は `battle_calculator.js` に定義されているが、このファイルの挙動までは追跡していない）。（source: battle_manager.js BattleManager._startExecute L792-L826）（source: action_executor.js ActionExecutor.execute/_executeAttack/_executeSkill L48-L200）
- ターン終了: `BattleManager._startExecute()` → `BattleManager.handleAllOutChance()` → `BattleManager.processTurnEnd()` → `BattleManager.nextTurn()` → `BattleManager.runTurn()`。（source: battle_manager.js BattleManager._startExecute/handleAllOutChance/processTurnEnd/nextTurn/runTurn L792-L905）
- 戦闘終了: `BattleManager.processEndGame()` → 勝利なら `GameManager.onBattleWin()` / 敗北なら結果UI表示。（source: battle_manager.js BattleManager.processEndGame L982-L1040）（source: game_manager.js GameManager.onBattleWin L343-L373）

## セーブ/ロード
- セーブ: `MapManager.initUI` の「セーブ」ボタン → `GameManager.saveGame()` → `localStorage.setItem('parm_rpg_save', JSON)`。（source: map_manager.js MapManager.initUI L78-L89）（source: game_manager.js GameManager.saveGame L563-L599）
- ロード: タイトル画面「CONTINUE」 → `GameManager.loadGame()` → `GameManager.showMap()`。（source: main.js window.onload L72-L97）（source: game_manager.js GameManager.loadGame/showMap L615-L657）
