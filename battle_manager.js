import { BattleState } from './battle_state.js';
import { UIManager } from './ui_manager.js';
import { ActionExecutor } from './action_executor.js';
import { BattleBGM } from './music.js';
import { EnemyAI } from './enemy_ai.js';
import { Slime } from './entities.js';
import { EffectManager } from './effects.js'; // これを追加！

export class BattleManager {
    constructor() {
        this.ui = new UIManager();
        this.bgm = new BattleBGM();
        this.effects = new EffectManager();
        this.state = new BattleState();
        this.executor = new ActionExecutor(this.ui, this.bgm, this.effects,this.state.enemies,this.state.party);
        this.ai = new EnemyAI();
        this.isProcessing = false;
    }

    async init() {
        
        await this.bgm.initAndLoad();
        this.ui.addLog("戦闘開始！", "#ffff00");
        
        
        this.bgm.initContext();
        this.bgm.playBGM();
        this.ui.refreshEnemyGraphics(this.state.enemies);
        this.runTurn();
        
    }

    async runTurn() {
        // 分裂判定チェック
        await this.checkSplitting();

        if (this.state.checkGameOver() || this.state.checkVictory()) {
            this.processEndGame();
            return;
        }

        const actor = this.state.getCurrentActor();
        
        //現在の行動者が味方なら光らせる、敵なら光を消す
        const partyIndex = this.state.party.indexOf(actor);
        this.ui.highlightActiveMember(partyIndex);
        
        //いのり
        if (actor.is_alive() && actor.regen_turns > 0) {
            // 最大HPの n% 回復
            const healVal = Math.floor(actor.max_hp * actor.regen_value);
            actor.add_hp(healVal);
            actor.regen_turns--; // 残りターンを減らす

            this.ui.addLog(`> ${actor.name}のHPが ${healVal} 回復した(祝福)`, "#2ecc71");
            
            // UI反映とウェイト（演出用）
            this.updateUI();
            
            // 味方のIDを取得してエフェクト（敵のリジェネは一旦考慮外）
            const partyIndex = this.state.party.indexOf(actor);
            if (partyIndex >= 0) {
                 this.effects.healEffect(`card-${partyIndex}`);
            }
            
            await new Promise(r => setTimeout(r, 600));

            if (actor.regen_turns === 0) {
                this.ui.addLog(`${actor.name}の祝福が消えた`, "#bdc3c7");
            }
        }
        
        //鼓舞
        if (actor.is_alive() && actor.buff_turns > 0) {
            actor.buff_turns--;
            if (actor.buff_turns === 0) {
                this.ui.addLog(`${actor.name}の攻撃力が元に戻った`, "#bdc3c7");
            }
        }
        
        //かばう
        if (actor.is_covering) {
            actor.is_covering = false;
            this.ui.addLog(`${actor.name}は身構えるのをやめた`, "#bdc3c7"); 
        }
        
        this.updateUI();

        if (actor.job) {
            this.ui.showCommands(actor, (act) => this.handlePlayerAction(actor, act));
        } else {
            this.handleEnemyTurn(actor);
        }
    }

    /**
     * キングスライムの分裂チェック
     */
    async checkSplitting() {
        for (let i = 0; i < this.state.enemies.length; i++) {
            const enemy = this.state.enemies[i];
            
            // HPが半分以下になったら分裂
            if (enemy.isKing && enemy.hp <= (enemy.max_hp / 2) && enemy.is_alive()) {
                
                // 1. 予兆：ログを出してSEを鳴らす
                this.ui.addLog(`${enemy.name}の体が震えだした...！`, "#ff00ff");
                this.bgm.playMagicMeteor(); // 重厚な音（代用）

                // 2. アニメーション：キングスライムを震わせて点滅させる
                const kingSprite = document.getElementById(`enemy-sprite-${i}`);
                if (kingSprite) {
                    const img = kingSprite.querySelector('img');
                    if (img) {
                        // styles.css に定義済みの .splitting (shake-split) を付与
                        img.classList.add('splitting'); 
                    }
                }

                // 3. 溜め時間
                await new Promise(r => setTimeout(r, 1200));

                // 4. 分裂実行！
                this.ui.addLog(`${enemy.name}は三体に分裂した！`, "#ff00ff");
                
                // データ上で入れ替え
                this.state.enemies.splice(i, 1, 
                    new Slime(false,'スライムA'), 
                    new Slime(false,'スライムB'), 
                    new Slime(false,'スライムC')
                );
                
                // 画面を更新（これで3体が表示される）
                this.ui.refreshEnemyGraphics(this.state.enemies);

                // 5. 登場演出：3体が左右に広がるアニメーションを付与
                // （refreshEnemyGraphics直後なのでDOMが存在する）
                const spriteA = document.getElementById(`enemy-sprite-${i}`);     // 真ん中（A）
                const spriteB = document.getElementById(`enemy-sprite-${i+1}`);   // 右（B）
                const spriteC = document.getElementById(`enemy-sprite-${i+2}`);   // 左（C）

                // CSSクラスで現れる動きをつける
                if (spriteA) spriteA.classList.add('appear-right');
                if (spriteC) spriteC.classList.add('appear-left');
                
                // 少し待ってプレイヤーに認識させる
                await new Promise(r => setTimeout(r, 1000));
            }
        }
    }

    
    async handlePlayerAction(actor, action) {
        if (this.isProcessing) return;

        //  スキルかつ、まだターゲットが決まっていない場合
        if (action.type === 'skill' && !action.target) {
            const skill = action.detail;

            if (skill.target === 'all') {
                // 回復・蘇生・バフ・リジェネなら「味方全員」、それ以外（攻撃）なら「敵全員」
                const isFriendSkill = ['heal', 'res', 'buff', 'regen', 'mp_recovery'].includes(skill.type) || skill.id === 'cover';

                action.target = isFriendSkill ? this.state.party : this.state.getAliveEnemies();

                this._startExecute(actor, action);
            } 
            //ターゲットが自分自身の場合
            else if(skill.target ==='self'){
                action.target = actor;
                this._startExecute(actor,action);
                
            }
            // 単体ならターゲット選択画面へ
            else {
                
                let potentialTargets;
                if (skill.type === 'res') {
                    // 蘇生スキル（レイズ）は「死んでいる味方」のみ
                    potentialTargets = this.state.party.filter(m => !m.is_alive());
                } 
                else if (['heal', 'buff', 'regen', 'mp_recovery'].includes(skill.type)) {
                    // その他の支援スキルは「生きている味方」のみ
                    potentialTargets = this.state.party.filter(m => m.is_alive());
                } 
                else {
                    // 攻撃スキルは「生きている敵」
                    potentialTargets = this.state.getAliveEnemies();
                }

                this.ui.showTargetMenu(
                    potentialTargets,
                    (selectedTarget) => {
                        action.target = selectedTarget;
                        this._startExecute(actor, action);
                    },
                    () => this.ui.showCommands(actor, (act) => this.handlePlayerAction(actor, act))
                );
            }
            return;
        }

        // 攻撃の場合も単体ならターゲットを選ばせる
        if (action.type === 'attack' && !action.target) {
            this.ui.showTargetMenu(
                this.state.getAliveEnemies(),
                (selectedTarget) => {
                    action.target = selectedTarget;
                    this._startExecute(actor, action);
                },
                () => this.ui.showCommands(actor, (act) => this.handlePlayerAction(actor, act))
            );
            return;
        }
        
        if (action.type === 'item' && !action.target) {
            const item = action.detail;

            let potentialTargets;
            if (item.id === 'phoenix') {
                // フェニックスの尾は「死んでいる人」だけ選べる
                potentialTargets = this.state.party.filter(m => !m.is_alive());
            } else {
                // その他のアイテム：生きている人のみ
                potentialTargets = this.state.party.filter(m => m.is_alive());
            }

            this.ui.showTargetMenu(
                potentialTargets,
                (selectedTarget) => {
                    action.target = selectedTarget;
                    this._startExecute(actor, action);
                },
                () => this.ui.showItemMenu((act) => this.handlePlayerAction(actor, act))
            );
            return;
        }
        
        this._startExecute(actor, action);
    }

    async handleEnemyTurn(enemy) {
        this.ui.commandContainer.innerHTML = "";
        await new Promise(r => setTimeout(r, 800));
        const action = this.ai.think(enemy, this.state.getAliveParty());
        await this.executor.execute(enemy, action.target, action);
        this.nextTurn();
    }

    nextTurn() {
        this.isProcessing = false;
        this.state.nextTurn();
        this.runTurn();
    }

    updateUI() {
        this.state.party.forEach((p, i) => {
            // ★追加：名前の表示も更新する
            const nameLabel = document.getElementById(`p${i}-name`);
            if (nameLabel) {
                nameLabel.innerText = p.name;
            }

            // ステータス更新（最大値表示込み）
            document.getElementById(`p${i}-hp-text`).innerText = `HP: ${p.hp} / ${p.max_hp}`;
            document.getElementById(`p${i}-mp-text`).innerText = `MP: ${p.mp} / ${p.max_mp}`;
            
            document.getElementById(`p${i}-hp-bar`).style.width = `${(p.hp / p.max_hp) * 100}%`;
            document.getElementById(`p${i}-mp-bar`).style.width = `${(p.mp / p.max_mp) * 100}%`;
            
            const card = document.getElementById(`card-${i}`);
            card.style.opacity = p.is_alive() ? "1" : "0.5";
            card.style.position = "relative"; 

            // --- ステータスバッジ処理 ---
            let badgeContainer = card.querySelector('.status-container');
            if (!badgeContainer) {
                badgeContainer = document.createElement('div');
                badgeContainer.className = 'status-container';
                card.appendChild(badgeContainer);
            }

            let badgesHTML = "";
            if (p.is_alive()) {
                if (p.is_covering) {
                    badgesHTML += `<div class="status-badge badge-cover" title="かばう">🛡️</div>`;
                }
                if (p.regen_turns > 0) {
                    badgesHTML += `<div class="status-badge badge-regen" title="祝福">✨<span class="badge-num">${p.regen_turns}</span></div>`;
                }
                if (p.buff_turns > 0) {
                    badgesHTML += `<div class="status-badge badge-buff" title="攻撃UP">⚔️<span class="badge-num">${p.buff_turns}</span></div>`;
                }
            }
            badgeContainer.innerHTML = badgesHTML;
        });
    }

    
    async _startExecute(actor, action) {
        this.isProcessing = true;
        
        // ターゲットがまだ決まっていない場合（念のため）
        if (!action.target) {
            // 全体攻撃なら敵全員、回復なら自分自身などをデフォルトにする救済措置
            if (action.detail && action.detail.target === 'all') {
                action.target = this.state.getAliveEnemies();
            } else {
                action.target = this.state.getAliveEnemies()[0];
            }
        }

        await this.executor.execute(actor, action.target, action);
        this.nextTurn();
    }
    
    cleanup() {
        if (this.bgm) this.bgm.stop(); // BGM停止
        this.isProcessing = false;
    }

    processEndGame() {
        const win = this.state.checkVictory();
        
        // 1. ログとBGMの処理
        this.bgm.stopBGM();
        if (win) {
            this.ui.addLog("戦いに勝利した！", "#f1c40f");
            this.bgm.playVictoryFanfare(); // ファンファーレ再生！
        } else {
            this.ui.addLog("全滅した...", "#e74c3c");
        }

        // 2. リザルト画面の表示（少し待ってから）
        setTimeout(() => {
            const overlay = document.getElementById('result-overlay');
            const title = document.getElementById('result-title');
            const restartBtn = document.getElementById('restart-button');

            // 勝敗で文字と色を変える
            title.innerText = win ? "VICTORY" : "DEFEAT...";
            title.className = win ? "victory-title" : "defeat-title";

            overlay.style.display = 'flex'; // 表示

            // 3. 再戦ボタンの処理
            restartBtn.onclick = () => {
                overlay.style.display = 'none';
                
                // 自分自身をクリーンアップ
                this.cleanup();

                // 新しいバトルを開始（ページリロードに近い挙動）

                location.reload(); 
            };
        }, 1000); // 1秒余韻を持たせる
    }
}