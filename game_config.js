export const GameConfig = {
    // 基本レート
    CRITICAL_RATE: 0.2,          // 20%
    CRITICAL_DAMAGE: 1.5,        // 1.5倍
    SUPER_HEAL_RATE: 0.2,        // 20%
    SUPER_HEAL_MULT: 1.5,        // 1.5倍


    REGEN_HEAL_PERCENT: 0.10,    // いのりの回復率: 10%
    
    // バフ持続ターン
    BUFF_DURATION_HERO_SELF: 3,
    BUFF_DURATION_HERO_OTHER: 2,
    REGEN_DURATION_SELF: 4,
    REGEN_DURATION_OTHER: 3,
    COVER_DAMAGE_RATE: 0.5,
    

    // 敵（クラーゲン）のロジック用
    cragen_REGEN_CHANCE: 0.2,      // 再生確率
    cragen_ALL_ATTACK_CHANCE: 0.3, // 全体攻撃確率
    cragen_SPLIT_HP: 500,          // 分裂しきい値
};