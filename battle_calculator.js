import { GameConfig } from './game_config.js'; // ★Configをインポート

export class BattleCalculator {
    /**
     * ダメージ計算
     */
    static calculateDamage(actor, target, skill = null,relics = []) {
        let damage = 0;
        let isCritical = false;
        let type = 'physical';

        const isMagic = skill && skill.type === 'magic';
        const power = skill ? (skill.power || 1.0) : 1.0;

        if (isMagic) {
            type = 'magic';
            // ★定数使用: 魔力 * 倍率 + 乱数(0~MAGIC_VARIANCE)
            const base = (actor.matk * power);
            const variance = Math.floor(Math.random() * GameConfig.BATTLE.MAGIC_VARIANCE); 
            damage = Math.floor(base + variance);

            if (actor.hasBuff('atk_up')) {
                damage = Math.floor(damage * 1.25);
            }
            
            if (actor.hasDebuff('atk_down')) {
                damage = Math.floor(damage * 0.7); 
            }

            // ★定数使用: MDEF / MDEF_REDUCTION_RATE
            const reduction = Math.floor(target.mdef / GameConfig.BATTLE.MDEF_REDUCTION_RATE);
            damage = Math.max(1, damage - reduction);

        } else {
            type = 'physical';
            // ★定数使用: 物理乱数
            const base = (actor.atk * power);
            const variance = GameConfig.BATTLE.PHYSICAL_VARIANCE_MIN + Math.random() * GameConfig.BATTLE.PHYSICAL_VARIANCE_RANGE;
            damage = Math.floor(base * variance);

            if (actor.hasBuff('atk_up')) {
                damage = Math.floor(damage * 1.25);
            }

            if (actor.hasDebuff('atk_down')) {
                damage = Math.floor(damage * 0.7); 
            }
            
            // ★定数使用: クリティカル
            if (Math.random() < GameConfig.BATTLE.CRITICAL_RATE) {
                damage = Math.floor(damage * GameConfig.BATTLE.CRITICAL_DAMAGE);
                isCritical = true;
            }
            
            

            // ★定数使用: DEF / DEF_REDUCTION_RATE
            const reduction = Math.floor(target.def / GameConfig.BATTLE.DEF_REDUCTION_RATE);
            damage = Math.max(1, damage - reduction);
            
            // ----------------------------------------------------
        // ★追加: 【竜のウロコ】物理ダメージ軽減
        // 条件: 物理攻撃 && 受けるのが味方(jobあり) && レリック所持
        // ----------------------------------------------------
            if (type === 'physical' && target.job && relics.includes('dragon_scale')) {
                damage = Math.floor(damage * GameConfig.RELIC.DRAGON_SCALE_CUT); // 10%カット
                // console.log("竜のウロコ効果発動！");
            }
        }
        // これで「0ダメージ」や「マイナス」を防ぐ
        damage = Math.max(1, damage);
        
        return {
            damage: damage,
            isCritical: isCritical,
            type: type
        };
    }
    
    /**
     * 毒ダメージ計算
     */
    static calculatePoisonDamage(target) {
        // ★定数使用: 最大HPの POISON_DAMAGE_PERCENT
        let damage = Math.floor(target.max_hp * GameConfig.BATTLE.POISON_DAMAGE_PERCENT);
        
        // ★定数使用: キャップ POISON_CAP
        damage = Math.min(damage, GameConfig.BATTLE.POISON_CAP);
        
        damage = Math.max(1, damage);

        return damage;
    }

    /**
     * 回復量計算
     */
    static calculateHeal(actor, skill) {
        const power = skill ? (skill.power || 1.0) : 1.0;
        const variance = 0.9 + Math.random() * 0.2;
        
        let amount = Math.floor(actor.rec * power * variance);
        let isCritical = false;

        // ★定数使用: クリティカル回復
        if (Math.random() < GameConfig.BATTLE.SUPER_HEAL_RATE) {
            amount = Math.floor(amount * GameConfig.BATTLE.SUPER_HEAL_MULT);
            isCritical = true;
        }

        return {
            amount: amount,
            isCritical: isCritical
        };
    }
}