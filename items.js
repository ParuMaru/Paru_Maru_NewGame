// items.js
export const ItemData = {
    
    potion: { id: "potion", name: "猫缶", type: "hp_heal", value: 100, count: 3, color: "#2ecc71",
            effect: "heal",desc: "味方一人のHPを100回復します。"},
    ether: { id: "ether", name: "マタタビ", type: "mp_heal", value: 30, count: 2, color: "#3498db",
            effect: "mp_up", desc: "味方一人のMPを30回復します。"},
    phoenix: { id: "phoenix", name: "ねこじゃらし", type: "revive", value: 0.5, count: 1, color: "#f1c40f",
            effect: "light", desc: "戦闘不能の味方一人をHP50%で蘇生します。"},
    elixir: { id: "elixir", name: "マグロの刺身", type: "hp_heal", value: 9999, count: 1, color: "#d80ff1",
            effect: "light", desc: "味方一人のHPMPを全快します。"}    
};

