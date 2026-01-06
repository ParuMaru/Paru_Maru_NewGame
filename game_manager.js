import { BattleManager } from './battle_manager.js';
import { MapManager } from './map_manager.js';
import { RewardManager } from './reward_manager.js';
import { Hero, Wizard, Healer } from './entities.js';
import { ItemData } from './items.js';
import { DebugManager } from './debug_manager.js';

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
        this.debugManager = new DebugManager(this);
        
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
            canvasArea.style.backgroundImage = "linear-gradient(rgba(0, 0, 0, 0.1), rgba(0, 0, 0, 0.1)), url('./resource/boss_bg.jpg')";
        } else if (enemyType === 'shadow') {
            // ★追加: 影バトルの時は暗い雰囲気を付与
            canvasArea.classList.add('dark-atmosphere');
            canvasArea.style.backgroundImage = "url('./resource/dark_bg.jpg')"; // 一旦元の背景
        } else {
            canvasArea.classList.remove('dark-atmosphere'); // 通常時は外す
            canvasArea.style.backgroundImage = "url('./resource/bg.jpg')"; 
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
        this.hideAllScreens(); 

        // エンディングBGMを再生する
        if (this.battleManager && this.battleManager.bgm) {
            this.battleManager.bgm.playBGM('ending');
        }

        let endingScreen = document.getElementById('ending-screen');
        if (!endingScreen) {
            endingScreen = document.createElement('div');
            endingScreen.id = 'ending-screen';

            // 猫画像のファイル名リスト
            const catImages = [
                './resource/cat_reward1.jpg', 
                './resource/cat_reward2.jpg', 
                './resource/cat_reward3.jpg'
            ];

            // 画像タグを生成
            const catImagesHTML = catImages.map((src, index) => {
                const delay = 1.5 + (index * 0.5);
                // class に "clickable-cat" を追加して後で特定しやすくする
                return `<img src="${src}" class="ending-cat-img clickable-cat" alt="猫画像${index}" style="animation-delay: ${delay}s;">`;
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
                    ${catImagesHTML}
                </div>
                <p style="font-size:12px; color:#bdc3c7;">（画像をクリックすると拡大します）</p>

                <div class="ending-thanks">Thank you for playing!</div>
                <br><br>
                <button id="title-return-btn" class="start-btn">タイトルへ戻る</button>

                <div id="cat-modal" class="image-modal-overlay">
                    <span class="close-modal">&times;</span>
                    <img class="modal-content" id="expanded-cat-img" src="">
                </div>
            `;
            document.body.appendChild(endingScreen);
            
            // タイトルへ戻るボタンの設定
            const btn = document.getElementById('title-return-btn');
            if(btn) btn.onclick = () => location.reload();

            // ★追加：画像クリックでの拡大表示処理を設定
            this.setupImageModal(endingScreen);
        }
        
        endingScreen.style.display = 'flex';
    }
    
    /**
     * ★追加：画像の拡大表示モーダルのイベント設定
     */
    setupImageModal(screenElement) {
        const modal = screenElement.querySelector('#cat-modal');
        const modalImg = screenElement.querySelector('#expanded-cat-img');
        const closeBtn = screenElement.querySelector('.close-modal');
        const catImgs = screenElement.querySelectorAll('.clickable-cat');

        // 各猫画像にクリックイベントを設定
        catImgs.forEach(img => {
            img.addEventListener('click', function() {
                modal.style.display = "flex"; // モーダルを表示
                modalImg.src = this.src;      // クリックした画像のURLをセット
                modalImg.alt = this.alt;
            });
        });

        // 閉じるボタン（×）のクリックイベント
        closeBtn.addEventListener('click', () => {
            modal.style.display = "none";
        });

        // モーダルの背景部分をクリックしても閉じるようにする
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                modal.style.display = "none";
            }
        });
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