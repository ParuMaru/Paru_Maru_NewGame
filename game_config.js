export const GameConfig = {
    // --- 戦闘バランス計算用 ---
    BATTLE: {
        CRITICAL_RATE: 0.2,           // クリティカル率 (20%)
        CRITICAL_DAMAGE: 1.5,         // クリティカル倍率 (1.5倍)
        SUPER_HEAL_RATE: 0.2,         // クリティカル回復率
        SUPER_HEAL_MULT: 1.5,         // クリティカル回復倍率
        
        MAGIC_VARIANCE: 21,           // 魔法ダメージの乱数幅 (0~20)
        PHYSICAL_VARIANCE_MIN: 0.9,   // 物理ダメージの乱数下限
        PHYSICAL_VARIANCE_RANGE: 0.2, // 物理ダメージの乱数幅 (0.9 ~ 1.1)
        
        DEF_REDUCTION_RATE: 2,        // 物理防御の除算値 (ダメージ - DEF/2)
        MDEF_REDUCTION_RATE: 3,       // 魔法防御の除算値 (ダメージ - MDEF/3)
        
        POISON_DAMAGE_PERCENT: 0.03,  // 毒ダメージ割合
        POISON_CAP: 50,               // 毒ダメージ上限
        
        COVER_DAMAGE_RATE: 0.5,       // かばう時のダメージ軽減率
    },

    // --- 敵のロジック用 ---
    ENEMY: {
        REGEN_CHANCE: 0.2,       // クラーゲン再生確率
        ALL_ATTACK_CHANCE: 0.3,  // クラーゲン全体攻撃確率
        SPLIT_HP_THRESHOLD: 500, // 分裂HPしきい値
    },
    
    // --- 演出・ウェイト時間 (ミリ秒) ---
    TIME: {
        DAMAGE_POPUP: 800,       // ダメージ数字の表示時間
        TURN_WAIT: 600,          // ターン切り替え等の基本ウェイト
        ACTION_WAIT: 800,        // 敵の連続行動の間のウェイト
        EFFECT_REMOVE: 500,      // エフェクト消去までの時間
        SHAKE_SHORT: 200,        // 短い振動
        SHAKE_LONG: 800,         // 長い振動 (咆哮など)
        FUSION_ANIM: 2200,       // 合体演出の溜め時間
        TRANSFORM_WAIT: 2000,    // 変身演出の待ち時間
    },

    // --- 色設定 (ログやポップアップ用) ---
    COLORS: {
        // ダメージ・回復
        DAMAGE: "#ff4757",        // 赤 (ダメージ)
        HEAL_HP: "#2ecc71",       // 緑 (HP回復)
        HEAL_MP: "#3498db",       // 青 (MP回復)
        FULL_HEAL: "#f1c40f",     // 金 (全回復)
        CRITICAL: "#f1c40f",      // 金 (クリティカル文字)
        POISON: "#9b59b6",        // 紫 (毒ダメージ)

        // ログメッセージ
        LOG_DEFAULT: "#ffffff",   // 白 (通常)
        LOG_ATTACK: "#f1c40f",    // 黄 (物理攻撃ログ)
        LOG_SKILL: "#3498db",     // 青 (スキル使用ログ)
        LOG_ITEM: "#e67e22",      // オレンジ (アイテムログ)
        LOG_BUFF: "#e74c3c",      // 赤系 (バフ効果)
        LOG_DEBUFF: "#7f8c8d",    // グレー (デバフ効果)
        LOG_PRAYER: "#8e44ad",    // 紫 (祈り)
        LOG_IMPORTANT: "#ffff00", // 黄色強調 (重要メッセージ)
        LOG_DESPAIR: "#7f8c8d",   // グレー (全滅...)
        LOG_SYSTEM: "#bdc3c7",    // 薄グレー (システムメッセージ)
    },
    // ★追加: レリックのパラメータ
    RELIC: {
        DRAGON_SCALE_CUT: 0.9,    // 竜のウロコ: ダメージを0.9倍にする（10%軽減）
        VAMPIRE_DRAIN_RATE: 0.2,  // 吸血のマント: ダメージの20%を吸収
        MUSCLE_ATK_TURN: 3,       // ムキムキ像: 攻撃UPターン数
        HEAL_ORB_REGEN_TURN: 3,   // 癒しのオーブ: リジェネターン数
        HEAL_ORB_REGEN_VAL: 0.1   // 癒しのオーブ: 回復量(10%)
    },

    // ★追加: 報酬の数値（バランス調整用）
    REWARD: {
        HP_LARGE: 80,    // 最大HP超アップ
        MP_LARGE: 50,    // 最大MP超アップ
        STAT_SMALL: 10,  // 攻撃・防御などの小アップ
        STAT_MID: 50,    // コンプボーナスのHPアップなど
        STAT_LARGE: 100, // 覇者の証
    }
};