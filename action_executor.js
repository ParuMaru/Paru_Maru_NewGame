import { BattleCalculator } from './battle_calculator.js';
import { BattleDirector } from './battle_director.js'; 
import { Slime } from './entities.js';

export class ActionExecutor {
    constructor(ui, music, effects, enemies, party) {
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
        
        this.director.refreshStatus();
    }

    async _executeAttack(actor, target) {
        const isMagicUser = this.director.showAttackStart(actor);
        const targets = Array.isArray(target) ? target : [target];

        targets.forEach(originalTarget => {
            if (!originalTarget.is_alive()) return;

            const { finalTarget, isCovered } = this._resolveCover(actor, originalTarget);
            
            let { damage, isCritical } = BattleCalculator.calculateDamage(actor, finalTarget, null);
            if (isCovered) damage = Math.floor(damage * 0.8); 

            finalTarget.add_hp(-damage);
            this.director.showPhysicalHit(finalTarget, damage, isCritical, isMagicUser);
        });
        this.director.music.playDamage(); 
    }

    async _executeSkill(actor, target, skill) {
        const targets = Array.isArray(target) ? target : [target];
        
        this.director.showSkillStart(actor, skill);
        
        if (skill.type !== 'res') {
            actor.add_mp(-skill.cost);
        }
        
        switch (skill.type) {
            case 'physical': 
                if (skill.id === 'acid') this.director.music.playPoison(); 
                else if (skill.id === 'dragon_claw') this.director.music.playAttack(); 
                else this.director.music.playAttack(); 

                targets.forEach(originalTarget => {
                    if (!originalTarget.is_alive()) return;
                    
                    const { finalTarget, isCovered } = this._resolveCover(actor, originalTarget);
                    let { damage, isCritical } = BattleCalculator.calculateDamage(actor, finalTarget, skill);
                    if (isCovered) damage = Math.floor(damage * 0.8);

                    finalTarget.add_hp(-damage);
                    
                    const targetId = this.director._getTargetId(finalTarget); 
                    if (skill.id === 'dragon_claw') this.director.effects.clawEffect(targetId);
                    else this.director.effects.slashEffect(targetId); 

                    this.director.showPhysicalHit(finalTarget, damage, isCritical, false);
                });
                this.director.music.playDamage();
                break;
                
            case 'magic':
                this.director.showMagicEffect(skill, targets);
                targets.forEach(t => {
                    if (t.is_alive()) {
                        let { damage } = BattleCalculator.calculateDamage(actor, t, skill);
                        t.add_hp(-damage);
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
                    // ★修正: ['atk_up'] -> .atk_up
                    targets.forEach(t => {
                        if (t.is_alive()) t.buffs.atk_up = 3; 
                    });
                    this.director.showBuff(targets, skill.name);
                }
                break;

            case 'regen': 
                this.director.showRegen(actor);
                targets.forEach(t => {
                    if (t.is_alive()) {
                        // ★修正: ['regen'] -> .regen
                        t.buffs.regen = skill.duration;
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
    
    async executeSplit(enemyIndex) {
        const enemy = this.enemies[enemyIndex];
        await this.director.showSplittingTrigger(enemy);
        await new Promise(r => setTimeout(r, 2500)); 
        this.director.showSplittingTransform(enemy.name);
        enemy.add_hp(-9999); 
        this.enemies.splice(enemyIndex, 1, 
            new Slime(false, 'スライムA'), 
            new Slime(false, 'スライムB'), 
            new Slime(false, 'スライムC')
        );
        this.director.ui.refreshEnemyGraphics(this.enemies);
        this.director.showSplittingAppear(enemyIndex);
        await new Promise(r => setTimeout(r, 1000));
    }
}