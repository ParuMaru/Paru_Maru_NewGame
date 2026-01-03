import { BattleState } from './battle_state.js';
import { UIManager } from './ui_manager.js';
import { ActionExecutor } from './action_executor.js';
import { BattleBGM } from './music.js';
import { EnemyAI } from './enemy_ai.js';
import { Slime, KingSlime } from './entities.js'; // ★KingSlime追加
import { EffectManager } from './effects.js';

export class BattleManager {
    // ★変更: コンストラクタで gameManager を受け取る
    constructor(gameManager) {
        this.gameManager = gameManager; // 親への参照を保持

        this.ui = new UIManager();
        this.bgm = new BattleBGM();
        this.effects = new EffectManager();
        this.state = new BattleState();
        
        // Executorは setupBattle でデータを更新するので、ここでは仮作成
        this.executor = new ActionExecutor(this.ui, this.bgm, this.effects, this.state.enemies, this.state.party);
        this.ai = new EnemyAI();
        this.isProcessing = false;
        
        // 音声ファイルのロードだけは先に済ませておく
        this.bgm.initAndLoad(); 
    }

    // ★initは削除し、代わりに setupBattle を使う
    // async init() { ... } 

    /**
     * GameManagerから呼ばれる戦闘開始メソッド
     * @param {Array} party - GameManagerから渡される味方配列
     * @param {Object} inventory - アイテムデータ
     * @param {string} enemyType - 敵の種類
     */
    setupBattle(party, inventory, enemyType) {
        //  パーティ情報を同期
        this.state.party = party;
        
        //インベントリデータを渡す
        this.ui.setInventory(inventory);
        
        //  敵を生成
        this.state.enemies = [];
        if (enemyType === 'king') {
            this.state.enemies.push(new KingSlime());
        } else {
            // 通常戦闘: ランダムなスライムたち
            this.state.enemies.push(new Slime(false, "スライムA"));
            this.state.enemies.push(new Slime(false, "スライムB"));
        }

        //  Executor に最新のメンツを教える
        this.executor.party = this.state.party;
        this.executor.enemies = this.state.enemies;
        // Executor内のDirectorにも教える必要がある
        this.executor.director.party = this.state.party;
        this.executor.director.enemies = this.state.enemies;

        //  ターン順の初期化
        this.state.calculateTurnOrder();

        //  画面と音楽の準備
        this.ui.addLog("---------- BATTLE START ----------", "#ffff00");
        this.bgm.initContext();
        this.bgm.playBGM();
        this.ui.refreshEnemyGraphics(this.state.enemies);
        this.updateUI(); // 味方の表示更新

        //  戦闘開始！
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
        if (!actor) return; // 安全策

        const partyIndex = this.state.party.indexOf(actor);
        this.ui.highlightActiveMember(partyIndex);
        
        // リジェネ処理
        if (actor.is_alive() && actor.regen_turns > 0) {
            const healVal = Math.floor(actor.max_hp * actor.regen_value);
            actor.add_hp(healVal);
            actor.regen_turns--; 

            this.ui.addLog(`> ${actor.name}のHPが ${healVal} 回復した(祝福)`, "#2ecc71");
            this.updateUI();
            
            if (partyIndex >= 0) this.effects.healEffect(`card-${partyIndex}`);
            
            await new Promise(r => setTimeout(r, 600));

            if (actor.regen_turns === 0) {
                this.ui.addLog(`${actor.name}の祝福が消えた`, "#bdc3c7");
            }
        }
        
        // バフ処理
        if (actor.is_alive() && actor.buff_turns > 0) {
            actor.buff_turns--;
            if (actor.buff_turns === 0) {
                this.ui.addLog(`${actor.name}の攻撃力が元に戻った`, "#bdc3c7");
            }
        }
        
        // かばう解除
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
            
            if (enemy.isKing && enemy.hp <= (enemy.max_hp / 2) && enemy.is_alive()) {
                this.isProcessing = true; 
                await this.executor.executeSplit(i);
                this.state.calculateTurnOrder();
                this.isProcessing = false; 
            }
        }
    }
    
    async handlePlayerAction(actor, action) {
        if (this.isProcessing) return;

        if (action.type === 'skill' && !action.target) {
            const skill = action.detail;
            if (skill.target === 'all') {
                const isFriendSkill = ['heal', 'res', 'buff', 'regen', 'mp_recovery'].includes(skill.type) || skill.id === 'cover';
                action.target = isFriendSkill ? this.state.party : this.state.getAliveEnemies();
                this._startExecute(actor, action);
            } 
            else if(skill.target ==='self'){
                action.target = actor;
                this._startExecute(actor,action);
            }
            else {
                let potentialTargets;
                if (skill.type === 'res') {
                    potentialTargets = this.state.party.filter(m => !m.is_alive());
                } else if (['heal', 'buff', 'regen', 'mp_recovery'].includes(skill.type)) {
                    potentialTargets = this.state.party.filter(m => m.is_alive());
                } else {
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
            let potentialTargets = (item.id === 'phoenix') ? this.state.party.filter(m => !m.is_alive()) 
                : this.state.party.filter(m => m.is_alive());

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
            const nameLabel = document.getElementById(`p${i}-name`);
            if (nameLabel) nameLabel.innerText = p.name;

            document.getElementById(`p${i}-hp-text`).innerText = `HP: ${p.hp} / ${p.max_hp}`;
            document.getElementById(`p${i}-mp-text`).innerText = `MP: ${p.mp} / ${p.max_mp}`;
            
            document.getElementById(`p${i}-hp-bar`).style.width = `${(p.hp / p.max_hp) * 100}%`;
            document.getElementById(`p${i}-mp-bar`).style.width = `${(p.mp / p.max_mp) * 100}%`;
            
            const card = document.getElementById(`card-${i}`);
            if (card) card._memberRef = p; 
            
            card.style.opacity = p.is_alive() ? "1" : "0.5";
            card.style.position = "relative"; 

            let badgeContainer = card.querySelector('.status-container');
            if (!badgeContainer) {
                badgeContainer = document.createElement('div');
                badgeContainer.className = 'status-container';
                card.appendChild(badgeContainer);
            }

            let badgesHTML = "";
            if (p.is_alive()) {
                if (p.is_covering) badgesHTML += `<div class="status-badge badge-cover" title="かばう">🛡️</div>`;
                if (p.regen_turns > 0) badgesHTML += `<div class="status-badge badge-regen" title="祝福">✨<span class="badge-num">${p.regen_turns}</span></div>`;
                if (p.buff_turns > 0) badgesHTML += `<div class="status-badge badge-buff" title="攻撃UP">⚔️<span class="badge-num">${p.buff_turns}</span></div>`;
            }
            badgeContainer.innerHTML = badgesHTML;
        });
    }
    
    async _startExecute(actor, action) {
        if (this.isProcessing) return;
        this.isProcessing = true;
        this.ui.commandContainer.innerHTML = "";

        if (!action.target) {
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
        if (this.bgm) this.bgm.stopBGM(); 
        this.isProcessing = false;
    }

    processEndGame() {
        const win = this.state.checkVictory();
        this.bgm.stopBGM();
        if (win) {
            this.ui.addLog("戦いに勝利した！", "#f1c40f");
            this.bgm.playVictoryFanfare(); 
        } else {
            this.ui.addLog("全滅した...", "#e74c3c");
        }

        setTimeout(() => {
            const overlay = document.getElementById('result-overlay');
            const title = document.getElementById('result-title');
            const restartBtn = document.getElementById('restart-button');

            title.innerText = win ? "VICTORY" : "DEFEAT...";
            title.className = win ? "victory-title" : "defeat-title";

            overlay.style.display = 'flex'; 

            // ★変更: リロードではなく GameManager へ報告する
            restartBtn.onclick = () => {
                this.cleanup();
                
                // 親(GameManager)に報告
                if (this.gameManager) {
                    if (win) {
                        this.gameManager.onBattleWin();
                    } else {
                        this.gameManager.onGameOver();
                    }
                } else {
                    // 万が一GameManagerがいなかった時の保険
                    location.reload(); 
                }
            };
        }, 1000); 
    }
}