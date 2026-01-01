import { GameConfig } from './game_config.js';

export class ActionExecutor {
    constructor(ui, music, effects,enemies, party) {
        this.ui = ui;
        this.music = music;     // BattleBGM インスタンス
        this.effects = effects; // EffectManager インスタンス
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


    /** 通常攻撃（および敵の物理攻撃） */
    // action_executor.js

    /** 通常攻撃（および敵の物理攻撃） */
    async _executeAttack(actor, target) {
        this.ui.addLog(`${actor.name}の攻撃！`);
        this.music.playAttack();
        
        const targets = Array.isArray(target) ? target : [target];

        targets.forEach(originalTarget => {
            if (!originalTarget.is_alive()) return;

            // かばう
            const { finalTarget, isCovered } = this._resolveCover(actor, originalTarget);

            // エフェクト
            const targetId = finalTarget.job ? `card-${this._getPartyIndex(finalTarget)}` : 'enemy-target';
            this.effects.slashEffect(targetId);

            // ダメージ計算
            let damage = Math.max(1, actor.atk - Math.floor(finalTarget.def / 2));
            if (isCovered) damage = Math.floor(damage * 0.8); // 軽減

            if (Math.random() < GameConfig.CRITICAL_RATE) {
                damage = Math.floor(damage * GameConfig.CRITICAL_DAMAGE);
                this.ui.addLog("クリティカルヒット！", "#ff4500");
            }

            finalTarget.add_hp(-damage);
            this.ui.addLog(`> ${finalTarget.name}に ${damage} のダメージ！`);
        });

        this.ui.refreshEnemyGraphics(this.enemies);
        this.music.playDamage();
    }

    /** スキル実行 */
    async _executeSkill(actor, target, skill) {
        const targets = Array.isArray(target) ? target : [target];
        this.ui.addLog(`${actor.name}は ${skill.name} を使った！`);
        
        // MP消費判定（レイズの特殊仕様のため、ここでは引かない）
        if (skill.type !== 'res') {
            actor.add_mp(-skill.cost);
        }
        
        switch (skill.type) {
                
            case 'physical': 
                this.music.playAttack();
                
                targets.forEach(originalTarget => {
                    if (!originalTarget.is_alive()) return;

                    // かばう
                    const { finalTarget, isCovered } = this._resolveCover(actor, originalTarget);

                    // ダメージ計算（スキル威力）
                    let damage = Math.floor(actor.atk * skill.power);
                    damage = Math.max(1, damage - Math.floor(finalTarget.def / 2));

                    if (isCovered) damage = Math.floor(damage * 0.8); // 軽減

                    finalTarget.add_hp(-damage);
                    this.ui.addLog(`> ${finalTarget.name}に ${damage} のダメージ！`);
                });

                this.ui.refreshEnemyGraphics(this.enemies);
                this.music.playDamage();
                break;
                
            case 'magic':
                // skills.js の id に基づいて music.js の既存SEを呼び出し
                if (skill.id === 'fire') this.music.playMagicFire();
                else if (skill.id === 'fira') this.music.playMagicFire(); // fireを使用
                else if (skill.id === 'meteor') this.music.playMagicMeteor();
                
                targets.forEach(t => {
                    if (t.is_alive()) {
                        const m_damage = Math.floor(actor.matk * skill.power);
                        t.add_hp(-m_damage);
                        this.ui.addLog(`> ${t.name}に ${m_damage} のダメージ！`);
                    }
                });
                
                this.ui.refreshEnemyGraphics(this.enemies);
                this.music.playDamage();
                break;

            case 'heal':
                this.music.playHeal();
                targets.forEach(t => {
                    if (t.is_alive()) {
                        const healVal = Math.floor(actor.rec * skill.power);
                        t.add_hp(healVal);
                        this.ui.addLog(`> ${t.name}のHPが ${healVal} 回復した！`);
                    }
                });
                break;

            case 'res': // 命の代償ロジック
                if (actor.mp >= skill.cost) {
                    actor.add_mp(-skill.cost);
                    target.revive(Math.floor(target.max_hp * 0.5));
                    this.ui.addLog(`> ${target.name}が蘇生した！`, "#f1c40f");
                    this.music.playHeal();
                } else {
                    this.ui.addLog("MPが足りない！癒し手は自らの命を捧げた！", "#ff0000");
                    actor.add_hp(-999999); 
                    target.revive(target.max_hp);
                    target.add_mp(target.max_mp);
                    this.ui.addLog(`${target.name}が完全な状態で蘇生した！`, "#ffff00");
                    this.music.playHeal(); 
                }
                break;

            case 'mp_recovery':
                this.music.playMeditation();
                actor.add_mp(skill.value);
                this.ui.addLog(`${actor.name}のMPが ${skill.value} 回復した！`);
                break;
                
            case 'buff':
                if (skill.id === 'cover') {
                    this.music.playCover();
                    this.ui.addLog(`${actor.name}は身構えた！`, "#3498db");
                    this.ui.addLog(` > 仲間への攻撃を身代わりする！`);
                    actor.is_covering = true; // ★かばう状態ON
                } else if(skill.id === 'encourage') {
                    this.music.playKobu();
                    this.ui.addLog(`${actor.name}の ${skill.name}！`);
                    // 鼓舞（攻撃力UP）などの処理
                    targets.forEach(t => {
                        if (t.is_alive()) {
                            t.buff_turns = 3; // 3ターン継続など
                            this.ui.addLog(` > ${t.name}の攻撃力が上がった！`);
                        }
                    });
                }
                break;
                
            case 'regen':
                this.music.playHeal(); // 癒やしの音
                this.ui.addLog(`${actor.name}は天に祈りを捧げた！`);
                this.ui.addLog(` > 味方全員に祝福が宿る！`, "#8e44ad");

                targets.forEach(t => {
                    if (t.is_alive()) {
                        t.regen_turns = skill.duration; // 3ターン
                        t.regen_value = skill.value;    // 回復量（0.1 = 10%）
                        // エフェクトを出すならここで
                        const targetId = t.job ? `card-${this._getPartyIndex(t)}` : 'enemy-target';
                        this.effects.healEffect(targetId);
                    }
                });
                break;
                
        }
    }
    
    /**
     * かばう判定を行い、最終的なターゲットとフラグを返す
     */
    _resolveCover(actor, originalTarget) {
        // デフォルトは「かばっていない」状態
        let finalTarget = originalTarget;
        let isCovered = false;

        // 攻撃者が敵 かつ ターゲットが味方 の場合のみ判定
        if (this.enemies.includes(actor) && this.party.includes(originalTarget)) {
            // かばう中の勇者を探す
            const hero = this.party.find(m => m.is_covering && m.is_alive());

            // 勇者がいて、かつ自分自身への攻撃でなければ発動
            if (hero && originalTarget !== hero) {
                this.ui.addLog(` > ${hero.name}が${originalTarget.name}をかばった！`, "#3498db");
                finalTarget = hero; // ターゲット変更
                isCovered = true;
            }
        }

        return { finalTarget, isCovered };
    }
    
    
    /** アイテム使用 */
    async _executeItem(actor, target, item) {
        this.ui.addLog(`${actor.name}は ${item.name} を使った！`);
        item.count--;
        
        const targetId = `card-${this._getPartyIndex(target)}`;

        if (item.id === 'phoenix') {
            // 生きている人は選択できないので、単純に蘇生処理だけでOK
            this.music.playMagic();
            target.revive(Math.floor(target.max_hp * item.effect));
            this.effects.resurrectionEffect(targetId);
            this.ui.addLog(` > ${target.name}が蘇った！`);
        } 
        else if (item.type === 'hp_heal') {
            // ... (ポーション処理など変更なし) ...
            this.music.playHeal();
            target.add_hp(item.value);
            this.effects.healEffect(targetId);
            this.ui.addLog(` > ${target.name}のHPが ${item.value} 回復した`);
            this.effects.damagePopup(`+${item.value}`, targetId, "#2ecc71");
        } 
        else if (item.type === 'mp_heal') {
            // ... (エーテル処理など変更なし) ...
            this.music.playMeditation();
            target.add_mp(item.value);
            this.effects.healEffect(targetId);
            this.ui.addLog(` > ${target.name}のMPが ${item.value} 回復した`);
            this.effects.damagePopup(`+${item.value}MP`, targetId, "#3498db");
        }
        
        this.ui.refreshEnemyGraphics(this.enemies); 
    }

    _getPartyIndex(entity) {
        return ["hero", "wizard", "healer"].indexOf(entity.job);
    }
}