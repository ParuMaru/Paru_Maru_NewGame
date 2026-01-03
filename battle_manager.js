import { BattleState } from './battle_state.js';
import { UIManager } from './ui_manager.js';
import { ActionExecutor } from './action_executor.js';
import { BattleBGM } from './music.js';
import { EnemyAI } from './enemy_ai.js';
import { Slime, KingSlime, Goblin, IceDragon } from './entities.js'; 
import { EffectManager } from './effects.js';

export class BattleManager {
    constructor(gameManager) {
        this.gameManager = gameManager; 
        this.ui = new UIManager();
        this.bgm = new BattleBGM();
        this.effects = new EffectManager();
        this.state = new BattleState();
        this.executor = new ActionExecutor(this.ui, this.bgm, this.effects, this.state.enemies, this.state.party);
        this.ai = new EnemyAI();
        this.isProcessing = false;
        this.bgm.initAndLoad(); 
    }

    /**
     * GameManagerから呼ばれる戦闘開始メソッド
     * @param {Array} party 
     * @param {Object} inventory 
     * @param {string} enemyType 
     * @param {string} bgmType - ★追加: BGMの種類指定
     */
    setupBattle(party, inventory, enemyType, bgmType = null) {
        this.state.party = party;
        this.ui.setInventory(inventory);
        
        // ... (敵の生成ロジックは変更なし) ...
        this.state.enemies = [];
        if (enemyType === 'king') {
            this.state.enemies.push(new KingSlime());
        } 
        else if (enemyType === 'dragon') {
            this.state.enemies.push(new IceDragon());
        }
        else if (enemyType === 'goblin') {
            this.state.enemies.push(new Goblin("ゴブリンA"));
            this.state.enemies.push(new Goblin("ゴブリンB"));
        }
        else {
            if (Math.random() < 0.5) {
                this.state.enemies.push(new Slime(false, "スライムA"));
                this.state.enemies.push(new Slime(false, "スライムB"));
            } else {
                this.state.enemies.push(new Goblin("はぐれゴブリン"));
                this.state.enemies.push(new Slime(false, "スライム"));
            }
        }

        // ... (Executor設定などは変更なし) ...
        this.executor.party = this.state.party;
        this.executor.enemies = this.state.enemies;
        this.executor.director.party = this.state.party;
        this.executor.director.enemies = this.state.enemies;

        this.state.calculateTurnOrder();

        this.ui.addLog("---------- BATTLE START ----------", "#ffff00");
        this.bgm.initContext();

        // ★変更: 指定があればそれに従う、なければ敵タイプで推測
        if (bgmType) {
            this.bgm.playBGM(bgmType);
        } else {
            // 自動判定（念のため）
            if (enemyType === 'dragon') this.bgm.playBGM('boss');
            else if (enemyType === 'king') this.bgm.playBGM('elite');
            else this.bgm.playBGM('normal');
        }
        
        this.ui.refreshEnemyGraphics(this.state.enemies);
        this.updateUI(); 

        this.runTurn();
    }

    async runTurn() {
        await this.checkSplitting();

        if (this.state.checkGameOver() || this.state.checkVictory()) {
            this.processEndGame();
            return;
        }

        const actor = this.state.getCurrentActor();
        if (!actor) return; 

        const partyIndex = this.state.party.indexOf(actor);
        this.ui.highlightActiveMember(partyIndex);
        
        if (actor.is_alive()) {
            // 1. リジェネ発動
            // .hasBuff() は内部でブラケットアクセスしているのでそのままでOKですが
            // 呼び出し側の文字列リテラルは正しいです
            if (actor.hasBuff('regen')) {
                const healVal = Math.floor(actor.max_hp * actor.regen_value);
                actor.add_hp(healVal);
                this.ui.addLog(`> ${actor.name}のHPが ${healVal} 回復した(祝福)`, "#2ecc71");
                this.updateUI();
                if (partyIndex >= 0) this.effects.healEffect(`card-${partyIndex}`);
                await new Promise(r => setTimeout(r, 600));
            }

            // 2. バフ/デバフのターン経過処理
            const processStatus = (box) => {
                for (const key in box) {
                    box[key]--; 
                    if (box[key] <= 0) {
                        delete box[key];
                        if (key === 'atk_up') this.ui.addLog(`${actor.name}の攻撃力が元に戻った`, "#bdc3c7");
                        if (key === 'regen') this.ui.addLog(`${actor.name}の祝福が消えた`, "#bdc3c7");
                    }
                }
            };
            
            processStatus(actor.buffs);
            processStatus(actor.debuffs);
        }

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
                if (skill.type === 'res') potentialTargets = this.state.party.filter(m => !m.is_alive());
                else if (['heal', 'buff', 'regen', 'mp_recovery'].includes(skill.type)) potentialTargets = this.state.party.filter(m => m.is_alive());
                else potentialTargets = this.state.getAliveEnemies();
                
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
        // --- 1. 味方の更新（既存） ---
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
                if (p.buffs.regen) badgesHTML += `<div class="status-badge badge-regen" title="祝福">✨<span class="badge-num">${p.buffs.regen}</span></div>`;
                if (p.buffs.atk_up) badgesHTML += `<div class="status-badge badge-buff" title="攻撃UP">⚔️<span class="badge-num">${p.buffs.atk_up}</span></div>`;
                if (p.debuffs && p.debuffs.poison) badgesHTML += `<div class="status-badge badge-debuff" title="毒">☠️<span class="badge-num">${p.debuffs.poison}</span></div>`;
            }
            badgeContainer.innerHTML = badgesHTML;
        });

        // --- 2. 敵の更新（★ここを追加！） ---
        this.state.enemies.forEach((enemy, i) => {
            if (!enemy.is_alive()) return;

            // 敵のDOM要素を取得 
            const unitDiv = document.getElementById(`enemy-sprite-${i}`);
            if (!unitDiv) return;

            // ステータス表示領域を取得または作成
            let badgeContainer = unitDiv.querySelector('.enemy-status-container');
            if (!badgeContainer) {
                badgeContainer = document.createElement('div');
                badgeContainer.className = 'enemy-status-container';
                unitDiv.appendChild(badgeContainer);
            }

            // バッジHTML生成
            let badgesHTML = "";
            
            // 攻撃UP (咆哮など)
            if (enemy.buffs.atk_up) {
                badgesHTML += `<div class="status-badge badge-buff" title="攻撃UP">⚔️<span class="badge-num">${enemy.buffs.atk_up}</span></div>`;
            }
            // リジェネ
            if (enemy.buffs.regen) {
                 badgesHTML += `<div class="status-badge badge-regen" title="リジェネ">✨<span class="badge-num">${enemy.buffs.regen}</span></div>`;
            }
            // 毒などのデバフ
             if (enemy.debuffs && enemy.debuffs.poison) {
                badgesHTML += `<div class="status-badge badge-debuff" title="毒">☠️<span class="badge-num">${enemy.debuffs.poison}</span></div>`;
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
        this.updateUI();
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
            restartBtn.onclick = () => {
                this.cleanup();
                if (this.gameManager) {
                    if (win) this.gameManager.onBattleWin();
                    else this.gameManager.onGameOver();
                } else {
                    location.reload(); 
                }
            };
        }, 1000); 
    }
}