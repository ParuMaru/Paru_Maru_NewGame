import { GameConfig } from './game_config.js';

export class ActionExecutor {
    constructor(ui, music, effects, enemies, party) {
        this.ui = ui;
        this.music = music;     
        this.effects = effects; 
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
    }

    _getTargetId(target) {
        if (target.job) {
            return `card-${this.party.indexOf(target)}`;
        } else {
            const index = this.enemies.indexOf(target);
            return index >= 0 ? `enemy-sprite-${index}` : 'enemy-target';
        }
    }

    /** 通常攻撃 */
    async _executeAttack(actor, target) {
        this.ui.addLog(`${actor.name}の攻撃！`);
        this.music.playAttack();
        
        const targets = Array.isArray(target) ? target : [target];

        targets.forEach(originalTarget => {
            if (!originalTarget.is_alive()) return;

            const { finalTarget, isCovered } = this._resolveCover(actor, originalTarget);
            
            const targetId = this._getTargetId(finalTarget);

            // エフェクト
            this.effects.slashEffect(targetId);

            let damage = Math.max(1, actor.atk - Math.floor(finalTarget.def / 2));
            if (isCovered) damage = Math.floor(damage * 0.8); 

            if (Math.random() < GameConfig.CRITICAL_RATE) {
                damage = Math.floor(damage * GameConfig.CRITICAL_DAMAGE);
                this.ui.addLog("クリティカルヒット！", "#ff4500");
            }

            finalTarget.add_hp(-damage);
            this.effects.damagePopup(damage, targetId);
            
            this.ui.addLog(`> ${finalTarget.name}に ${damage} のダメージ！`);

            // 敵死亡時
            if (!finalTarget.is_alive() && !finalTarget.job) {
                this.effects.enemyDeath(targetId);
            }
        });

        // ★修正：作り直し(refresh)ではなく、HP更新(update)だけ行う
        this.ui.updateEnemyHP(this.enemies);
        this.music.playDamage();
    }

    /** スキル実行 */
    async _executeSkill(actor, target, skill) {
        const targets = Array.isArray(target) ? target : [target];
        this.ui.addLog(`${actor.name}は ${skill.name} を使った！`);
        
        if (skill.type !== 'res') {
            actor.add_mp(-skill.cost);
        }
        
        switch (skill.type) {
            case 'physical': 
                this.music.playAttack();
                
                targets.forEach(originalTarget => {
                    if (!originalTarget.is_alive()) return;

                    const { finalTarget, isCovered } = this._resolveCover(actor, originalTarget);
                    
                    const targetId = this._getTargetId(finalTarget);
                    this.effects.slashEffect(targetId);

                    let damage = Math.floor(actor.atk * skill.power);
                    damage = Math.max(1, damage - Math.floor(finalTarget.def / 2));
                    if (isCovered) damage = Math.floor(damage * 0.8); 

                    finalTarget.add_hp(-damage);
                    this.effects.damagePopup(damage, targetId);
                    this.ui.addLog(`> ${finalTarget.name}に ${damage} のダメージ！`);
                });

                // ★修正
                this.ui.updateEnemyHP(this.enemies);
                this.music.playDamage();
                break;
                
            case 'magic':
                if (skill.id === 'fire') {
                    this.music.playMagicFire();
                    targets.forEach(t => this.effects.fireEffect(this._getTargetId(t)));
                } 
                else if (skill.id === 'fira') {
                    this.music.playMagicFire();
                    this.effects.allFireEffect(this.enemies);
                } 
                else if (skill.id === 'meteor') {
                    this.music.playMagicMeteor();
                    targets.forEach(t => this.effects.meteorEffect(this._getTargetId(t)));
                }
                else {
                    this.music.playMagic();
                    targets.forEach(t => this.effects.magicExplosion(this._getTargetId(t)));
                }
                
                targets.forEach(t => {
                    if (t.is_alive()) {
                        const m_damage = Math.floor(actor.matk * skill.power);
                        t.add_hp(-m_damage);
                        
                        const targetId = this._getTargetId(t);
                        this.effects.damagePopup(m_damage, targetId, "#a29bfe");
                        this.ui.addLog(`> ${t.name}に ${m_damage} のダメージ！`);
                        
                        if (!t.is_alive() && !t.job) {
                            this.effects.enemyDeath(targetId);
                        }
                    }
                });
                
                // ★修正
                this.ui.updateEnemyHP(this.enemies);
                this.music.playDamage();
                break;

            case 'heal':
                this.music.playHeal();
                targets.forEach(t => {
                    if (t.is_alive()) {
                        const healVal = Math.floor(actor.rec * skill.power);
                        t.add_hp(healVal);
                        
                        const targetId = this._getTargetId(t);
                        this.effects.healEffect(targetId);
                        this.effects.damagePopup(`+${healVal}`, targetId, "#2ecc71");
                        
                        this.ui.addLog(`> ${t.name}のHPが ${healVal} 回復した！`);
                    }
                });
                // 味方のHP更新はBattleManagerがやるので、ここでは何もしなくてOK
                break;

            case 'res': 
                if (actor.mp >= skill.cost) {
                    actor.add_mp(-skill.cost);
                    const targetId = this._getTargetId(target);
                    this.effects.resurrectionEffect(targetId);

                    target.revive(Math.floor(target.max_hp * 0.5));
                    this.ui.addLog(`> ${target.name}が蘇生した！`, "#f1c40f");
                    this.music.playHeal();
                } else {
                    this.ui.addLog("MPが足りない！癒し手は自らの命を捧げた！", "#ff0000");
                    actor.add_hp(-999999); 
                    
                    const targetId = this._getTargetId(target);
                    this.effects.resurrectionEffect(targetId);

                    target.revive(target.max_hp);
                    target.add_mp(target.max_mp);
                    this.ui.addLog(`${target.name}が完全な状態で蘇生した！`, "#ffff00");
                    this.music.playHeal(); 
                }
                break;

            case 'mp_recovery':
                this.music.playMeditation();
                actor.add_mp(skill.value);
                const tId = this._getTargetId(actor);
                this.effects.healEffect(tId);
                this.effects.damagePopup(`+${skill.value}MP`, tId, "#3498db");
                this.ui.addLog(`${actor.name}のMPが ${skill.value} 回復した！`);
                break;
                
            case 'buff':
                if (skill.id === 'cover') {
                    this.music.playCover();
                    this.ui.addLog(`${actor.name}は身構えた！`, "#3498db");
                    this.ui.addLog(` > 仲間への攻撃を身代わりする！`);
                    actor.is_covering = true; 
                } else if(skill.id === 'encourage') {
                    this.music.playKobu();
                    this.ui.addLog(`${actor.name}の ${skill.name}！`);
                    targets.forEach(t => {
                        if (t.is_alive()) {
                            t.buff_turns = 3; 
                            this.ui.addLog(` > ${t.name}の攻撃力が上がった！`);
                            this.effects.healEffect(this._getTargetId(t));
                        }
                    });
                }
                break;

            case 'regen': 
                this.music.playHeal();
                this.ui.addLog(`${actor.name}は天に祈りを捧げた！`);
                this.ui.addLog(` > 味方全員に祝福が宿る！`, "#8e44ad");
                targets.forEach(t => {
                    if (t.is_alive()) {
                        t.regen_turns = skill.duration;
                        t.regen_value = skill.value;
                        const targetId = this._getTargetId(t);
                        this.effects.healEffect(targetId);
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
                this.ui.addLog(` > ${hero.name}が${originalTarget.name}をかばった！`, "#3498db");
                finalTarget = hero; 
                isCovered = true;
            }
        }
        return { finalTarget, isCovered };
    }
    
    async _executeItem(actor, target, item) {
        this.ui.addLog(`${actor.name}は ${item.name} を使った！`);
        item.count--;
        
        const targetId = this._getTargetId(target);

        if (item.id === 'phoenix') {
            this.music.playMagic();
            target.revive(Math.floor(target.max_hp * item.effect));
            this.effects.resurrectionEffect(targetId);
            this.ui.addLog(` > ${target.name}が蘇った！`);
        } 
        else if (item.type === 'hp_heal') {
            this.music.playHeal();
            target.add_hp(item.value);
            this.effects.healEffect(targetId);
            this.ui.addLog(` > ${target.name}のHPが ${item.value} 回復した`);
            this.effects.damagePopup(`+${item.value}`, targetId, "#2ecc71");
        } 
        else if (item.type === 'mp_heal') {
            this.music.playMeditation();
            target.add_mp(item.value);
            this.effects.healEffect(targetId);
            this.ui.addLog(` > ${target.name}のMPが ${item.value} 回復した`);
            this.effects.damagePopup(`+${item.value}MP`, targetId, "#3498db");
        }
        // アイテムは味方に使うことが多いので、敵グラフィック更新は不要（もしくはupdateEnemyHPを使う）
    }
}