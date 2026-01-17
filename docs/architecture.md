# A. 起動点と初期化

## 最初に実行されるファイル/関数
- `index.html` の `<script type="module" src="main.js">` がエントリで、`main.js` の `window.onload` が最初に実行される。（source: index.html L1-L91）（source: main.js window.onload L9-L125）

## 初期化の呼び出し順
- `window.onload` → `new GameManager()` → `GameManager` コンストラクタ内で `new BattleManager()` → `new MapManager()` → `new RewardManager()` → `new StatusScreen()` → `StatusScreen.init()` → `GameManager.initMessageUI()` の順に初期化される。（source: main.js window.onload L9-L125）（source: game_manager.js GameManager.constructor L25-L58）
- 新規開始時は `window.onload` の「GAME START」クリック → `GameManager.start()` → `GameManager.showMap()` の順でマップ画面へ遷移する。（source: main.js window.onload L101-L124）（source: game_manager.js GameManager.start/showMap L270-L525）

## 画面/状態の初期値が決まる場所
- パーティ初期値（`party` 配列）は `GameManager` コンストラクタで `Hero/Wizard/Healer` を生成して確定する。（source: game_manager.js GameManager.constructor L25-L31）
- 所持品初期値（`inventory`）は `GameManager` コンストラクタで `ItemData` を展開して確定する。（source: game_manager.js GameManager.constructor L33-L39）（source: items.js ItemData L7-L18）
- レリック初期値（`relics`）は空配列として `GameManager` コンストラクタで確定する。（source: game_manager.js GameManager.constructor L41-L42）
- マップの初期位置（`currentFloor/currentNodeIndex`）は `MapManager` コンストラクタの初期値（-1）として確定し、`generateMap` 実行時に維持される。（source: map_manager.js MapManager.constructor/generateMap L17-L35）（source: map_manager.js MapManager.generateMap L431-L439）
