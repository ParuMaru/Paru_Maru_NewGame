export const SkillData = {
    // --- 勇者（Hero） ---
    cover:     { id: "cover",     name: "かばう", menu: "skill", cost: 10, type: "buff", target: "all", color: "#3498db" },
    encourage: { id: "encourage", name: "鼓舞",   menu: "skill", cost: 15, type: "buff", target: "all",  color: "#e74c3c" },
    whirlwind_slash: { id: "whirlwind_slash", name: "旋風斬り", menu: "skill", cost: 15, power: 1.0, type: "physical", target: "all", color: "#c0392b", attackTag: "slash" },

    // --- 魔法使い（Wizard） ---
    fire:   { id: "fire",   name: "ファイア", menu: "magic", cost: 20, power: 1.5, type: "magic", target: "single", color: "#e74c3c", attackTag: "fire" },
    fira:   { id: "fira",   name: "ファイラ", menu: "magic", cost: 35, power: 1.1, type: "magic", target: "all",    color: "#e74c3c", attackTag: "fire" },
    meteor: { id: "meteor", name: "メテオ",   menu: "magic", cost: 50, power: 2.5, type: "magic", target: "single", color: "#e74c3c", attackTag: "fire" },
    blizzard: { id: "blizzard", name: "ブリザド", menu: "magic", cost: 25, power: 1.4, type: "magic", target: "single", color: "#3498db", attackTag: "ice" },
    blizzara: { id: "blizzara", name: "ブリザラ", menu: "magic", cost: 40, power: 0.95, type: "magic", target: "all", color: "#3498db", attackTag: "ice" },
    meditation: { id: "meditation", name: "瞑想", menu: "main", cost: 0, value: 30, type: "mp_recovery", target: "self", color: "#9b59b6" },

    // --- 癒し手（Healer） ---
    heal:   { id: "heal",   name: "ケアル",   menu: "magic", cost: 15, power: 1.5, type: "heal", target: "single", color: "#2ecc71" },
    medica: { id: "medica", name: "メディカ", menu: "magic", cost: 30, power: 1.2, type: "heal", target: "all",    color: "#2ecc71" },
    holy_strike: { id: "holy_strike", name: "聖撃", menu: "magic", cost: 18, power: 1.2, type: "magic", target: "single", color: "#f7e37a", attackTag: "holy" },
    holy: { id: "holy", name: "ホーリー", menu: "magic", cost: 25, power: 1.9, type: "magic", target: "all", color: "#f7e37a", attackTag: "holy" },
    prayer: { id: "prayer", name: "いのり",  menu: "main", cost: 0, value: 0.1, duration: 3, type: "regen", target: "all", color: "#8e44ad"},
    raise:  { id: "raise",  name: "レイズ",   menu: "magic", cost: 40, power: 0.5, type: "res",   target: "single", color: "#2ecc71" },

    //　クラーゲン（クラーゲン）
    body_slam: {id: "body_slam", name: "のしかかり",power: 1.2, type: "physical", target: "all", attackTag: "slash"},
    tentacle:      {id: "tentacle",      name: "触手",     power: 1.7, type: "physical", target: "single", color: "#2ecc71", attackTag: "slash"},
    
    //ゴブリン
    smash:       {id: "smash",       name: "ごぶりんぱんち", power: 1.7, type: "physical", target: "single", attackTag: "slash"},
    
    //影
    shadow_slash:   {id: "shadow_slash", name: "シャドウスラッシュ", power: 2.0, type: "physical", target: "single", cost: 20, color: "#8e44ad", attackTag: "slash"},
    dark_meteor:    {id: "dark_meteor", name: "ダークメテオ", power: 1.5, type: "magic", target: "all", cost: 60,color: "#2c3e50", attackTag: "fire"},
    curse:          {id: "curse", name: "カース", power: 1.2, type: "magic", target: "single", cost: 20, color: "#7f8c8d", effect: "atk_down", attackTag: "holy"},
    chaos_wave:     {id: "chaos_wave", name: "カオスウェーブ", power: 1.7, type: "magic", target: "all", cost: 80, color: "#000000", effect: "atk_down", attackTag: "holy" },
    
    //ドラゴン
    ice_breath:     {id: "ice_breath", name: "こごえる吹雪",     power: 1.4, type: "magic",    target: "all", color: "#3498db", attackTag: "ice"},
    dragon_claw:    {id: "dragon_claw", name: "ドラゴンクロー", power: 1.7, type: "physical", target: "single", color: "#c0392b", attackTag: "slash"},
    howling:        {id: "howling",     name: "竜の咆哮",     type: "buff",     target: "self",   color: "#f1c40f"},

    //ファイアゴーレム
    lava_charge:    {id: "lava_charge", name: "溶岩を集める", type: "buff", target: "self", cost: 0, color: "#e67e22"},
    lava_spray:     {id: "lava_spray", name: "溶岩撒き", power: 1.6, type: "magic", target: "all", cost: 0, color: "#e67e22", attackTag: "fire"}
};
