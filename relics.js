///
/// 役割: レリックの効果/入手条件を定義する。
/// 入出力: 戦闘開始時や報酬処理から参照される静的データ。
/// 関連: battle_manager.js, reward_manager.js, game_manager.js
///
/** レリック定義データ。 */
export const RelicData = {
    // --- 戦闘開始時発動系 ---
    muscle_statue: { 
        id: "muscle_statue", 
        name: "ムキムキ像", 
        icon: "🗿",
        desc: "戦闘開始時、味方全員に攻撃力UP(3ターン)を付与する", 
        type: "battle_start", 
        effect: "buff_atk" 
    },
    healing_orb: { 
        id: "healing_orb", 
        name: "癒しのオーブ", 
        icon: "🔮",
        desc: "戦闘開始時、味方全員にリジェネ(3ターン)を付与する", 
        type: "battle_start", 
        effect: "buff_regen" 
    },
    
    // --- パッシブ（計算式介入）系 ---
    dragon_scale: { 
        id: "dragon_scale", 
        name: "竜のウロコ", 
        icon: "🐚",
        desc: "受ける物理ダメージを常に10%軽減する", 
        type: "passive"
    },
    vampire_cape: {
        id: "vampire_cape",
        name: "吸血のマント",
        icon: "🩸",
        desc: "攻撃時、与えたダメージの20%を回復する",
        type: "passive"
    }
};
