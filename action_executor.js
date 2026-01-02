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

    /**
     * ダメージ計算ロジック（entities.jsの仕様に準拠）
     * @returns {object} { damage: 数値, isCritical: bool }
     */
    _calculateDamage(actor, target, skill = null) {
        let damage = 0;
        let isCritical = false;

        // --- 魔法攻撃の場合 ---
        if (skill && skill.type === 'magic') {
            // スキルごとの倍率設定（main.js/entities.js準拠）
            let multiplier = 1.5;
            if (skill.id === 'fira') multiplier = 1.1;   // 全体は少し控えめ
            if (skill.id === 'fire') multiplier = 1.5;
            if (skill.id === 'meteor') multiplier = 2.5; // メテオは強力

            // 計算式: 魔力 * 倍率 + 乱数(0~20)
            damage = Math.floor(actor.matk * multiplier + (Math.random() * 20));

            // バフ補正（攻撃UP中は魔法も強くなる仕様）
            if (actor.buff_turns > 0) {
                damage = Math.floor(damage * 1.25);
            }

            // 魔法防御 (MDEF / 3) で軽減
            damage = Math.max(1, damage - Math.floor(target.mdef / 3));
        } 
        // --- 物理攻撃の場合 ---
        else {
            // スキル倍率（物理スキルの場合）
            let multiplier = skill ? skill.power : 1.0; 

            // 計算式: 攻撃力 * 倍率 * 乱数(0.9 ~ 1.1)
            let base = actor.atk * multiplier;
            damage = Math.floor(base * (0.9 + Math.random() * 0.2));

            // バフ補正
            if (actor.buff_turns > 0) {
                damage = Math.floor(damage * 1.25);
            }

            // クリティカル判定 (20%の確率で1.5倍)
            if (Math.random() < 0.2) {
                damage = Math.floor(damage * 1.5);
                isCritical = true;
            }

            // 物理防御 (DEF / 2) で軽減
            damage = Math.max(1, damage - Math.floor(target.def / 2));
        }

        return { damage, isCritical };
    }

    /** 通常攻撃 */
    async _executeAttack(actor, target) {
        this.ui.addLog(`${actor.name}の攻撃！`, "#ecf0f1", true);
        
        // 職業で演出分岐
        const isMagicUser = (actor.job === 'wizard' || actor.job === 'healer');
        if (isMagicUser) this.music.playMagic();
        else this.music.playAttack();
        
        const targets = Array.isArray(target) ? target : [target];

        targets.forEach(originalTarget => {
            if (!originalTarget.is_alive()) return;

            // かばう判定
            const { finalTarget, isCovered } = this._resolveCover(actor, originalTarget);
            const targetId = this._getTargetId(finalTarget);
            
            // エフェクト分岐
            if (isMagicUser) this.effects.magicExplosion(targetId);
            else this.effects.slashEffect(targetId);

            // ★ダメージ計算
            let { damage, isCritical } = this._calculateDamage(actor, finalTarget, null);

            // かばう軽減
            if (isCovered) damage = Math.floor(damage * 0.8); 

            finalTarget.add_hp(-damage);
            
            // ダメージポップアップ
            const color = isMagicUser ? "#a29bfe" : "#ff4757";
            this.effects.damagePopup(damage, targetId, color);
            
            if (isCritical) this.ui.addLog("クリティカルヒット！", "#f1c40f", true);
            this.ui.addLog(`> ${finalTarget.name}に ${damage} のダメージ！`);
            
            if (!finalTarget.is_alive() && !finalTarget.job) {
                this.effects.enemyDeath(targetId);
            }
        });

        this.ui.updateEnemyHP(this.enemies);
        this.music.playDamage();
    }

    /** スキル実行 */
    async _executeSkill(actor, target, skill) {
        const targets = Array.isArray(target) ? target : [target];
        const logColor = skill.type === 'magic' ? "#9b59b6" : "#e67e22";
        this.ui.addLog(`${actor.name}は ${skill.name} を使った！`, logColor, true);
        
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

                    // ★ダメージ計算
                    let { damage, isCritical } = this._calculateDamage(actor, finalTarget, skill);
                    if (isCovered) damage = Math.floor(damage * 0.8);

                    finalTarget.add_hp(-damage);
                    this.effects.damagePopup(damage, targetId);
                    
                    if (isCritical) this.ui.addLog("クリティカルヒット！", "#f1c40f", true);
                    this.ui.addLog(`> ${finalTarget.name}に ${damage} のダメージ！`);
                });
                this.ui.updateEnemyHP(this.enemies);
                this.music.playDamage();
                break;
                
            case 'magic':
                // 魔法ごとの演出
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
                        // ★ダメージ計算
                        let { damage } = this._calculateDamage(actor, t, skill);
                        
                        t.add_hp(-damage);
                        
                        const targetId = this._getTargetId(t);
                        this.effects.damagePopup(damage, targetId, "#a29bfe");
                        this.ui.addLog(`> ${t.name}に ${damage} のダメージ！`);
                        
                        if (!t.is_alive() && !t.job) {
                            this.effects.enemyDeath(targetId);
                        }
                    }
                });
                
                this.ui.updateEnemyHP(this.enemies);
                this.music.playDamage();
                break;

            case 'heal':
                this.music.playHeal();
                targets.forEach(t => {
                    if (t.is_alive()) {
                        // ★回復計算（entities.js参考）
                        // 回復力 * スキル倍率 * 乱数(0.9~1.1)
                        let multiplier = (skill.id === "medica") ? 0.9 : 1.0; 
                        let variance = 0.9 + Math.random() * 0.2;
                        let healVal = Math.floor(actor.rec * multiplier * variance);

                        // 10%の確率で回復量1.5倍
                        if (Math.random() < 0.1) {
                            healVal = Math.floor(healVal * 1.5);
                        }
                        
                        t.add_hp(healVal);
                        
                        const targetId = this._getTargetId(t);
                        this.effects.healEffect(targetId);
                        this.effects.damagePopup(`+${healVal}`, targetId, "#2ecc71");
                        
                        this.ui.addLog(`> ${t.name}のHPが ${healVal} 回復した！`);
                    }
                });
                break;

            case 'res': 
                // 蘇生処理（ここはロジックそのまま）
                if (actor.mp >= skill.cost) {
                    actor.add_mp(-skill.cost);
                    const targetId = this._getTargetId(target);
                    this.effects.resurrectionEffect(targetId);

                    target.revive(Math.floor(target.max_hp * 0.5));
                    this.ui.addLog(`> ${target.name}が蘇生した！`, "#f1c40f");
                    this.music.playHeal();
                } else {
                    this.ui.addLog("MPが足りない！癒し手は自らの命を捧げた！", "#ff0000", true);
                    actor.add_hp(-999999); 
                    
                    const targetId = this._getTargetId(target);
                    this.effects.resurrectionEffect(targetId);

                    target.revive(target.max_hp);
                    target.add_mp(target.max_mp);
                    this.ui.addLog(`${target.name}が完全な状態で蘇生した！`, "#ffff00", true);
                    this.music.playHeal(); 
                }
                break;

            case 'mp_recovery':
                this.music.playMeditation();
                // MP回復も少し揺らぐ
                const mpRec = Math.floor(skill.value * (0.9 + Math.random() * 0.2));
                actor.add_mp(mpRec);
                const tId = this._getTargetId(actor);
                this.effects.healEffect(tId);
                this.effects.damagePopup(`+${mpRec}MP`, tId, "#3498db");
                this.ui.addLog(`${actor.name}のMPが ${mpRec} 回復した！`);
                break;
                
            case 'buff':
                if (skill.id === 'cover') {
                    this.music.playCover();
                    this.ui.addLog(`${actor.name}は身構えた！`, "#3498db", true);
                    this.ui.addLog(` > 仲間への攻撃を身代わりする！`);
                    actor.is_covering = true; 
                } else if(skill.id === 'encourage') {
                    this.music.playKobu();
                    this.ui.addLog(`${actor.name}の ${skill.name}！`, "#f1c40f", true);
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
                this.ui.addLog(`${actor.name}は天に祈りを捧げた！`, "#8e44ad", true);
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
        this.ui.addLog(`${actor.name}は ${item.name} を使った！`, "#e67e22", true);
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
    }
}