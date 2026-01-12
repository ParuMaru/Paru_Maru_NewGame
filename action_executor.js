import { BattleCalculator } from './battle_calculator.js';
import { BattleDirector } from './battle_director.js'; 
import { cragen } from './entities.js';
import { GameConfig } from './game_config.js';

export class ActionExecutor {
    constructor(ui, music, effects, enemies, party,gameManager) {
        this.director = new BattleDirector(ui, music, effects, party, enemies);
        this.enemies = enemies;
        this.party = party;
        this.gameManager = gameManager;
    }

    _playDamageSeIfHpReduced(target, prevHp) {
        if (prevHp > target.hp) {
            this.director.music.playDamage();
        }
    }

    _playAttackHitSe(attackTag) {
        if (!attackTag) return;
        if (attackTag === 'slash') {
            this.director.music.playAttack();
            return;
        }
        this.director.music.playElementHit(attackTag);
    }

    async execute(actor, target, action) {
        if (action.type === 'attack') {
            await this._executeAttack(actor, target);
        } else if (action.type === 'skill') {
            await this._executeSkill(actor, target, action.detail);
        } else if (action.type === 'item') {
            await this._executeItem(actor, target, action.detail);
        } else if (action.type === 'all_out') {
            await this._executeAllOut(actor);
        }
        
        this.director.refreshStatus();
    }

    async _executeAttack(actor, target) {
        const isMagicUser = this.director.showAttackStart(actor);
        const targets = Array.isArray(target) ? target : [target];
        const attackTag = this._getAttackTag(actor, null);
        let hitSoundPlayed = false;
        
        // ★追加: レリックリストを取得
        const relics = this.gameManager ? this.gameManager.relics : [];

        targets.forEach(originalTarget => {
            if (!originalTarget.is_alive()) return;

            const { finalTarget, isCovered } = this._resolveCover(actor, originalTarget);
            
            // ★修正: calculateDamage の第4引数に relics を渡す
            let { damage, isCritical } = BattleCalculator.calculateDamage(actor, finalTarget, null, relics);
            
            if (isCovered) damage = Math.floor(damage * GameConfig.BATTLE.COVER_DAMAGE_RATE); 

            if (!hitSoundPlayed) {
                const hitSoundTag = attackTag || (isMagicUser ? 'magic' : 'slash');
                this._playAttackHitSe(hitSoundTag);
                hitSoundPlayed = true;
            }

            const prevHp = finalTarget.hp;
            finalTarget.add_hp(-damage);
            this._playDamageSeIfHpReduced(finalTarget, prevHp);
            this.director.showPhysicalHit(finalTarget, damage, isCritical, isMagicUser);
            this._applyWeaknessDown(finalTarget, attackTag);
            this._applyBossBreakDamage(finalTarget, attackTag);
            
            // ----------------------------------------------------
            // ★追加: 【吸血のマント】攻撃時にHP回復
            // 条件: 攻撃者が味方 && 「vampire_cape」を持っている
            // ----------------------------------------------------
            if (actor.job && relics.includes('vampire_cape')) {
                const drainAmount = Math.ceil(damage * GameConfig.RELIC.VAMPIRE_DRAIN_RATE); // ダメージの10%
                if (drainAmount > 0) {
                    actor.add_hp(drainAmount);
                    // 回復演出（ログはうるさいので出さなくてもOK、数字だけ出す）
                    this.director.ui.addLog(`> ${actor.name}はHPを${drainAmount}吸収した`, GameConfig.COLORS.HEAL_HP);
                    this.director.effects.damagePopup(drainAmount, this.director._getTargetId(actor), GameConfig.COLORS.HEAL_HP);
                }
            }
            
            // ヒーラーの攻撃なら「毒」を付与
            if (actor.job === 'healer' && finalTarget.is_alive()) {
                if (!finalTarget.debuffs.poison) {
                    this.director.ui.addLog(`${finalTarget.name}は毒に侵された！`, "#9b59b6");
                }
                finalTarget.debuffs.poison = 3;
            }
        });
    }

    async _executeSkill(actor, target, skill) {
        const targets = Array.isArray(target) ? target : [target];
        
        this.director.showSkillStart(actor, skill);
        
        if (skill.type !== 'res') {
            actor.add_mp(-skill.cost);
        }
        
        switch (skill.type) {
            case 'physical': 
                if (skill.id === 'tentacle') this.director.music.playPoison(); 

                const physicalTag = this._getAttackTag(actor, skill);
                let physicalSoundPlayed = false;
                targets.forEach(originalTarget => {
                    if (!originalTarget.is_alive()) return;
                    
                    const { finalTarget, isCovered } = this._resolveCover(actor, originalTarget);
                    let { damage, isCritical } = BattleCalculator.calculateDamage(actor, finalTarget, skill);
                    if (isCovered) damage = Math.floor(damage * GameConfig.BATTLE.COVER_DAMAGE_RATE);

                    if (!physicalSoundPlayed) {
                        this._playAttackHitSe(physicalTag || 'slash');
                        physicalSoundPlayed = true;
                    }

                    const prevHp = finalTarget.hp;
                    finalTarget.add_hp(-damage);
                    this._playDamageSeIfHpReduced(finalTarget, prevHp);
                    
                    const targetId = this.director._getTargetId(finalTarget); 
                    if (skill.id === 'dragon_claw') this.director.effects.clawEffect(targetId);
                    else if (skill.id === 'shadow_slash') this.director.effects.slashEffect(targetId);
                    else this.director.effects.slashEffect(targetId); 

                    this.director.showPhysicalHit(finalTarget, damage, isCritical, false);
                    this._applyWeaknessDown(finalTarget, physicalTag);
                    this._applyBossBreakDamage(finalTarget, physicalTag);
                });
                break;
                
            case 'magic':
                // ★修正: actor を引数に追加
                this.director.showMagicEffect(actor, skill, targets);
                
                const magicTag = this._getAttackTag(actor, skill);
                let magicSoundPlayed = false;
                targets.forEach(originalTarget => {
                    if (!originalTarget.is_alive()) return;
                    const { finalTarget, isCovered } = this._resolveCover(actor, originalTarget);
                    let { damage } = BattleCalculator.calculateDamage(actor, finalTarget, skill);
                    if (isCovered) {
                        damage = Math.floor(damage * GameConfig.BATTLE.COVER_DAMAGE_RATE);
                    }

                    if (!magicSoundPlayed) {
                        this._playAttackHitSe(magicTag || 'magic');
                        magicSoundPlayed = true;
                    }

                    const prevHp = finalTarget.hp;
                    finalTarget.add_hp(-damage);
                    this._playDamageSeIfHpReduced(finalTarget, prevHp);
                    this.director.showMagicHit(finalTarget, damage);
                    this._applyWeaknessDown(finalTarget, magicTag);
                    this._applyBossBreakDamage(finalTarget, magicTag);
                    
                    if (skill.id === 'curse' && finalTarget.is_alive()) {
                        // 重複しないようにチェックして付与
                        if (!finalTarget.debuffs.atk_down) {
                            finalTarget.debuffs.atk_down = 3; // 3ターン
                            // ログを出す（ui経由で）
                            this.director.ui.addLog(`${finalTarget.name}の攻撃力が下がった！`, "#7f8c8d");
                        }
                    }
                    if (skill.id === 'onryo_curse' && finalTarget.is_alive()) {
                        finalTarget.debuffs.curse = 2;
                        this.director.ui.addLog(`${finalTarget.name}は呪いに蝕まれた！`, "#7f8c8d");
                    }
                });
                break;
                
            case 'heal':
                this.director.music.playHeal();
                targets.forEach(t => {
                    if (t.is_alive()) {
                        let { amount } = BattleCalculator.calculateHeal(actor, skill);
                        t.add_hp(amount);
                        this.director.showHeal(t, amount, false, false);
                    }
                });
                break;

            case 'res': 
                if (actor.mp >= skill.cost) {
                    actor.add_mp(-skill.cost);
                    const reviveHp = Math.floor(target.max_hp * 0.5);
                    target.revive(reviveHp);
                    this.director.showResurrection(target, false);
                } else {
                    this.director.ui.addLog("MPが足りない！癒し手は自らの命を捧げた！", "#ff0000", true);
                    actor.add_hp(-999999); 
                    target.revive(target.max_hp);
                    target.add_mp(target.max_mp);
                    this.director.showResurrection(target, true);
                }
                break;

            case 'mp_recovery':
                const mpRec = Math.floor(skill.value * (0.9 + Math.random() * 0.2));
                actor.add_mp(mpRec);
                this.director.showHeal(actor, mpRec, true); 
                break;
                
            case 'buff':
                if (skill.id === 'cover') {
                    actor.is_covering = true; 
                    this.director.showCover(actor);
                } 
                else if(skill.id === 'encourage' || skill.id === 'howling') {
                    targets.forEach(t => {
                        if (t.is_alive()) t.buffs.atk_up = 3; 
                    });
                    this.director.showBuff(targets, skill.name);
                }
                else if (skill.id === 'lava_charge') {
                    actor.lavaCharging = true;
                    this.director.ui.addLog(`${actor.name}は溶岩を集めている...`, GameConfig.COLORS.LOG_IMPORTANT);
                }
                else if (skill.id === 'curse_charge') {
                    actor.curseCharging = true;
                    this.director.ui.addLog(`${actor.name}は呪気を集めている...`, GameConfig.COLORS.LOG_IMPORTANT);
                }
                break;

            case 'regen': 
                this.director.showRegen(actor);
                targets.forEach(t => {
                    if (t.is_alive()) {
                        t.buffs.regen = skill.duration;
                        t.regen_value = skill.value;
                        const tId = this.director._getTargetId(t);
                        this.director.effects.healEffect(tId);
                    }
                });
                if (actor.job === 'healer') {
                    actor.buffs.mp_regen = 3;
                }
                break;
        }
    }

    async _executeAllOut(actor) {
        await this.executeAllOutAttack();
    }

    async executeAllOutAttack() {
        const targets = this.enemies.filter(enemy => enemy.is_alive());
        if (targets.length === 0) return;

        this.director.ui.addLog("トリニティアタック！", GameConfig.COLORS.LOG_IMPORTANT, true);
        this.director.effects.flash("rgba(255, 215, 0, 0.5)");
        let hitSoundPlayed = false;

        const partyAttack = this.party
            .filter(member => member.is_alive() && member.job)
            .reduce((sum, member) => sum + member.atk, 0);
        const baseDamage = Math.max(1, Math.floor(partyAttack * GameConfig.BATTLE.ALL_OUT_POWER));

        targets.forEach(target => {
            const reduction = Math.floor(target.def / GameConfig.BATTLE.DEF_REDUCTION_RATE);
            const damage = Math.max(1, baseDamage - reduction);
            if (!hitSoundPlayed) {
                this._playAttackHitSe('slash');
                hitSoundPlayed = true;
            }

            const prevHp = target.hp;
            const wasDown = target.down;
            target.add_hp(-damage);
            this._playDamageSeIfHpReduced(target, prevHp);
            this.director.showPhysicalHit(target, damage, false, false);
            target.down = false;
            target.downUsed = false;
            if (target.isBoss && wasDown && target.breakMax) {
                target.breakGauge = target.breakMax;
            }
        });

        this.director.refreshStatus();
    }

    _getAttackTag(actor, skill) {
        if (skill && skill.attackTag) return skill.attackTag;
        if (skill && (skill.type === 'physical' || skill.type === 'magic')) return null;

        if (actor && actor.job === 'hero') return "slash";
        if (actor && actor.job === 'healer') return "holy";
        if (actor && actor.job === 'wizard') return null;
        return "slash";
    }

    _applyWeaknessDown(target, attackTag) {
        if (!attackTag) return;
        if (!target || !target.is_alive()) return;
        if (target.job) return;
        if (!target.weaknessTag) return;
        if (target.downImmune) return;
        if (target.down) return;
        if (target.downUsed) return;
        if (attackTag !== target.weaknessTag) return;

        target.down = true;
        target.downUsed = true;
        target.actionValue += GameConfig.BATTLE.DOWN_DELAY;

        const targetId = this.director._getTargetId(target);
        this.director.effects.damagePopup("DOWN", targetId, GameConfig.COLORS.LOG_IMPORTANT);
        this.director.ui.addLog(`${target.name}はダウンした！`, GameConfig.COLORS.LOG_IMPORTANT);
    }

    _applyBossBreakDamage(target, attackTag) {
        if (!attackTag) return;
        if (!target || !target.is_alive()) return;
        if (!target.isBoss) return;
        if (!target.breakMax) return;
        if (target.down) return;

        const isWeakness = target.weaknessTag && attackTag === target.weaknessTag;
        const breakDamage = isWeakness
            ? GameConfig.BATTLE.BOSS_BREAK_WEAKNESS_DAMAGE
            : GameConfig.BATTLE.BOSS_BREAK_OTHER_DAMAGE;

        if (breakDamage <= 0) return;

        target.breakGauge = Math.max(0, target.breakGauge - breakDamage);
        if (target.breakGauge > 0) return;

        target.down = true;
        target.downUsed = true;
        target.actionValue += GameConfig.BATTLE.DOWN_DELAY;

        const targetId = this.director._getTargetId(target);
        this.director.effects.damagePopup("DOWN", targetId, GameConfig.COLORS.LOG_IMPORTANT);
        this.director.ui.addLog(`${target.name}はブレイクした！`, GameConfig.COLORS.LOG_IMPORTANT);
    }
    
    _resolveCover(actor, originalTarget) {
        let finalTarget = originalTarget;
        let isCovered = false;
        if (this.enemies.includes(actor) && this.party.includes(originalTarget)) {
            const hero = this.party.find(m => m.is_covering && m.is_alive());
            if (hero && originalTarget !== hero) {
                this.director.showCoverAction(hero, originalTarget);
                finalTarget = hero; 
                isCovered = true;
            }
        }
        return { finalTarget, isCovered };
    }
    
    async _executeItem(actor, target, item) {
        this.director.showItemUse(actor, item);
        item.count--;
        if (item.id === 'phoenix') {
            target.revive(Math.floor(target.max_hp * item.value));
            this.director.showResurrection(target, false);
        }
        else if (item.id === 'elixir') {
            // 回復処理
            target.add_hp(target.max_hp);
            target.add_mp(target.max_mp);
            
            //  ここで専用演出を呼ぶだけにする
            this.director.showFullHeal(target); 
        }
        
        else if (item.type === 'hp_heal') {
            target.add_hp(item.value);
            this.director.showHeal(target, item.value, false);
        } 
        else if (item.type === 'mp_heal') {
            target.add_mp(item.value);
            this.director.showHeal(target, item.value, true);
        }
    }
    
    async executeSplit(enemyIndex) {
        const enemy = this.enemies[enemyIndex];
        await this.director.showSplittingTrigger(enemy);
        await new Promise(r => setTimeout(r, 2500)); 
        this.director.showSplittingTransform(enemy.name);
        enemy.add_hp(-9999); 
            // 新しい個体を生成
        const enemyA = new cragen(false, 'クラーゲンA');
        const enemyB = new cragen(false, 'クラーゲンB');
        const enemyC = new cragen(false, 'クラーゲンC');

        const boostStats = (unit) => {
            unit.max_hp = Math.floor(unit.max_hp * 1.15);
            unit._hp = unit.max_hp;
            unit.atk = Math.floor(unit.atk * 1.1);
            unit.def = Math.floor(unit.def * 1.1);
            unit.spd = Math.floor(unit.spd * 1.1);
        };

        [enemyA, enemyB, enemyC].forEach(boostStats);
        enemyA.weaknessTag = "slash";
        enemyB.weaknessTag = "fire";
        enemyC.weaknessTag = "ice";
        
        // 変数名に合わせたプロパティを付与（ui_managerで参照するため）
        enemyA.isSplitLeft = true;
        enemyC.isSplitRight = true;
        
        // 配列を入れ替え
        this.enemies.splice(enemyIndex, 1, enemyA, enemyB, enemyC);
        
        this.director.ui.refreshEnemyGraphics(this.enemies);
        this.director.showSplittingAppear(enemyIndex);
        await new Promise(r => setTimeout(r, 1000));
    }
}
