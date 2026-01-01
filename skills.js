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
    heal:   { id: "heal",   name: "ケアル",   menu: "magic", cost: 15, power: 1.0, type: "heal", target: "single", color: "#2ecc71" },
    medica: { id: "medica", name: "メディカ", menu: "magic", cost: 30, power: 0.9, type: "heal", target: "all",    color: "#27ae60" },
    prayer: { id: "prayer", name: "いのり",  menu: "main", cost: 0, value: 0.1, duration: 3, type: "regen", target: "all", color: "#8e44ad"},
    raise:  { id: "raise",  name: "レイズ",   menu: "magic", cost: 40, power: 0.5, type: "res",   target: "single", color: "#f1c40f" },

    //　スライム
    body_slam: {id: "body_slam", name: "のしかかり",power: 1.2, type: "physical", target: "all"},

};