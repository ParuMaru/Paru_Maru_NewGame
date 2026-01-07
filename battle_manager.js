import { BattleState } from './battle_state.js';
import { UIManager } from './ui_manager.js';
import { ActionExecutor } from './action_executor.js';
import { BattleBGM } from './music.js';
import { EnemyAI } from './enemy_ai.js';
import { Jellyfish, KingJellyfish, Goblin, ShadowHero, ShadowWizard, ShadowHealer,ShadowLord, IceDragon } from './entities.js'; 
import { EffectManager } from './effects.js';
import { BattleCalculator } from './battle_calculator.js';

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
        this.currentActor = null;
        this.bgm.initAndLoad(); 
    }

    setupBattle(party, inventory, enemyType, bgmType = null) {
        this.state.party = party;
        this.ui.setInventory(inventory);   
        this.state.enemies = [];
        
        const rnd = Math.random();
        
        if (enemyType === 'king') this.state.enemies.push(new KingJellyfish());
        else if (enemyType === 'dragon') this.state.enemies.push(new IceDragon());
        else if (enemyType === 'shadow') {
            this.state.enemies.push(new ShadowHero());
            this.state.enemies.push(new ShadowWizard());
            this.state.enemies.push(new ShadowHealer());
        }
        else {
            if (rnd < 0.33) {
                this.state.enemies.push(new Jellyfish(false, "クラゲA"));
                this.state.enemies.push(new Jellyfish(false, "クラゲB"));
            } else if(rnd < 0.66) {
                this.state.enemies.push(new Goblin("はぐれゴブリン"));
                this.state.enemies.push(new Jellyfish(false, "はぐれクラゲ"));
            }else{
                this.state.enemies.push(new Goblin("ゴブリンA"));
                this.state.enemies.push(new Goblin("ゴブリンB"));
            }
        }

        this.executor.party = this.state.party;
        this.executor.enemies = this.state.enemies;
        this.executor.director.party = this.state.party;
        this.executor.director.enemies = this.state.enemies;

        this.state.initBattleAV();
//        this.state.calculateTurnOrder();

        this.ui.addLog("---------- BATTLE START ----------", "#ffff00");
        this.bgm.initContext();

        if (bgmType) {
            this.bgm.playBGM(bgmType);
        } else {
            if (enemyType === 'dragon') this.bgm.playBGM('boss');
            else if (enemyType === 'king') this.bgm.playBGM('elite');
            else if (enemyType === 'shadow') this.bgm.playBGM('shadow');
            else this.bgm.playBGM('normal');
        }
        
        this.ui.refreshEnemyGraphics(this.state.enemies);
        this.updateUI(); 

        this.runTurn();
    }

    async runTurn() {
        await this.checkSplitting();
        
        // ★追加: 影の合体イベント判定
        // 「現在の敵が影シリーズ」かつ「全員死んだ」かつ「まだ合体していない」場合
        if (this.gameManager.currentEnemyType === 'shadow' && !this.isShadowFused) {
             const aliveEnemies = this.state.getAliveEnemies();
             if (aliveEnemies.length === 0) {
                 await this.processShadowFusion();
                 // 合体後はターンを継続（新しいボスが行動順に含まれるため）
             }
        }

        if (this.state.checkGameOver() || this.state.checkVictory()) {
            this.processEndGame();
            return;
        }
        
        
        const actor = this.state.advanceTimeAndGetActor();
        if (!actor) return;
        
        this.currentActor = actor;

        // 誰の番かログに出すと分かりやすい（デバッグ用）
        // 行動値は「残り0」になっているはず
         console.log(`Turn: ${actor.name} (Round: ${this.state.currentRound})`);

        // 現在のラウンド数をUIに表示（もし枠があれば）
        
//        const actor = this.state.getCurrentActor();
//        if (!actor) return; 

        const partyIndex = this.state.party.indexOf(actor);
        this.ui.highlightActiveMember(partyIndex);
        
        // --- 1. リジェネ処理（ターン開始時） ---
        if (actor.is_alive() && actor.buffs.regen > 0) {
            const healVal = Math.floor(actor.max_hp * actor.regen_value);
            actor.add_hp(healVal);
            
            this.ui.addLog(`> ${actor.name}のHPが ${healVal} 回復した(祝福)`, "#2ecc71");
            this.updateUI();
            
            if (partyIndex >= 0) this.effects.healEffect(`card-${partyIndex}`);
            
            await new Promise(r => setTimeout(r, 600));
        }

        // --- 2. 毒ダメージ処理（ターン開始時） ---
        // ★修正: 条件判定と減算処理を確実に実行
        if (actor.is_alive() && actor.debuffs && actor.debuffs.poison > 0) {
            // ダメージ計算
            const poisonDmg = BattleCalculator.calculatePoisonDamage(actor);
            
            // ★重要: ここで確実に毒のターンを減らす
            actor.debuffs.poison--;

            this.ui.addLog(`> ${actor.name}は毒で ${poisonDmg} のダメージ！`, "#9b59b6");
            
            // ターン切れなら削除
            if (actor.debuffs.poison <= 0) {
                delete actor.debuffs.poison;
                this.ui.addLog(`${actor.name}の毒が消えた`, "#bdc3c7");
            }

            // 描画更新: 毒で死んだ場合の画像更新なども含めて行う
            this.ui.refreshEnemyGraphics(this.state.enemies); 
            // その後にアイコン（数値）を更新する
            this.updateUI();
            
            // 演出待ち
            await new Promise(r => setTimeout(r, 600));

            // 毒で倒れた場合
            if (!actor.is_alive()) {
                this.ui.addLog(`${actor.name}は力尽きた...`, "#e74c3c");
                this.nextTurn();
                return; // ここで処理を抜ける
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
    
    async processShadowFusion() {
        this.isProcessing = true;
        this.isShadowFused = true; // 合体済みフラグON

        // 1. 演出開始
        await this.executor.director.showShadowFusionStart();
        
        // 2. 敵データを「影の支配者」1体に書き換え
        // ※ entities.js で import { ShadowLord } from './entities.js'; が必要ですが、
        // 動的インポートを使わず、あとで entities.js の修正と一緒に確認してください
        const boss = new ShadowLord();
        
        // 3体がいた場所から新しいボスが登場
        this.state.enemies = [boss];
        this.executor.enemies = this.state.enemies;
        this.executor.director.enemies = this.state.enemies;

        // 3. UI更新
        this.ui.refreshEnemyGraphics(this.state.enemies);
        this.updateUI();

        // 4. 登場演出
        await this.executor.director.showShadowFusionEnd();
        
        // 5. 行動順の再計算（ボスを混ぜる）
        this.state.calculateTurnOrder();
        
        this.isProcessing = false;
    }

    // ターン終了処理
    async processTurnEnd(actor) {
        if (!actor.is_alive()) return;

        const processBox = (box, typeName) => {
            for (const key in box) {
                //  毒(poison)はターン開始時に処理済みなので、ここでは触らない あとで追記するかも
                if (key === 'poison') continue;

                if (box[key] > 0) {
                    box[key]--;
                    if (box[key] <= 0) {
                        delete box[key];
                        if (key === 'atk_up') this.ui.addLog(`${actor.name}の攻撃力が元に戻った`, "#bdc3c7");
                        if (key === 'regen') this.ui.addLog(`${actor.name}の祝福が消えた`, "#bdc3c7");
                        if (key === 'atk_down') this.ui.addLog(`${actor.name}の攻撃力が元に戻った`, "#bdc3c7");
                    }
                }
            }
        };

        processBox(actor.buffs, "buff");
        processBox(actor.debuffs, "debuff");

        this.updateUI();
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

        // ★変更点：個別の特殊イベント（変身など）は専用の係に任せる！
        await this.checkUniqueEnemyEvent(enemy);

        // ★変更点：行動回数も「敵データ」に持たせるのが理想
        // （enemy.actionCount がなければ 1回 とみなす、という書き方）
        const actionCount = enemy.actionCount || 1;

        for (let i = 0; i < actionCount; i++) {
            if (!enemy.is_alive() || this.state.getAliveParty().length === 0) break;

            if (i > 0) {
                await new Promise(r => setTimeout(r, 1000));
                this.ui.addLog(`${enemy.name}の猛攻！(連続行動)`, "#ff0000");
            }

            let action = this.ai.think(enemy, this.state.getAliveParty(), this.state.getAliveEnemies());
            await this.executor.execute(enemy, action.target, action);
        }
        
        await this.processTurnEnd(enemy);
        this.nextTurn();
    }
    
    
    async checkUniqueEnemyEvent(enemy) {
        // --- ドラゴンの場合 ---
        if (enemy instanceof IceDragon && enemy.hp <= (enemy.max_hp * 0.3)) {
            
            // 1. データ上の変身処理（Entityにやらせる）
            // 成功したら true が返る
            if (enemy.toBerserkMode()) {
                
                // 2. 演出再生（Directorにやらせる！）
                // Executorの中にDirectorがいる構成のようなので、そこを経由します
                await this.executor.director.playDragonTransformation(enemy, this.state.enemies);
                
                // 3. 最終的なステータス表示更新
                this.updateUI(); 
            }
        }
    }

    // ★重要: 行動が終わった後の処理
    // ここで行動値をリチャージ（10000/速度）して、列の最後尾に並び直させる
    nextTurn(actor) { // 引数でactorを受け取れるように変更推奨
        this.isProcessing = false;
        
        // ★追加: 行動したキャラの行動値をリセット（10000 / spd を足す）
        // 直前まで動いていたキャラを特定する必要がある
        // runTurn内のスコープで渡すのが綺麗ですが、簡易的にこうします
        
        // actor引数が来ていなければ、今の行動者を探す（本来は引数で回すべき）
        // ここでは「行動し終わった人」＝「actionValueが0の人」です
        
        // 行動値をリチャージ！
        if (this.currentActor) {
            // 動いたキャラの行動値をリセット（10000 / 速度）
            this.currentActor.resetActionValue();
            this.currentActor = null; // 記憶を消去
        } else {
            // 万が一 currentActor が取れなかった場合の保険（毒死など）
            // 行動値が0以下になっている生存者をリセット
            const finishedActors = [...this.state.party, ...this.state.enemies]
                                .filter(c => c.is_alive() && c.actionValue <= 0.1); 
            finishedActors.forEach(c => c.resetActionValue());
        }
        // 再帰的に次のターンへ
        this.runTurn();
    }


    updateUI() {
        // --- 1. 味方の更新 ---
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
                
                if (p.debuffs && p.debuffs.atk_down) {
                    badgesHTML += `<div class="status-badge badge-debuff" title="攻撃DOWN">⏬<span class="badge-num">${p.debuffs.atk_down}</span></div>`;
                }
                if (p.debuffs && p.debuffs.poison) badgesHTML += `<div class="status-badge badge-debuff" title="毒">☠️<span class="badge-num">${p.debuffs.poison}</span></div>`;
            }
            badgeContainer.innerHTML = badgesHTML;
        });

        // --- 2. 敵の更新 ---
        this.state.enemies.forEach((enemy, i) => {
            if (!enemy.is_alive()) return;

            // ID取得（ui_managerで設定したID）
            const unitDiv = document.getElementById(`enemy-sprite-${i}`);
            if (!unitDiv) return;

            // ステータス表示領域を取得
            let badgeContainer = unitDiv.querySelector('.enemy-status-container');
            if (!badgeContainer) {
                badgeContainer = document.createElement('div');
                badgeContainer.className = 'enemy-status-container';
                unitDiv.appendChild(badgeContainer);
            }

            let badgesHTML = "";
            if (enemy.buffs.atk_up) {
                badgesHTML += `<div class="status-badge badge-buff" title="攻撃UP">⚔️<span class="badge-num">${enemy.buffs.atk_up}</span></div>`;
            }
            if (enemy.buffs.regen) {
                 badgesHTML += `<div class="status-badge badge-regen" title="リジェネ">✨<span class="badge-num">${enemy.buffs.regen}</span></div>`;
            }
             if (enemy.debuffs && enemy.debuffs.poison) {
                badgesHTML += `<div class="status-badge badge-debuff" title="毒">☠️<span class="badge-num">${enemy.debuffs.poison}</span></div>`;
            }
            if (enemy.debuffs && enemy.debuffs.atk_down) {
                badgesHTML += `<div class="status-badge badge-debuff" title="攻撃DOWN">⏬<span class="badge-num">${enemy.debuffs.atk_down}</span></div>`;
            }

            badgeContainer.innerHTML = badgesHTML;
        });
        // --- ★追加: 行動順リストの更新 ---
        
        // 最新の並び順を取得（state側でソート済みのもの）
        // もし state.turnOrder が古ければ、ここで再ソートしても良いですが、
        // state.sortQueue() は advanceTimeAndGetActor 内で呼ばれているはずです。
        
        // 表示用に、現在の状態から再ソートして渡すのが確実
        const allAlive = [...this.state.party, ...this.state.enemies]
                         .filter(c => c.is_alive());
        
        // 行動値が小さい順に並べる
        const sortedQueue = allAlive.sort((a, b) => a.actionValue - b.actionValue);

        // UIマネージャーに渡して描画
        this.ui.updateTurnOrder(sortedQueue, this.state.currentRound);
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
        
        // 行動終了時にバフ減少
        await this.processTurnEnd(actor);

        this.nextTurn();
    }
    
    cleanup() {
        if (this.bgm) this.bgm.stopBGM(); 
        this.isProcessing = false;

        // 戦闘終了時リセット
        if (this.state && this.state.party) {
            this.state.party.forEach(p => {
                if(p.clear_all_buffs) {
                    p.clear_all_buffs(); 
                }
            });
        }
    }

    processEndGame() {
        this.updateUI(); 

        const win = this.state.checkVictory();
        this.bgm.stopBGM();
        if (win) {
            this.ui.addLog("戦いに勝利した！", "#f1c40f");
            this.bgm.playWin(); 
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
                    if (win) {
                        this.gameManager.onBattleWin();
                    } else {
                        this.gameManager.onGameOver();
                    }
                } else {
                    location.reload(); 
                }
            };
        }, 1000); 
    }
}