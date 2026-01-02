import { BattleCalculator } from './battle_calculator.js';
import { BattleDirector } from './battle_director.js'; 
import { Slime } from './entities.js';

export class ActionExecutor {
    constructor(ui, music, effects, enemies, party) {
        // BattleManagerの修正を最小限にするため、ここでDirectorを作る
        this.director = new BattleDirector(ui, music, effects, party, enemies);
        
        this.enemies = enemies;
        this.party = party;
    }

    async execute(actor, target, action) {
        if (action.type === 'attack') {
            await this._executeAttack(actor, target);
        } else if (action.type === 'skill') {
            await this._executeSkill(actor, target, action.detail);
        } else if (action.type === 'item') {
            await this._executeItem(actor, target, action.detail);
        }
        
        // 最後に必ずステータス表示を更新
        this.director.refreshStatus();
    }

    /** 通常攻撃 */
    async _executeAttack(actor, target) {
        // 1. 演出開始
        const isMagicUser = this.director.showAttackStart(actor);
        
        const targets = Array.isArray(target) ? target : [target];

        targets.forEach(originalTarget => {
            if (!originalTarget.is_alive()) return;

            // 2. ロジック（かばう判定）
            const { finalTarget, isCovered } = this._resolveCover(actor, originalTarget);
            
            // 3. 計算（Calculator）
            let { damage, isCritical } = BattleCalculator.calculateDamage(actor, finalTarget, null);
            if (isCovered) damage = Math.floor(damage * 0.8); 

            // 4. データ反映
            finalTarget.add_hp(-damage);
            
            // 5. 結果演出（Director）
            this.director.showPhysicalHit(finalTarget, damage, isCritical, isMagicUser);
        });
        
        // ダメージ音を最後にまとめて鳴らす
        this.director.music.playDamage(); 
    }

    /** スキル実行 */
    async _executeSkill(actor, target, skill) {
        const targets = Array.isArray(target) ? target : [target];
        
        // 1. 演出開始
        this.director.showSkillStart(actor, skill);
        
        if (skill.type !== 'res') {
            actor.add_mp(-skill.cost);
        }
        
        switch (skill.type) {
            case 'physical': 
                if (skill.id === 'acid') {
                    this.director.music.playPoison(); 
                } else {
                    this.director.music.playAttack(); 
                }
                targets.forEach(originalTarget => {
                    if (!originalTarget.is_alive()) return;
                    
                    const { finalTarget, isCovered } = this._resolveCover(actor, originalTarget);
                    
                    // 計算
                    let { damage, isCritical } = BattleCalculator.calculateDamage(actor, finalTarget, skill);
                    if (isCovered) damage = Math.floor(damage * 0.8);

                    // 反映
                    finalTarget.add_hp(-damage);
                    
                    // 演出
                    // スキル用エフェクトとして物理ヒット演出を流用
                    const targetId = this.director._getTargetId(finalTarget); 
                    this.director.effects.slashEffect(targetId); 
                    this.director.showPhysicalHit(finalTarget, damage, isCritical, false);
                });
                this.director.music.playDamage();
                break;
                
            case 'magic':
                // 魔法エフェクト再生
                this.director.showMagicEffect(skill, targets);
                
                targets.forEach(t => {
                    if (t.is_alive()) {
                        // 計算
                        let { damage } = BattleCalculator.calculateDamage(actor, t, skill);
                        // 反映
                        t.add_hp(-damage);
                        // 演出
                        this.director.showMagicHit(t, damage);
                    }
                });
                this.director.music.playDamage();
                break;

            case 'heal':
                this.director.music.playHeal();
                targets.forEach(t => {
                    if (t.is_alive()) {
                        let { amount } = BattleCalculator.calculateHeal(actor, skill);
                        t.add_hp(amount);
                        this.director.showHeal(t, amount,false,false);
                    }
                });
                break;

            case 'res': 
                if (actor.mp >= skill.cost) {
                    actor.add_mp(-skill.cost);
                    // 蘇生ロジック
                    const reviveHp = Math.floor(target.max_hp * 0.5);
                    target.revive(reviveHp);
                    // 演出
                    this.director.showResurrection(target, false);
                } else {
                    // 命の代償
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
                this.director.showHeal(actor, mpRec, true); // true = MP回復演出
                break;
                
            case 'buff':
                if (skill.id === 'cover') {
                    actor.is_covering = true; 
                    this.director.showCover(actor);
                } else if(skill.id === 'encourage') {
                    targets.forEach(t => {
                        if (t.is_alive()) t.buff_turns = 3; 
                    });
                    this.director.showBuff(targets, skill.name);
                }
                break;

            case 'regen': 
                this.director.showRegen(actor);
                targets.forEach(t => {
                    if (t.is_alive()) {
                        t.regen_turns = skill.duration;
                        t.regen_value = skill.value;
                        const tId = this.director._getTargetId(t);
                        this.director.effects.healEffect(tId);
                    }
                });
                break;
        }
    }
    
    _resolveCover(actor, originalTarget) {
        let finalTarget = originalTarget;
        let isCovered = false;
        if (this.enemies.includes(actor) && this.party.includes(originalTarget)) {
            const hero = this.party.find(m => m.is_covering && m.is_alive());
            if (hero && originalTarget !== hero) {
                // Directorにかばうログを出させる
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
        else if (item.type === 'hp_heal') {
            target.add_hp(item.value);
            this.director.showHeal(target, item.value, false);
        } 
        else if (item.type === 'mp_heal') {
            target.add_mp(item.value);
            this.director.showHeal(target, item.value, true);
        }
    }
    
    /**
     * 分裂イベントの実行
     * @param {number} enemyIndex - 分裂する敵のインデックス
     */
    async executeSplit(enemyIndex) {
        const enemy = this.enemies[enemyIndex];
        
        // 1. 予兆演出
        await this.director.showSplittingTrigger(enemy);
        await new Promise(r => setTimeout(r, 2500)); // 溜め

        // 2. 変身演出
        this.director.showSplittingTransform(enemy.name);
        
        // 3. データ処理（分裂）
        enemy.add_hp(-9999); // 元の個体は消滅
        
        // 配列を書き換えて、1体を3体に増やす
        this.enemies.splice(enemyIndex, 1, 
            new Slime(false, 'スライムA'), 
            new Slime(false, 'スライムB'), 
            new Slime(false, 'スライムC')
        );

        // 4. 画面更新（敵が増えたので作り直し）
        this.director.ui.refreshEnemyGraphics(this.enemies);
        
        // 5. 登場演出
        this.director.showSplittingAppear(enemyIndex);
        
        await new Promise(r => setTimeout(r, 1000));
    }
}