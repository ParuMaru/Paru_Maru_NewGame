import { BattleManager } from './battle_manager.js';
import { MapManager } from './map_manager.js';
import { RewardManager } from './reward_manager.js';
import { Hero, Wizard, Healer } from './entities.js';
import { ItemData } from './items.js';

export class GameManager {
    constructor() {
        // パーティ初期化
        this.party = [
            new Hero("勇者ぱるむ"),
            new Wizard("魔法使いはな"),
            new Healer("癒し手なつ")
        ];
        
        // インベントリ初期化
        this.inventory = {
            potion: { ...ItemData.potion },
            ether:  { ...ItemData.ether },
            phoenix:{ ...ItemData.phoenix }
        };

        // 各マネージャーの初期化
        this.battleManager = new BattleManager(this); 
        this.mapManager = new MapManager(this);       
        this.rewardManager = new RewardManager(this);
        
        this.initMessageUI();
        
        // ★重要: これがないと判定エラーになります
        this.currentEnemyType = null; 
    }

    start() {
        this.showMap();
    }
    
    initMessageUI() {
        if (document.getElementById('game-message-box')) return;
        const msgBox = document.createElement('div');
        msgBox.id = 'game-message-box';
        document.body.appendChild(msgBox);
    }

    showMessage(text) {
        const msgBox = document.getElementById('game-message-box');
        if (msgBox) {
            msgBox.innerText = text;
            msgBox.classList.add('show');
            setTimeout(() => {
                msgBox.classList.remove('show');
            }, 2000);
        }
    }

    /**
     * バトル開始処理
     * @param {string} enemyType - 敵の種類 ('slime', 'dragon' etc)
     * @param {string} bgmType - BGMの種類 ('normal', 'elite', 'boss')
     */
    startBattle(enemyType, bgmType = null) {
        this.hideAllScreens();
        
        // ★重要: 戦う敵の種類を記憶しておく（勝利時の分岐用）
        this.currentEnemyType = enemyType;
        
        // ボス戦（ドラゴン）の時だけ背景を変える
        const canvasArea = document.getElementById('canvas-area');
        if (enemyType === 'dragon') {
            
            canvasArea.style.backgroundImage = "linear-gradient(rgba(0, 0, 0, 0.1), rgba(0, 0, 0, 0.1)), url('./resource/boss_bg.png')";
        } else {
            canvasArea.style.backgroundImage = "url('./resource/bg.png')"; 
        }
        
        document.getElementById('game-wrapper').style.display = 'flex';
        this.battleManager.setupBattle(this.party, this.inventory, enemyType, bgmType);
    }

    /**
     * バトル勝利時の処理（BattleManagerから呼ばれる）
     */
    onBattleWin() {
        console.log("バトル勝利！ 敵タイプ:", this.currentEnemyType);
        
        const overlay = document.getElementById('result-overlay');
        
        // ★分岐: ドラゴン（ラスボス）を倒した場合はクリア画面へ
        if (this.currentEnemyType === 'dragon') {
            setTimeout(() => {
                if (overlay) overlay.style.display = 'none';
                this.showGameClear();
            }, 1000);
        } else {
            // 通常の勝利なら報酬画面へ
            setTimeout(() => {
                if (overlay) overlay.style.display = 'none';
                
                // 1. マップを裏で表示（BGM再生なども含む）
                this.showMap();
                
                // 2. その上に報酬画面を表示
                if (this.rewardManager) {
                    this.rewardManager.showRewards();
                } else {
                    console.error("RewardManagerが見つかりません");
                }
            }, 1000);
        }
    }
    
    /**
     * ゲームクリア画面の表示
     */
    showGameClear() {
        this.hideAllScreens(); // 他の画面を消す

        // エンディング画面を取得、なければ作る
        let endingScreen = document.getElementById('ending-screen');
        if (!endingScreen) {
            endingScreen = document.createElement('div');
            endingScreen.id = 'ending-screen';
            const catImages = [
                './resource/cat_reward1.png',
                './resource/cat_reward2.png',
                './resource/cat_reward3.png'
            ];

            // ★追加：ループ処理で画像のHTMLを生成
            // mapを使って画像タグの配列を作り、join('')で連結して一つの文字列にします
            const catImagesHTML = catImages.map((src, index) => {
                 // style="animation-delay: ...s" で、1枚ずつずらして表示させる
                return `<img src="${src}" class="ending-cat-img" alt="ご褒美にゃんこ${index + 1}" style="animation-delay: ${1 + index * 0.5}s">`;
            }).join('');

            endingScreen.innerHTML = `
                <div class="ending-title">GAME CLEAR!</div>
                <div class="ending-msg">
                    伝説のアイスドラゴンを討伐し<br>
                    世界の平和は守られた！<br>
                    <br>
                    勇者たちの冒険はこれからも続く...
                </div>

                <div class="ending-cat-container">
                    ${catImagesHTML} </div>
                
                
                <div class="ending-thanks">Thank you for playing!</div>
                <br><br>
                <button id="title-return-btn" class="start-btn">タイトルへ戻る</button>
            `;
            document.body.appendChild(endingScreen);
            
            // タイトルに戻るボタン（リロード）
            const btn = document.getElementById('title-return-btn');
            if(btn) btn.onclick = () => location.reload();
        }
        
        endingScreen.style.display = 'flex';
    }
    
    /**
     * マップ画面を表示
     */
    showMap() {
        this.hideAllScreens();
        
        // マップ再描画
        if (this.mapManager) {
            this.mapManager.render();
        }
        
        const mapScreen = document.getElementById('map-screen');
        if (mapScreen) mapScreen.style.display = 'flex';

        // マップBGM再生
        if (this.battleManager && this.battleManager.bgm) {
            this.battleManager.bgm.initContext();
            this.battleManager.bgm.playBGM('map');
        }
    }

    /**
     * 報酬選択完了時の処理（RewardManagerから呼ばれる）
     */
    onRewardSelected() {
        if (this.rewardManager) this.rewardManager.hide();
        // 報酬画面を閉じれば、後ろにあるマップが見える状態になる
    }

    onGameOver() {
        console.log("全滅...");
        // ゲームオーバー時は3秒後にタイトルへ戻る
        setTimeout(() => location.reload(), 3000);
    }

    hideAllScreens() {
        const screens = ['game-wrapper', 'map-screen', 'reward-screen', 'ending-screen'];
        screens.forEach(id => {
            const el = document.getElementById(id);
            if(el) el.style.display = 'none';
        });
    }
}