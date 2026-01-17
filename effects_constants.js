///
/// 役割: エフェクト表示に使う設定値をまとめる。
/// 入出力: EffectManagerから参照される定数データ。
/// 関連: effects.js, ui_manager.js
///
/** エフェクト設定定数。 */
export const EffectsConfig = {
    FLASH: {
        HOLY_STRIKE: "rgba(255, 240, 150, 0.5)",
        HOLY: "rgba(255, 240, 150, 0.6)",
        ONRYO_CURSE: "rgba(120, 120, 160, 0.6)",
        CHAOS_WAVE: "rgba(0, 0, 0, 0.8)",
    },
    ANIMATION: {
        RESURRECTION_FLASH: 'resurrectionFlash 1.5s ease-out',
        NONE: 'none',
    },
};
