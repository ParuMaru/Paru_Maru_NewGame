import { BattleState } from './battle_state.js';
import { UIManager } from './ui_manager.js';
import { ActionExecutor } from './action_executor.js';
import { BattleBGM } from './music.js';
import { EnemyAI } from './enemy_ai.js';
import { cragen, Kingcragen, Goblin, ShadowHero, ShadowWizard, ShadowHealer, ShadowLord, IceDragon, FireGolem, Onryo } from './entities.js'; 
import { EffectManager } from './effects.js';
import { BattleCalculator } from './battle_calculator.js';
import { GodCat } from './entities.js';
import { RelicData } from './relics.js';
import { UiColors } from './ui_colors.js';
import { UiClasses } from './ui_classes.js';
import { GameConfig } from './game_config.js';

export class BattleManager {
    constructor(gameManager) {
        this.gameManager = gameManager; 
        this.ui = new UIManager();
        this.bgm = new BattleBGM();
        this.effects = new EffectManager();
        this.state = new BattleState();
        this.executor = new ActionExecutor(this.ui, this.bgm, this.effects, this.state.enemies, this.state.party, this.gameManager);
        this.ai = new EnemyAI();
        this.isProcessing = false;
        this.currentActor = null;
        this.allOutPrompted = false;
        this.wasAllDown = false;
        this.lastAction = null;
        this.bgm.initAndLoad(); 
    }

    _playDamageSeIfHpReduced(target, prevHp) {
        if (prevHp > target.hp) {
            this.bgm.playDamage();
        }
    }

    setupBattle(party, inventory, enemyType, bgmType = null) {
        // ★追加: リトライ用に、戦闘開始時点のデータを保存しておく
        this.backupData = {
            partyState: party.map(p => ({ hp: p.hp, mp: p.mp })), // HP/MPを記録
            inventoryState: JSON.parse(JSON.stringify(inventory)), // アイテム数を記録
            enemyType: enemyType,
            bgmType: bgmType
        };
        //バフ削除
        party.forEach(p => p.clear_all_buffs());
        this.isShadowFused = false;
        this.allOutPrompted = false;
        this.wasAllDown = false;
        this.lastAction = null;
        
        this.state.party = party;
        this.ui.setInventory(inventory);   
        this.state.enemies = [];
        
        const rnd = Math.random();
        
        if (enemyType === 'king') this.state.enemies.push(new Kingcragen());
        else if (enemyType === 'dragon') this.state.enemies.push(new IceDragon());
        else if (enemyType === 'shadow') {
            this.state.enemies.push(new ShadowHero());
            this.state.enemies.push(new ShadowWizard());
            this.state.enemies.push(new ShadowHealer());
        }
        else if (enemyType === 'weakness_test') {
            const iceGoblin = new Goblin("弱点ゴブリン(氷)");
            iceGoblin.weaknessTag = "ice";
            const holyOnryo = new Onryo("弱点怨霊(聖)");
            this.state.enemies.push(iceGoblin);
            this.state.enemies.push(holyOnryo);
        }
        else {
            if (rnd < 0.6) {
                const holyOnryo = new Onryo();
                this.state.enemies.push(new Goblin("ゴブリンA"));
                this.state.enemies.push(new cragen(false, "クラーゲンB"));
                this.state.enemies.push(holyOnryo);
            } else if (rnd < 0.9) {
                const guardGoblin = new Goblin("護衛ゴブリン");
                const cragenA = new cragen(false, "クラーゲンA");
                this.state.enemies.push(new FireGolem());
                this.state.enemies.push(guardGoblin);
                this.state.enemies.push(cragenA);
            } else {
                const toughGoblin = new Goblin("強化ゴブリン");
                toughGoblin.max_hp = Math.floor(toughGoblin.max_hp * 1.3);
                toughGoblin._hp = toughGoblin.max_hp;
                toughGoblin.def = Math.floor(toughGoblin.def * 1.25);
                this.state.enemies.push(toughGoblin);
                this.state.enemies.push(new cragen(false, "クラーゲンA"));
                this.state.enemies.push(new Onryo());
            }
        }

        this.executor.party = this.state.party;
        this.executor.enemies = this.state.enemies;
        this.executor.director.party = this.state.party;
        this.executor.director.enemies = this.state.enemies;

        this.state.initBattleAV();
        
        
        if (this.ui.updateRelicBar) {
            this.ui.updateRelicBar(this.gameManager.relics);
        }
        
        // ----------------------------------------------------
        // ★追加: レリックの発動チェック
        // ----------------------------------------------------
        this.gameManager.relics.forEach(relicId => {
            const relic = RelicData[relicId];
            if (!relic) return;

            // タイプが「戦闘開始時(battle_start)」なら発動
            if (relic.type === 'battle_start') {
                
                // ログ表示
                setTimeout(() => {
                    this.ui.addLog(`[レリック] ${relic.name} が輝きだした！`, "#e67e22");
                }, 500);

                if (relic.effect === 'buff_atk') {
                    // ムキムキ像: 全員攻撃UP
                    this.state.party.forEach(p => { 
                        if(p.is_alive()) p.buffs.atk_up = 3; 
                    });
                    // エフェクト（オレンジのフラッシュとか）
                    setTimeout(() => this.effects.flash("rgba(255, 100, 0, 0.3)"), 800);
                }
                else if (relic.effect === 'buff_regen') {
                    // 癒しのオーブ: 全員リジェネ
                    this.state.party.forEach(p => { 
                        if(p.is_alive()) {
                            p.buffs.regen = 3; 
                            p.regen_value = 0.1;
                        }
                    });
                    setTimeout(() => this.effects.flash("rgba(0, 255, 100, 0.3)"), 800);
                }
            }
        });
        this.updateUI(); // バフアイコンを反映

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
        // ★修正: 敗北判定ロジックを変更
        // 「ざぼち以外」の生存者数を数える
        const aliveMembers = this.state.getAliveParty().filter(p => !(p instanceof GodCat));
        
        // 「ざぼち以外の生存者が0」 または 「敵全滅（勝利）」の場合に終了処理へ
        if (aliveMembers.length === 0 || this.state.checkVictory()) {
            this.processEndGame();
            return;
        }

        if (this.state.checkGameOver() || this.state.checkVictory()) {
            this.processEndGame();
            return;
        }

        if (!this.areAllEnemiesDown()) {
            this.resetAllOutState();
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
        
        // ★追加：ざぼち（NPC）のターン処理
        if (actor instanceof GodCat) {
            await this.handleZabochiTurn(actor);
            return;
        }
        
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
            
            const prevHp = actor.hp;
            actor.add_hp(-poisonDmg);
            this._playDamageSeIfHpReduced(actor, prevHp);
            this.ui.addLog(`> ${actor.name}は毒で ${poisonDmg} のダメージ！`, "#9b59b6");
            
            // ターン切れなら削除
            if (actor.debuffs.poison <= 0) {
                delete actor.debuffs.poison;
                this.ui.addLog(`${actor.name}の毒が消えた`, "#bdc3c7");
            }

            // 描画更新: 毒で死んだ場合の画像更新なども含めて行う
            //this.ui.refreshEnemyGraphics(this.state.enemies); 
            // その後にアイコン（数値）を更新する
            this.updateUI();
            
            // 演出待ち
            await new Promise(r => setTimeout(r, 600));

            // 毒で倒れた場合
            if (!actor.is_alive()) {
                this.ui.addLog(`${actor.name}は 毒に蝕まれ、力尽きた...`, "#e74c3c");
                const targetId = this.executor.director._getTargetId(actor);
                this.executor.director._checkDeath(actor, targetId);
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

        if (!actor.job && actor.down && actor.is_alive()) {
            if (actor.isBoss) {
                this.ui.addLog(`${actor.name}は立ち上がった！`, UiColors.LOG_SYSTEM);
                actor.down = false;
                actor.downUsed = false;
                if (actor.breakMax) actor.breakGauge = actor.breakMax;
                this.updateUI();
                await new Promise(r => setTimeout(r, 600));
            } else {
                this.ui.addLog(`${actor.name}はダウン中で動けない！`, UiColors.LOG_SYSTEM);
                actor.down = false;
                actor.downUsed = false;
                if (actor.lavaCharging) actor.lavaCharging = false;
                if (actor.curseCharging) actor.curseCharging = false;
                this.updateUI();
                await new Promise(r => setTimeout(r, 600));
                await this.processTurnEnd(actor);
                this.nextTurn();
                return;
            }
        }

        if (actor.job) {
            this.showCommandMenu(actor);
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

        if (actor.buffs.mp_regen > 0) {
            const mpRec = GameConfig.BATTLE.MP_REGEN_VALUE;
            actor.add_mp(mpRec);
            this.ui.addLog(`> ${actor.name}のMPが ${mpRec} 回復した(祈り)`, UiColors.HEAL_MP);
        }

        if (actor.debuffs && actor.debuffs.curse > 0) {
            const curseDmg = Math.max(1, Math.floor(actor.max_hp * GameConfig.BATTLE.CURSE_POISON_PERCENT));
            const prevHp = actor.hp;
            actor.add_hp(-curseDmg);
            this._playDamageSeIfHpReduced(actor, prevHp);
            this.ui.addLog(`> ${actor.name}は呪いで ${curseDmg} のダメージ！`, "#7f8c8d");
            this.updateUI();
            await new Promise(r => setTimeout(r, 600));
            if (!actor.is_alive()) {
                this.ui.addLog(`${actor.name}は呪いに蝕まれ、力尽きた...`, "#e74c3c");
                const targetId = this.executor.director._getTargetId(actor);
                this.executor.director._checkDeath(actor, targetId);
                return;
            }
        }

        const processBox = (box, typeName) => {
            for (const key in box) {
                //  毒(poison)はターン開始時に処理済みなので、ここでは触らない あとで追記するかも
                if (key === 'poison' || key === 'curse' || key === 'mp_regen') continue;

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

        if (actor.buffs.mp_regen > 0) {
            actor.buffs.mp_regen--;
            if (actor.buffs.mp_regen <= 0) delete actor.buffs.mp_regen;
        }

        if (actor.debuffs && actor.debuffs.curse > 0) {
            actor.debuffs.curse--;
            if (actor.debuffs.curse <= 0) {
                delete actor.debuffs.curse;
                this.ui.addLog(`${actor.name}の呪いが消えた`, "#bdc3c7");
            }
        }

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

    showCommandMenu(actor) {
        this.ui.showCommands(
            actor,
            (act) => this.handlePlayerAction(actor, act)
        );
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
                    potentialTargets = this.state.party.filter(m => !m.is_alive() && !(m instanceof GodCat));
                } else if (['heal', 'buff', 'regen', 'mp_recovery'].includes(skill.type)) {
                    potentialTargets = this.state.party.filter(m => m.is_alive() && !(m instanceof GodCat));
                } else {
                    potentialTargets = this.state.getAliveEnemies();
                }
                this.ui.showTargetMenu(
                    potentialTargets,
                    (selectedTarget) => {
                        action.target = selectedTarget;
                        this._startExecute(actor, action);
                    },
                    () => this.showCommandMenu(actor)
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
                () => this.showCommandMenu(actor)
            );
            return;
        }
        
        if (action.type === 'item' && !action.target) {
            const item = action.detail;
            let potentialTargets = (item.id === 'phoenix') ? this.state.party.filter(m => !m.is_alive()&& !(m instanceof GodCat)) 
                : this.state.party.filter(m => m.is_alive()&& !(m instanceof GodCat));

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
        
        const isNotZabochi = (p) => !(p instanceof GodCat);

        for (let i = 0; i < actionCount; i++) {
            if (!enemy.is_alive() || this.state.getAliveParty().length === 0) break;

            if (i > 0) {
                await new Promise(r => setTimeout(r, 1000));
                this.ui.addLog(`${enemy.name}の猛攻！(連続行動)`, "#ff0000");
            }

            // ★修正: 定義済みの関数(isNotZabochi)を使ってフィルタリング
            const targetableParty = this.state.getAliveParty().filter(isNotZabochi);

            // もしターゲットがいなくなったら本来のリストを使う保険
            const targets = targetableParty.length > 0 ? targetableParty : this.state.getAliveParty();

            let action = this.ai.think(enemy, targets, this.state.getAliveEnemies());
            this._recordLastAction(enemy, action);
            await this.executor.execute(enemy, action.target, action);
            this.updateUI();
        }
        
        await this.processTurnEnd(enemy);
        this.nextTurn();
    }
    
    /**
     * ざぼちの自動行動ターン
     */
    async handleZabochiTurn(actor) {
        this.ui.highlightActiveMember(-1); // 誰のカードもハイライトしない
        this.ui.commandContainer.innerHTML = "";
        
        await new Promise(r => setTimeout(r, 600));

        // 行動ログ
        this.ui.addLog('みんな頑張るにゃ', "#f1c40f");
        this.bgm.playHeal();
        
        // 味方全員（ざぼち以外）を回復
        let healed = false;
        this.state.party.forEach((p, index) => {
            // 自分以外 かつ 生きているメンバー
            if (p !== actor && p.is_alive()) {
                p.add_hp(50);
                p.add_mp(10);
                p.atk += 1;
                
                // カードに回復エフェクトを出す
                // ※indexは0,1,2と対応
                this.effects.healEffect(`card-${index}`);
                healed = true;
            }
        });

        if (healed) {
            this.ui.addLog("味方全員のHP・MPが回復した！", "#2ecc71");
        }
        
        this.updateUI();
        await new Promise(r => setTimeout(r, 1000));
        
        this.nextTurn();
    }
    
    
    async checkUniqueEnemyEvent(enemy) {
        if (enemy instanceof IceDragon && enemy.hp <= (enemy.max_hp * 0.5)) {
            
            // 1. 変身（データ）
            if (enemy.toBerserkMode()) {
                
                // 2. 変身演出（Director）
                await this.executor.director.playDragonTransformation(enemy, this.state.enemies);
                
                // 3.  絶望と復活のイベント
                await this.executor.director.playDespairAndRevival(this.state.party);
                

                // 4. UI更新（HPが満タンになった状態を反映）
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
            // 名前
            const nameLabel = document.getElementById(`p${i}-name`);
            if (nameLabel) nameLabel.innerText = p.name;

            // ★修正: 取得できた場合のみ書き込む (if文を追加)
            const hpText = document.getElementById(`p${i}-hp-text`);
            if (hpText) hpText.innerText = `HP: ${p.hp} / ${p.max_hp}`;

            const mpText = document.getElementById(`p${i}-mp-text`);
            if (mpText) mpText.innerText = `MP: ${p.mp} / ${p.max_mp}`;
            
            const hpBar = document.getElementById(`p${i}-hp-bar`);
            if (hpBar) hpBar.style.width = `${(p.hp / p.max_hp) * 100}%`;

            const mpBar = document.getElementById(`p${i}-mp-bar`);
            if (mpBar) mpBar.style.width = `${(p.mp / p.max_mp) * 100}%`;
            
            const card = document.getElementById(`card-${i}`);
            // ★カードが存在する場合のみ中身を更新
            if (card) {
                card._memberRef = p; 
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
                    if (p.debuffs && p.debuffs.atk_down) badgesHTML += `<div class="status-badge badge-debuff" title="攻撃DOWN">⏬<span class="badge-num">${p.debuffs.atk_down}</span></div>`;
                    if (p.debuffs && p.debuffs.poison) badgesHTML += `<div class="status-badge badge-debuff" title="毒">☠️<span class="badge-num">${p.debuffs.poison}</span></div>`;
                    if (p.debuffs && p.debuffs.curse) badgesHTML += `<div class="status-badge badge-debuff" title="呪い">🕯️<span class="badge-num">${p.debuffs.curse}</span></div>`;
                }
                badgeContainer.innerHTML = badgesHTML;
            }
        });

        // --- 2. 敵の更新 ---
        this.state.enemies.forEach((enemy, i) => {
            if (!enemy.is_alive()) return;

            const unitDiv = document.getElementById(`enemy-sprite-${i}`);
            if (!unitDiv) return; // 画像がない場合はスキップ

            let badgeContainer = unitDiv.querySelector('.enemy-status-container');
            if (!badgeContainer) {
                badgeContainer = document.createElement('div');
                badgeContainer.className = 'enemy-status-container';
                unitDiv.appendChild(badgeContainer);
            }

            let badgesHTML = "";
            if (enemy.buffs.atk_up) badgesHTML += `<div class="status-badge badge-buff" title="攻撃UP">⚔️<span class="badge-num">${enemy.buffs.atk_up}</span></div>`;
            if (enemy.buffs.regen) badgesHTML += `<div class="status-badge badge-regen" title="リジェネ">✨<span class="badge-num">${enemy.buffs.regen}</span></div>`;
            if (enemy.debuffs && enemy.debuffs.poison) badgesHTML += `<div class="status-badge badge-debuff" title="毒">☠️<span class="badge-num">${enemy.debuffs.poison}</span></div>`;
            if (enemy.debuffs && enemy.debuffs.atk_down) badgesHTML += `<div class="status-badge badge-debuff" title="攻撃DOWN">⏬<span class="badge-num">${enemy.debuffs.atk_down}</span></div>`;
            if (enemy.debuffs && enemy.debuffs.curse) badgesHTML += `<div class="status-badge badge-debuff" title="呪い">🕯️<span class="badge-num">${enemy.debuffs.curse}</span></div>`;

            badgeContainer.innerHTML = badgesHTML;

            const weaknessLabel = unitDiv.querySelector('.enemy-weakness');
            if (weaknessLabel) {
                weaknessLabel.innerText = this.ui.getWeaknessLabel(enemy.weaknessTag);
            }

            const downLabel = unitDiv.querySelector('.enemy-down');
            if (downLabel) {
                downLabel.style.display = enemy.down ? 'inline-flex' : 'none';
            }

            const breakBar = unitDiv.querySelector('.enemy-break-bar');
            if (breakBar && enemy.breakMax) {
                const breakPercent = Math.max(0, (enemy.breakGauge / enemy.breakMax) * 100);
                breakBar.style.width = `${breakPercent}%`;
            }
        });

        // --- 3. 行動順リストの更新 ---
        const allAlive = [...this.state.party, ...this.state.enemies].filter(c => c.is_alive());
        const sortedQueue = allAlive.sort((a, b) => a.actionValue - b.actionValue);

        this.ui.updateTurnOrder(sortedQueue, this.state.currentRound);
    }
    
    async _startExecute(actor, action) {
        if (this.isProcessing) return;
        this.isProcessing = true;
        this.ui.commandContainer.innerHTML = "";

        if (!action.target) {
            if (action.type === 'all_out') {
                action.target = this.state.getAliveEnemies();
            } else if (action.detail && action.detail.target === 'all') {
                action.target = this.state.getAliveEnemies();
            } else {
                action.target = this.state.getAliveEnemies()[0];
            }
        }
        
        // ★追加: ターゲットが「配列（複数対象）」の場合、そこからざぼちを抜く
        // これで全体攻撃やランダム攻撃の対象からも外れます
        if (Array.isArray(action.target)) {
            action.target = action.target.filter(t => !(t instanceof GodCat));
        } else {
            // 単体ターゲットの場合も、もしざぼちが指定されていたら無効化する（念のため）
            if (action.target instanceof GodCat) {
                console.log("ざぼちへの攻撃を無効化");
                this.isProcessing = false;
                this.nextTurn(); // ターンをスキップさせる
                return;
            }
        }

        this._recordLastAction(actor, action);
        await this.executor.execute(actor, action.target, action);
        await this.handleAllOutChance();
        await this.processTurnEnd(actor);
        this.nextTurn();
    }

    _recordLastAction(actor, action) {
        this.lastAction = { actor, action };
    }

    _isAbsoluteZeroAction(action) {
        if (!action || action.type !== 'skill') return false;
        const detail = action.detail;
        if (!detail) return false;
        return detail.id === 'absolute_zero'
            || detail.id === 'absolute-zero'
            || detail.name === '絶対零度';
    }

    areAllEnemiesDown() {
        const aliveEnemies = this.state.getAliveEnemies();
        return aliveEnemies.length > 0 && aliveEnemies.every(enemy => enemy.down);
    }

    resetAllOutState() {
        this.wasAllDown = false;
        this.allOutPrompted = false;
    }

    async handleAllOutChance() {
        const allDown = this.areAllEnemiesDown();
        if (!allDown) {
            this.resetAllOutState();
            return;
        }

        if (this.wasAllDown || this.allOutPrompted) return;

        this.ui.addLog("トリニティアタックのチャンス！", UiColors.LOG_IMPORTANT);
        this.bgm.playSpecialReady();
        this.wasAllDown = true;
        this.allOutPrompted = true;

        const doAllOut = await this.ui.showAllOutPrompt();
        if (!doAllOut) {
            this.ui.addLog("トリニティアタックを見送った！", UiColors.LOG_SYSTEM);
            this.state.getAliveEnemies().forEach(enemy => {
                enemy.down = false;
                enemy.downUsed = false;
            });
            this.resetAllOutState();
            this.updateUI();
            return;
        }

        this.bgm.playSpecial();
        await this.ui.playAllOutAnimation();
        await this.executor.executeAllOutAttack();
        this.updateUI();
    }
    
    cleanup() {
        if (this.bgm) this.bgm.stopBGM(); 
        this.isProcessing = false;
        this._cleanupBattleOverlays();

        // 敵エリアのスタイルも戻しておく（念のため）
        const enemyArea = document.getElementById('canvas-area');
        if (enemyArea) {
            enemyArea.style.position = '';
            enemyArea.style.overflow = '';
        }
        const allEnemies = document.querySelectorAll('.enemy-img');
        allEnemies.forEach(img => {
            img.classList.remove('sway-slow', 'flash-rapid', 'shake-target', 'violent-shake');
        });

        // ★追加：画面全体の揺れ（メテオなどで付くやつ）も強制停止！
        document.body.classList.remove('screen-shake');
        const wrapper = document.getElementById('game-wrapper');
        if (wrapper) wrapper.classList.remove('screen-shake');
    }

    _cleanupBattleOverlays() {
        const overlayIds = [
            'active-blizzard',
            'flash-overlay',
            'despair-blizzard',
            'dragon-event-overlay',
            'dragon-event-flash'
        ];
        overlayIds.forEach((id) => {
            const el = document.getElementById(id);
            if (el) el.remove();
        });

        const overlayClasses = ['despair-overlay', 'allout-overlay', 'allout-prompt'];
        overlayClasses.forEach((id) => {
            const el = document.getElementById(id);
            if (el) el.classList.remove('is-active');
        });

        document.querySelectorAll('.flash-red, .flash-gold, .zabochi-appear').forEach((el) => {
            el.remove();
        });

    }

    _ensureDespairBlizzardOverlay() {
        const canvasArea = document.getElementById(GameConfig.UI.IDS.CANVAS_AREA);
        if (!canvasArea) return null;
        let overlay = document.getElementById(GameConfig.UI.IDS.DESPAIR_BLIZZARD);
        if (!overlay) {
            overlay = document.createElement('div');
            overlay.id = GameConfig.UI.IDS.DESPAIR_BLIZZARD;
            overlay.className = UiClasses.BLIZZARD_CONTAINER;
            overlay.innerHTML = `
                <div class="${UiClasses.SNOW_LAYER_BACK}"></div>
                <div class="${UiClasses.SNOW_LAYER_MIDDLE}"></div>
                <div class="${UiClasses.SNOW_LAYER_FRONT}"></div>
            `;
        }
        canvasArea.appendChild(overlay);
        return overlay;
    }

    processEndGame() {
        this.isProcessing = false;
        this._cleanupBattleOverlays();
        this.updateUI(); 

        const win = this.state.checkVictory();
        this.bgm.stopBGM();
        if (win) {
            this.ui.addLog("戦いに勝利した！", "#f1c40f");
            this.bgm.playWin(); 
        } else {
            this.ui.addLog("全滅した...", "#e74c3c");
            const isAwakenedBoss = this.state.enemies.some(enemy => enemy.isBoss && enemy.isBerserk);
            if (isAwakenedBoss) {
                const didAbsoluteZero = this.lastAction
                    && this.lastAction.actor
                    && this.lastAction.actor.isBoss
                    && this.lastAction.actor.isBerserk
                    && this._isAbsoluteZeroAction(this.lastAction.action);
                if (didAbsoluteZero) {
                    const blizzardOverlay = this._ensureDespairBlizzardOverlay();
                    if (blizzardOverlay) blizzardOverlay.classList.add('is-active');
                } else {
                    const despairOverlay = document.getElementById('despair-overlay');
                    if (despairOverlay) despairOverlay.classList.add('is-active');
                }
            }
        }

        setTimeout(() => {
            const overlay = document.getElementById('result-overlay');
            const title = document.getElementById('result-title');
            
            // 既存のボタン（HTMLにあるもの）は一旦隠すか削除して、
            // JS側で完全にコントロールする方がデザインを統一しやすいです
            const oldBtn = document.getElementById('restart-button');
            if (oldBtn) oldBtn.style.display = 'none';

            title.innerText = win ? "VICTORY" : "DEFEAT...";
            title.className = win ? "victory-title" : "defeat-title";
            overlay.style.display = 'flex'; 

            // --- ボタンコンテナの準備 ---
            let btnContainer = document.getElementById('end-btn-container');
            if (!btnContainer) {
                btnContainer = document.createElement('div');
                btnContainer.id = 'end-btn-container';
                // 親要素に追加（restart-buttonの親、またはoverlay直下）
                if (oldBtn && oldBtn.parentNode) {
                    oldBtn.parentNode.appendChild(btnContainer);
                } else {
                    overlay.appendChild(btnContainer);
                }
            }
            // 中身をリセット
            btnContainer.innerHTML = '';
            
            // コンテナのスタイル（Flexboxで整列）
            Object.assign(btnContainer.style, {
                display: 'flex',
                flexDirection: 'column', // 縦並び
                gap: '15px',
                marginTop: '20px',
                alignItems: 'center',
                width: '100%'
            });

            // --- 共通のボタンスタイル生成関数 ---
            const createBtn = (text, color, onClick) => {
                const btn = document.createElement('button');
                btn.innerText = text;
                Object.assign(btn.style, {
                    padding: '12px 24px',
                    fontSize: '16px',
                    fontWeight: 'bold',
                    color: 'white',
                    background: color,
                    border: 'none',
                    borderRadius: '50px', // 丸っこく統一
                    cursor: 'pointer',
                    boxShadow: '0 4px 0 rgba(0,0,0,0.2)',
                    transition: 'all 0.1s',
                    minWidth: '200px', // 幅を統一
                    fontFamily: 'inherit'
                });
                // 押した時の凹み演出
                btn.onmousedown = () => { btn.style.transform = 'translateY(2px)'; btn.style.boxShadow = '0 2px 0 rgba(0,0,0,0.2)'; };
                btn.onmouseup   = () => { btn.style.transform = 'translateY(0)';   btn.style.boxShadow = '0 4px 0 rgba(0,0,0,0.2)'; };
                
                btn.onclick = onClick;
                return btn;
            };

            // --- 勝利時のボタン ---
            if (win) {
                const nextBtn = createBtn("次へ進む", "#f1c40f", () => {
                    this.cleanup();
                    if (this.gameManager) this.gameManager.onBattleWin();
                });
                btnContainer.appendChild(nextBtn);
            } 
            // --- 敗北時のボタン（3つ） ---
            else {
                // 1. そのまま再挑戦
                const retryBtn = createBtn("再挑戦", "#e67e22", () => {
                    this.ui.addLog("再挑戦します...", "#fff");
                    this.retry(false); // 通常リトライ
                });

                // 2. 全回復して再挑戦（救済）
                const fullHealBtn = createBtn("全回復して再挑戦", "#2ecc71", () => { // 緑色
                    this.ui.addLog("力を取り戻して再挑戦！", "#fff");
                    this.retry(true); // ★全回復リトライ
                });

                // 3. タイトルへ
                const titleBtn = createBtn("タイトルへ戻る", "#7f8c8d", () => { // グレー
                    this.cleanup();
                    location.reload(); 
                });

                btnContainer.appendChild(retryBtn);
                btnContainer.appendChild(fullHealBtn);
                btnContainer.appendChild(titleBtn);
            }

        }, 1000); 
    }
    
    /**
     * バトルを最初からやり直す
     * @param {boolean} isFullHeal - trueならHP/MPを全回復状態で始める
     */
    retry(isFullHeal = false) {
        // 1. パーティのステータスを戦闘開始前に戻す
        this.state.party.forEach((p, i) => {
            if (this.backupData.partyState[i]) {
                p._hp = this.backupData.partyState[i].hp;
                p._mp = this.backupData.partyState[i].mp;
                p.is_dead = (p._hp <= 0);
                p.clear_all_buffs();
            }
        });

        // 助っ人などがいたら外す
        if (this.state.party.length > this.backupData.partyState.length) {
            this.state.party.splice(this.backupData.partyState.length);
        }

        // ★追加: 全回復モードなら、ここで回復させる
        if (isFullHeal) {
            this.state.party.forEach(p => {
                p.revive(p.max_hp);
                p.add_mp(p.max_mp);
            });
            this.ui.addLog("体力を全回復して再挑戦！", "#2ecc71");
        } else {
            this.ui.addLog("戦闘開始時の状態で再挑戦！", "#e67e22");
        }

        // 2. アイテムの数を戻す
        for (const key in this.backupData.inventoryState) {
            if (this.ui.inventory[key]) {
                this.ui.inventory[key].count = this.backupData.inventoryState[key].count;
            }
        }
        
        // 3. UIのリセット
        const overlay = document.getElementById('result-overlay');
        if (overlay) overlay.style.display = 'none';
        
        this.cleanupRetry();

        // 4. バトル再セットアップ
        this.setupBattle(
            this.state.party, 
            this.ui.inventory, 
            this.backupData.enemyType, 
            this.backupData.bgmType
        );
    }
    
    // リトライ用のお掃除メソッド（BGMは止めない）
    cleanupRetry() {
        this.isProcessing = false;
        this._cleanupBattleOverlays();
        
        const enemyArea = document.getElementById('enemy-area');
        if (enemyArea) { 
            enemyArea.style.position = ''; 
            enemyArea.style.overflow = ''; 
        }
        
        document.querySelectorAll('.enemy-img').forEach(img => {
            img.classList.remove('sway-slow', 'flash-rapid', 'shake-target', 'violent-shake');
        });
        
        document.body.classList.remove('screen-shake');
        const wrapper = document.getElementById('game-wrapper');
        if (wrapper) wrapper.classList.remove('screen-shake');
    }
}
