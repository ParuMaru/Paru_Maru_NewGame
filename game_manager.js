import { BattleManager } from './battle_manager.js';
import { MapManager } from './map_manager.js';
import { RewardManager } from './reward_manager.js';
import { Hero, Wizard, Healer } from './entities.js';
import { ItemData } from './items.js';

export class GameManager {
    constructor() {
        // ゲーム全体で共有するパーティデータ
        this.party = [
            new Hero("勇者ぱるむ"),
            new Wizard("魔法使いはな"),
            new Healer("癒し手なつ")
        ];
        
        // アイテム所持数（ここも一元管理）
        this.inventory = {
            potion: { ...ItemData.potion },
            ether:  { ...ItemData.ether },
            phoenix:{ ...ItemData.phoenix }
        };

        this.battleManager = new BattleManager(this); // 自分(GameManager)を渡す
        this.mapManager = new MapManager(this);       // 自分(GameManager)を渡す
        this.rewardManager = new RewardManager(this);
        this.initMessageUI();
    }

    /**
     * ゲーム起動
     */
    start() {
        // 最初はマップ画面からスタート
        this.showMap();
    }
    
    /**
     * メッセージ表示用のUIを初期化
     */
    initMessageUI() {
        // すでに存在していれば作らない
        if (document.getElementById('game-message-box')) {
            this.msgBox = document.getElementById('game-message-box');
            return;
        }

        this.msgBox = document.createElement('div');
        this.msgBox.id = 'game-message-box';
        document.body.appendChild(this.msgBox);
    }
    /**
     * ゲーム内メッセージを表示（アラートの代わり）
     */
    showMessage(text) {
        this.msgBox.innerText = text;
        this.msgBox.classList.add('show');
        
        // 2秒後に消す
        setTimeout(() => {
            this.msgBox.classList.remove('show');
        }, 2000);
    }

    /**
     * マップ画面を表示
     */
    showMap() {
        this.hideAllScreens();
        this.mapManager.render();
        document.getElementById('map-screen').style.display = 'flex';
        
        if (this.battleManager && this.battleManager.bgm) {
            this.battleManager.bgm.initContext();
            this.battleManager.bgm.playBGM('map');
        }
    }

    /**
     * バトル画面を表示して開始
     * @param {string} enemyType - 敵の種類
     * @param {string} bgmType - 'normal', 'elite', 'boss' (省略可)
     */
    startBattle(enemyType, bgmType = null) {
        this.hideAllScreens();
        document.getElementById('game-wrapper').style.display = 'flex';
        
        // bgmTypeをBattleManagerにそのまま渡す
        this.battleManager.setupBattle(this.party, this.inventory, enemyType, bgmType);
    }

    /**
     * バトル勝利時の処理（BattleManagerから呼ばれる）
     */
    onBattleWin() {
        console.log("バトル勝利！マップに戻ります");
        // 少し待ってからマップへ
        setTimeout(() => {
            document.getElementById('result-overlay').style.display = 'none';
            this.showMap();
            this.rewardManager.showRewards();
        }, 1000);
    }
    
    onRewardSelected() {
        this.rewardManager.hide();
        this.showMap();
    }

    /**
     * ゲームオーバー時の処理
     */
    onGameOver() {
        console.log("全滅...");
        // リロードして最初から（またはタイトルへ）
        setTimeout(() => location.reload(), 3000);
    }

    hideAllScreens() {
        // バトル画面を隠す
        const battleScreen = document.getElementById('game-wrapper');
        if(battleScreen) battleScreen.style.display = 'none';
        
        // マップ画面を隠す
        const mapScreen = document.getElementById('map-screen');
        if(mapScreen) mapScreen.style.display = 'none';
        
        // スタート画面も隠す
        const startScreen = document.getElementById('start-overlay');
        if(startScreen) startScreen.style.display = 'none';
        
        // 報酬画面も隠す
        if(this.rewardManager) this.rewardManager.hide();
    }
}