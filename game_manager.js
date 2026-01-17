///
/// 役割: 戦闘・マップ・報酬などゲーム全体の画面/状態遷移を統括するハブ。
/// 入出力: BattleManager/MapManager/RewardManagerを生成し、DOMとローカル保存を操作する。
/// 関連: battle_manager.js, map_manager.js, reward_manager.js, ui_manager.js
///
import { BattleManager } from './battle_manager.js';
import { MapManager } from './map_manager.js';
import { RewardManager } from './reward_manager.js';
import { Hero, Wizard, Healer } from './entities.js';
import { ItemData } from './items.js';
import { DebugManager } from './debug_manager.js';
import { RelicData } from './relics.js';
import { SkillData } from './skills.js';
import { StatusScreen } from './status.js';

/**
 * ゲーム全体の流れと画面切替を管理する。
 * @class
 */
export class GameManager {
    /**
     * 初期パーティ/所持品/各マネージャーを構築する。
     * 副作用: DOMにメッセージUIを追加し、StatusScreenを初期化する。
     */
    constructor() {
        // パーティ初期化
        this.party = [
            new Hero("ぱるむ"),
            new Wizard("はな"),
            new Healer("なつ")
        ];
        
        // インベントリ初期化
        this.inventory = {
            potion: { ...ItemData.potion },
            ether:  { ...ItemData.ether },
            phoenix:{ ...ItemData.phoenix },
            elixir: { ...ItemData.elixir }
        };
        
        // ★追加: 獲得したレリックIDリスト
        this.relics = [];
        
        // テスト用：最初から1個持たせてみるならここに追加
        //this.addRelic("vampire_cape");

        // 各マネージャーの初期化
        this.battleManager = new BattleManager(this); 
        this.mapManager = new MapManager(this);       
        this.rewardManager = new RewardManager(this);
        this.debugManager = new DebugManager(this);
        this.statusScreen = new StatusScreen(this);
        this.statusScreen.init();
        
        this.initMessageUI();
        
        // ★重要: これがないと判定エラーになります
        this.currentEnemyType = null; 
    }

    /**
     * ステータス画面を開く。
     * 副作用: UI表示を変更する。
     */
    openStatusScreen() {
        this.statusScreen?.open();
    }

    /**
     * ステータス画面を閉じる。
     * 副作用: UI表示を変更する。
     */
    closeStatusScreen() {
        this.statusScreen?.close();
    }

    /**
     * アイテムの対象種別を推定する。
     * @param {object} item - アイテム定義。
     * @returns {'all'|'self'|'single'} 対象種別。
     * @private
     */
    _getItemTargetType(item) {
        if (item?.target === 'all' || item?.scope === 'all' || item?.targetType === 'all') return 'all';
        if (item?.target === 'self') return 'self';
        return 'single';
    }

    /**
     * マップ上で選択可能な対象一覧を返す。
     * @param {object} item - アイテム定義。
     * @returns {Array} 対象キャラ配列。
     * @private
     */
    _getItemMapTargets(item) {
        const party = Array.isArray(this.party) ? this.party : [];
        const alive = party.filter(m => (typeof m?.is_alive === 'function') ? m.is_alive() : !m?.is_dead);
        const dead = party.filter(m => (typeof m?.is_alive === 'function') ? !m.is_alive() : !!m?.is_dead);

        if (item?.id === 'phoenix' || item?.type === 'revive') return dead;
        if (item?.id === 'elixir') {
            return alive.filter(m => m.hp < m.max_hp || m.mp < m.max_mp);
        }
        if (item?.type === 'hp_heal') return alive.filter(m => m.hp < m.max_hp);
        if (item?.type === 'mp_heal') return alive.filter(m => m.mp < m.max_mp);
        return alive;
    }

    /**
     * マップ上でアイテム使用可否と対象を算出する。
     * @param {string} itemId - アイテムID。
     * @returns {{item: object|null, targets: Array, targetType: string}} 判定結果。
     */
    getItemMapInfo(itemId) {
        const invData = this.inventory?.[itemId];
        if (!invData) return { item: null, targets: [], targetType: 'single' };
        const base = ItemData?.[itemId] || { id: itemId };
        const item = { id: itemId, ...base, ...invData };
        const targetType = this._getItemTargetType(item);
        const targets = this._getItemMapTargets(item);
        return { item, targets, targetType };
    }

    /**
     * スキルの対象種別を推定する。
     * @param {object} skill - スキル定義。
     * @returns {'all'|'self'|'single'} 対象種別。
     * @private
     */
    _getSkillTargetType(skill) {
        if (skill?.target === 'all') return 'all';
        if (skill?.target === 'self') return 'self';
        return 'single';
    }

    /**
     * マップ上でのスキル対象候補を計算する。
     * @param {object} actor - 行動者。
     * @param {object} skill - スキル定義。
     * @returns {Array} 対象候補。
     * @private
     */
    _getSkillMapTargets(actor, skill) {
        const party = Array.isArray(this.party) ? this.party : [];
        const alive = party.filter(m => (typeof m?.is_alive === 'function') ? m.is_alive() : !m?.is_dead);
        const dead = party.filter(m => (typeof m?.is_alive === 'function') ? !m.is_alive() : !!m?.is_dead);

        switch (skill?.type) {
            case 'res':
                return dead;
            case 'heal':
                return alive.filter(m => m.hp < m.max_hp);
            case 'mp_recovery':
                if (!actor) return [];
                return actor.mp < actor.max_mp ? [actor] : [];
            case 'regen':
                return alive;
            default:
                return [];
        }
    }

    /**
     * マップ上でのスキル使用可否と対象を算出する。
     * @param {number} actorIndex - 行動者インデックス。
     * @param {string} skillId - スキルID。
     * @returns {{actor: object|null, skill: object|null, targets: Array, targetType: string, usable: boolean, reason: string, mpCost: number}}
     */
    getSkillMapInfo(actorIndex, skillId) {
        const actor = this.party?.[actorIndex];
        const skill = typeof skillId === 'string' ? SkillData?.[skillId] : skillId;
        if (!actor || !skill) {
            return { actor: null, skill: null, targets: [], targetType: 'single', usable: false, reason: '使用不可' };
        }

        const targetType = this._getSkillTargetType(skill);
        const targets = this._getSkillMapTargets(actor, skill);
        const mpCost = Number.isFinite(Number(skill.cost)) ? Number(skill.cost) : 0;
        const hasMp = actor.mp >= mpCost;
        const usable = hasMp && targets.length > 0;
        const reason = !hasMp ? 'MP不足' : '対象がいません';
        return { actor, skill, targets, targetType, usable, reason };
    }

    /**
     * マップ画面でアイテムを使用する。
     * @param {string} itemId - アイテムID。
     * @param {number} targetIndex - 対象インデックス。
     * @returns {{success: boolean, message: string}} 実行結果。
     * 副作用: 所持品/対象ステータス/UI表示を更新する。
     */
    useItemOnMap(itemId, targetIndex) {
        const invData = this.inventory?.[itemId];
        if (!invData || invData.count <= 0) {
            return { success: false, message: '在庫がありません' };
        }

        const { item, targets, targetType } = this.getItemMapInfo(itemId);
        if (!item) return { success: false, message: '使用できません' };

        let targetList = targets;
        if (targetType === 'self') {
            targetList = [this.party?.[targetIndex]].filter(Boolean);
        } else if (targetType === 'single') {
            const target = this.party?.[targetIndex];
            targetList = target ? [target] : [];
        }

        if (!targetList.length) {
            return { success: false, message: '使える相手がいません' };
        }

        const executor = this.battleManager?.executor;
        let applied = false;
        targetList.forEach(target => {
            if (executor?.applyItemEffect) {
                const did = executor.applyItemEffect(item, target, { showEffects: false });
                applied = applied || did;
            }
        });

        if (!applied) {
            return { success: false, message: '使用できません' };
        }

        invData.count -= 1;
        if (invData.count <= 0) delete this.inventory[itemId];
        this.statusScreen?.refresh();
        const targetNames = targetList.map(t => t?.name).filter(Boolean);
        const targetText = targetType === 'all' ? '全体' : targetNames.join('、');
        const itemName = item?.name ?? itemId;
        return { success: true, message: `${itemName}を使用：${targetText}` };
    }

    /**
     * マップ画面で回復系スキルを使用する。
     * @param {number} actorIndex - 行動者インデックス。
     * @param {string} skillId - スキルID。
     * @param {number} targetIndex - 対象インデックス。
     * @returns {{success: boolean, message: string}} 実行結果。
     * 副作用: MP/HPとUI表示を更新する。
     */
    useSkillOnMap(actorIndex, skillId, targetIndex) {
        const info = this.getSkillMapInfo(actorIndex, skillId);
        if (!info.actor || !info.skill) return { success: false, message: '使用できません' };
        if (!info.usable) return { success: false, message: info.reason };

        let targetList = info.targets;
        if (info.targetType === 'self') {
            targetList = [info.actor];
        } else if (info.targetType === 'single') {
            const target = this.party?.[targetIndex];
            if (!target) return { success: false, message: '対象がいません' };
            if (!info.targets.includes(target)) return { success: false, message: 'その相手には使えません' };
            targetList = [target];
        }

        const executor = this.battleManager?.executor;
        if (!executor?.applyRecoverySkill) return { success: false, message: '使用できません' };

        const applied = executor.applyRecoverySkill(info.actor, targetList, info.skill, { showEffects: false });
        if (!applied) return { success: false, message: '使用できません' };
        this.statusScreen?.refresh();
        const targetNames = targetList.map(t => t?.name).filter(Boolean);
        const targetText = info.targetType === 'all' ? '全体' : targetNames.join('、');
        const skillName = info.skill?.name ?? skillId;
        return { success: true, message: `${skillName}を使用：${targetText}` };
    }

    /**
     * ゲーム開始時の初期画面を表示する。
     * 副作用: 画面をマップに切り替える。
     */
    start() {
        this.showMap();
    }

    /**
     * 画面下部のメッセージUIを遅延生成する。
     * 副作用: DOMへ要素を追加する。
     */
    initMessageUI() {
        if (document.getElementById('game-message-box')) return;
        const msgBox = document.createElement('div');
        msgBox.id = 'game-message-box';
        document.body.appendChild(msgBox);
    }

    /**
     * 一時メッセージを表示する。
     * @param {string} text - 表示文言。
     * 副作用: DOMクラスを操作し自動で非表示にする。
     */
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
     * @param {string} enemyType - 敵の種類 ('cragen', 'dragon' etc)
     * @param {string} bgmType - BGMの種類 ('normal', 'elite', 'boss')
     */
    /**
     * 戦闘画面に遷移しバトルを初期化する。
     * @param {string} enemyType - 敵タイプ。
     * @param {string|null} bgmType - BGM指定。
     * 副作用: UI表示・背景・BGMを変更する。
     */
    startBattle(enemyType, bgmType = null) {
        this.hideAllScreens();
        
        // ★重要: 戦う敵の種類を記憶しておく（勝利時の分岐用）
        this.currentEnemyType = enemyType;
        
        // ボス戦（ドラゴン）の時だけ背景を変える
        const canvasArea = document.getElementById('canvas-area');
        canvasArea.classList.remove('dark-atmosphere'); // 影バトルのエフェクトを外す
        if (enemyType === 'dragon') {
            canvasArea.style.backgroundImage = "linear-gradient(rgba(0, 0, 0, 0.1), rgba(0, 0, 0, 0.1)), url('./resource/boss_bg.jpg')";
        } else if (enemyType === 'shadow') {
            // ★追加: 影バトルの時は暗い雰囲気を付与
            canvasArea.classList.add('dark-atmosphere');
            canvasArea.style.backgroundImage = "url('./resource/dark_bg.jpg')"; // 一旦元の背景
        } else {
            canvasArea.style.backgroundImage = "url('./resource/bg.jpg')"; 
        }
        
        
        document.getElementById('game-wrapper').style.display = 'flex';
        this.battleManager.setupBattle(this.party, this.inventory, enemyType, bgmType);
    }

    /**
     * バトル勝利時の処理（BattleManagerから呼ばれる）
     */
    /**
     * 勝利時の画面遷移と報酬表示を処理する。
     * 副作用: 画面切替・報酬UI・BGMを操作する。
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
                    this.rewardManager.showRewards(this.currentEnemyType);
                } else {
                    console.error("RewardManagerが見つかりません");
                }
            }, 500);
        }
    }
    
    /**
     * ゲームクリア画面の表示
     */
    /**
     * エンディング画面を構築・表示する。
     * 副作用: DOMを生成しBGMを切り替える。
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

                <div class="ending-cat-container">
                    ${catImagesHTML}
                </div>

                <div class="ending-msg">
                    伝説のアイスドラゴンを討伐し<br>
                    世界の平和は守られた！<br>
                    <br>
                    勇者たちの冒険はこれからも続く...
                </div>

                <div class="ending-thanks" style="margin-top: 20px;">Thank you for playing!</div>
                
                <p style="font-size:12px; color:#bdc3c7;">（画像をクリックすると拡大します）</p>
                <br><br>
                <button id="title-return-btn" class="start-btn">タイトルへ戻る</button>

                <div id="cat-modal" class="image-modal-overlay">
                    <span class="close-modal">&times;</span>
                    <img class="modal-content" id="expanded-cat-img" src="">
                </div>
            `;
            document.body.appendChild(endingScreen);
            
            // --- ★追加: ざぼちを登場させる処理 ---
            const zabochiImg = document.createElement('img');
            zabochiImg.src = './resource/zabochi.webp'; // 画像パス
            zabochiImg.className = 'ending-zabochi';    // CSSクラス

            // ランダムな速さを決める (3秒〜6秒)
            const duration = 3.0 + Math.random() * 3.0;
            
          // ★変更: 動きを「zabochi-run」に変更
            // 出現(catFadeIn)した後、5秒後から駆け巡り(zabochi-run)開始
            // duration（一周する時間）を 8〜12秒くらいにして、ゆっくり大きく動かす
            const runDuration = 8.0 + Math.random() * 4.0;
            
            zabochiImg.style.animation = `catFadeIn 2s ease-out 3s forwards, zabochi-run ${runDuration.toFixed(2)}s ease-in-out 5s infinite`;
           
            endingScreen.appendChild(zabochiImg);
            // ------------------------------------
            
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
    /**
     * エンディング内の画像拡大モーダルを設定する。
     * @param {HTMLElement} screenElement - エンディング画面要素。
     * 副作用: クリックイベントを登録する。
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
    /**
     * マップ画面を表示する。
     * 副作用: 画面切替とBGM再生を行う。
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
    /**
     * 報酬選択後のUIクリーンアップを行う。
     * 副作用: 報酬UIを非表示にする。
     */
    onRewardSelected() {
        if (this.rewardManager) this.rewardManager.hide();
        // 報酬画面を閉じれば、後ろにあるマップが見える状態になる
    }

    /**
     * 全滅時のリセット処理を行う。
     * 副作用: ページをリロードする。
     */
    onGameOver() {
        console.log("全滅...");
        setTimeout(() => location.reload(), 3000);
    }

    /**
     * 主要な画面要素をすべて非表示にする。
     * 副作用: DOMスタイルを操作する。
     */
    hideAllScreens() {
        const screens = ['game-wrapper', 'map-screen', 'reward-screen', 'ending-screen', 'story-overlay']; // ★story-overlayを追加
        screens.forEach(id => {
            const el = document.getElementById(id);
            if(el) el.style.display = 'none';
        });
    }
    
    /**
     * ★追加: ゲームデータのセーブ
     */
    /**
     * 現在の進行状況をローカルストレージへ保存する。
     * 副作用: localStorageとUIメッセージを更新する。
     */
    saveGame() {
        const saveData = {
            //レリック
            relics: this.relics,
            // 1. パーティ情報（ステータスやスキル）
            party: this.party.map(p => ({
                job: p.job, 
                name: p.name,
                hp: p.hp,
                mp: p.mp,
                max_hp: p.max_hp,
                max_mp: p.max_mp,
                atk: p.atk,
                def: p.def,
                matk: p.matk,
                mdef: p.mdef,
                spd: p.spd,
                rec: p.rec,
                skills: p.skills
            })),
            // 2. インベントリ
            inventory: this.inventory,
            // 3. マップ情報（構造と現在地）
            map: {
                currentFloor: this.mapManager.currentFloor,
                currentNodeIndex: this.mapManager.currentNodeIndex,
                mapData: this.mapManager.mapData 
            }
        };

        try {
            localStorage.setItem('parm_rpg_save', JSON.stringify(saveData));
            this.showMessage("記録しました！");
            console.log("Save complete:", saveData);
        } catch (e) {
            console.error("Save failed:", e);
            this.showMessage("セーブに失敗しました");
        }
    }

    /**
     * ★追加: ゲームデータのロード
     */
    /**
     * ローカルストレージから進行状況を復元する。
     * @returns {boolean} 読み込み成功時true。
     * 副作用: パーティ/所持品/UIを更新する。
     */
    loadGame() {
        const json = localStorage.getItem('parm_rpg_save');
        if (!json) return false;

        try {
            const saveData = JSON.parse(json);
            
            // ★追加: レリックの復元（データがない場合は空配列にする）
            this.relics = saveData.relics || [];
            
            // ★追加: UI上のレリックバーも更新する
            if (this.battleManager && this.battleManager.ui) {
                this.battleManager.ui.updateRelicBar(this.relics);
            }

            // 1. インベントリ復元
            this.inventory = saveData.inventory;

            // 2. パーティステータス復元
            saveData.party.forEach((data, index) => {
                const member = this.party[index];
                if (member) {
                    member.max_hp = data.max_hp;
                    member.max_mp = data.max_mp;
                    member._hp = data.hp;
                    member._mp = data.mp;
                    member.atk = data.atk;
                    member.def = data.def;
                    member.matk = data.matk;
                    member.mdef = data.mdef;
                    member.spd = data.spd;
                    member.rec = data.rec;
                    member.skills = data.skills;
                }
            });

            // 3. マップ復元
            this.mapManager.mapData = saveData.map.mapData;
            this.mapManager.currentFloor = saveData.map.currentFloor;
            this.mapManager.currentNodeIndex = saveData.map.currentNodeIndex;
            
            this.showMap();
            this.showMessage("ロードしました！");
            return true;
        } catch (e) {
            console.error("Load failed:", e);
            this.showMessage("データの読み込みに失敗しました");
            return false;
        }
    }

    /**
     * ★追加: セーブデータがあるか確認
     */
    /**
     * セーブデータの有無を判定する。
     * @returns {boolean} セーブデータが存在する場合true。
     */
    hasSaveData() {
        return localStorage.getItem('parm_rpg_save') !== null;
    }
    
    /**
     * ★追加: 焚き火会話イベントを開始する
     * @param {Function} onFinished - イベント終了後に実行するコールバック（回復処理など）
     */
    /**
     * キャンプファイアイベントを開始する。
     * @param {Function} onFinished - 終了時コールバック。
     * 副作用: 画面遷移とイベント用UIを操作する。
     */
    startCampfireEvent(onFinished) {
        // UI要素の取得
        const overlay = document.getElementById('story-overlay');
        const imgEl = document.getElementById('story-image');
        const nameEl = document.getElementById('story-name');
        const textEl = document.getElementById('story-text');
        const skipBtn = document.getElementById('story-skip-btn');
        const msgBox = overlay.querySelector('.story-message-box');

        // ★設定: イベントで使用する画像パス
        const eventImageSrc = './resource/campfire_event.jpg'; // ※適切な画像を用意してください
        imgEl.src = eventImageSrc;

        // ★設定: 会話スクリプト
        // name: 話者名 (""ならナレーション), text: セリフ
        const script = [
            { name: "", text: "決戦の前夜、一行は焚き火を囲んでいた。" },
            { name: "勇者ぱるむ", text: "いよいよ明日だね……。\nみんなのおかげでここまでこれたよ。" },
            { name: "魔法使いはな", text: "ふん、当然でしょ。\nあんた一人じゃ最初のゴブリンにやられてたわよ。" },
            { name: "癒し手なつ", text: "まあまあ。\nでも、みんな本当に強くなったね。" },
            { name: "勇者ぱるむ", text: "ありがとう。\n……よし、絶対に勝とう！ 世界を取り戻すんだ！" },
            { name: "", text: "決意を新たに、体力を回復した。" }
        ];

        let currentIndex = 0;

        // 画面表示
        this.hideAllScreens();
        overlay.style.display = 'flex';
        
        // 1ページ目を表示
        const showPage = () => {
            if (currentIndex >= script.length) {
                endEvent();
                return;
            }
            const data = script[currentIndex];
            nameEl.innerText = data.name;
            textEl.innerText = data.text;
        };

        // イベント終了処理
        const endEvent = () => {
            overlay.style.display = 'none';
            // イベントリスナーの解除
            msgBox.onclick = null;
            skipBtn.onclick = null;
            
            // コールバック（回復処理＆マップ更新）を実行
            if (onFinished) onFinished();
        };

        // クリックで次へ
        msgBox.onclick = () => {
            currentIndex++;
            showPage();
        };

        // スキップボタン
        skipBtn.onclick = (e) => {
            e.stopPropagation(); // メッセージ送りを防ぐ
            endEvent();
        };

        // 開始
        showPage();
    }
    
    // ★追加: レリック獲得メソッド
    /**
     * レリックを所持リストへ追加する。
     * @param {string} relicId - レリックID。
     * 副作用: リスト更新とUI表示を行う。
     */
    addRelic(relicId) {
        if (!this.relics.includes(relicId) && RelicData[relicId]) {
            this.relics.push(relicId);
            console.log(`レリック獲得: ${RelicData[relicId].name}`);
            
            // ★追加: UIを更新して画面に出す
            // BattleManager経由でUIにアクセス
            if (this.battleManager && this.battleManager.ui) {
                this.battleManager.ui.updateRelicBar(this.relics);
            }
            
            // ログ出し
            this.showMessage(`${RelicData[relicId].name} を手に入れた！`);
        }
    }
    
    // ★追加: レリックを持っているかチェック
    /**
     * レリック所持判定。
     * @param {string} relicId - レリックID。
     * @returns {boolean} 所持している場合true。
     */
    hasRelic(relicId) {
        return this.relics.includes(relicId);
    }
}
