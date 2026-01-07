export const SkillData = {
    // --- 勇者（Hero） ---
    cover:     { id: "cover",     name: "かばう", menu: "skill", cost: 10, type: "buff", target: "all", color: "#3498db" },
    encourage: { id: "encourage", name: "鼓舞",   menu: "skill", cost: 15, type: "buff", target: "all",  color: "#e74c3c" },

    // --- 魔法使い（Wizard） ---
    fire:   { id: "fire",   name: "ファイア", menu: "magic", cost: 20, power: 1.5, type: "magic", target: "single", color: "#e67e22" },
    fira:   { id: "fira",   name: "ファイラ", menu: "magic", cost: 35, power: 1.1, type: "magic", target: "all",    color: "#d35400" },
    meteor: { id: "meteor", name: "メテオ",   menu: "magic", cost: 50, power: 2.5, type: "magic", target: "single", color: "#c0392b" },
    meditation: { id: "meditation", name: "瞑想", menu: "main", cost: 0, value: 30, type: "mp_recovery", target: "self", color: "#9b59b6" },

    // --- 癒し手（Healer） ---
    heal:   { id: "heal",   name: "ケアル",   menu: "magic", cost: 15, power: 1.4, type: "heal", target: "single", color: "#2ecc71" },
    medica: { id: "medica", name: "メディカ", menu: "magic", cost: 30, power: 1.1, type: "heal", target: "all",    color: "#27ae60" },
    prayer: { id: "prayer", name: "いのり",  menu: "main", cost: 0, value: 0.1, duration: 3, type: "regen", target: "all", color: "#8e44ad"},
    raise:  { id: "raise",  name: "レイズ",   menu: "magic", cost: 40, power: 0.5, type: "res",   target: "single", color: "#f1c40f" },

    //　スライム
    body_slam: {id: "body_slam", name: "のしかかり",power: 1.2, type: "physical", target: "all"},
    acid:      {id: "acid",      name: "触手",     power: 1.7, type: "physical", target: "single", color: "#2ecc71"},
    
    //ゴブリン
    smash:       {id: "smash",       name: "こんぼう強打", power: 1.7, type: "physical", target: "single"},
    
    //影
    shadow_slash:   {id: "shadow_slash", name: "シャドウスラッシュ", power: 2.0, type: "physical", target: "single", cost: 20, color: "#8e44ad"},
    dark_meteor:    {id: "dark_meteor", name: "ダークメテオ", power: 1.5, type: "magic", target: "all", cost: 60,color: "#2c3e50"},
    curse:          {id: "curse", name: "カース", power: 1.2, type: "magic", target: "single", cost: 20, color: "#7f8c8d", effect: "atk_down"},
    chaos_wave:     {id: "chaos_wave", name: "カオスウェーブ", power: 1.7, type: "magic", target: "all", cost: 80, color: "#000000", effect: "atk_down" },
    
    //ドラゴン
    ice_breath:     {id: "ice_breath", name: "こごえる吹雪",     power: 1.4, type: "magic",    target: "all", color: "#e74c3c"},
    dragon_claw:    {id: "dragon_claw", name: "ドラゴンクロー", power: 1.7, type: "physical", target: "single", color: "#c0392b"},
    howling:        {id: "howling",     name: "竜の咆哮",     type: "buff",     target: "self",   color: "#f1c40f"}
};