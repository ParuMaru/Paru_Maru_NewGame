import { GameConfig } from './game_config.js';

export class BattleCalculator {
    /**
     * ダメージ計算
     * @param {Entity} actor - 行動者
     * @param {Entity} target - 対象
     * @param {object} skill - スキル情報（通常攻撃の場合はnull）
     * @returns {object} { damage: number, isCritical: boolean, type: string }
     */
    static calculateDamage(actor, target, skill = null) {
        let damage = 0;
        let isCritical = false;
        let type = 'physical';

        // スキル情報の正規化
        const isMagic = skill && skill.type === 'magic';
        const power = skill ? (skill.power || 1.0) : 1.0;

        if (isMagic) {
            type = 'magic';
            // 魔法計算: 魔力 * 倍率 + 乱数(0~20)
            const base = (actor.matk * power);
            const variance = Math.floor(Math.random() * 21); 
            damage = Math.floor(base + variance);

            // バフ補正 (攻撃UP中は魔法も1.25倍という仕様を踏襲)
            if (actor.buff_turns > 0) {
                damage = Math.floor(damage * 1.25);
            }

            // 魔法防御 (MDEF / 3) で軽減
            const reduction = Math.floor(target.mdef / 3);
            damage = Math.max(1, damage - reduction);

        } else {
            type = 'physical';
            // 物理計算: 攻撃力 * 倍率 * 乱数(0.9 ~ 1.1)
            const base = (actor.atk * power);
            const variance = 0.9 + Math.random() * 0.2;
            damage = Math.floor(base * variance);

            // バフ補正
            if (actor.buff_turns > 0) {
                damage = Math.floor(damage * 1.25);
            }

            // クリティカル判定（GameConfigの値を使用）
            if (Math.random() < GameConfig.CRITICAL_RATE) {
                damage = Math.floor(damage * GameConfig.CRITICAL_DAMAGE);
                isCritical = true;
            }

            // 物理防御 (DEF / 2) で軽減
            const reduction = Math.floor(target.def / 2);
            damage = Math.max(1, damage - reduction);
        }

        return {
            damage: damage,
            isCritical: isCritical,
            type: type
        };
    }

    /**
     * 回復量計算
     * @param {Entity} actor 
     * @param {object} skill 
     * @returns {object} { amount: number, isCritical: boolean }
     */
    static calculateHeal(actor, skill) {
        // 基本回復力 * 倍率 * 乱数(0.9~1.1)
        const power = skill ? (skill.power || 1.0) : 1.0;
        const variance = 0.9 + Math.random() * 0.2;
        
        let amount = Math.floor(actor.rec * power * variance);
        let isCritical = false;

        // クリティカル判定 (SUPER_HEAL_RATE)
        if (Math.random() < GameConfig.SUPER_HEAL_RATE) {
            amount = Math.floor(amount * GameConfig.SUPER_HEAL_MULT);
            isCritical = true;
        }

        return {
            amount: amount,
            isCritical: isCritical
        };
    }
}