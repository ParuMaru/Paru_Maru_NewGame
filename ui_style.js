///
/// 役割: UI描画に必要なスタイル値（寸法など）を集中管理する。
/// 入出力: UI層から参照される定数データ。
/// 関連: ui_manager.js, ui_colors.js
///
/** UIスタイルの定義。 */
export const UiStyle = {
    FULL_HP_PERCENT: "100%",
    ZERO_HP_PERCENT: "0%",
    CARD_OPACITY_DEAD: "0.5",
    CARD_OPACITY_ALIVE: "1",
    TRANSFORM_ORIGIN: "center center",
    POSITION_RELATIVE: "relative",
    OVERFLOW_HIDDEN: "hidden",
    GRID_DISPLAY: "grid",
    GRID_TEMPLATE_PREFIX: "repeat(",
    GRID_TEMPLATE_SUFFIX: ", 1fr)",
    WIDTH_FULL: "100%",
    JUSTIFY_CENTER: "center",
    ALIGN_END: "end",
    OPACITY_VISIBLE: "1",
    OPACITY_HIDDEN: "0",
    DISPLAY_NONE: "none",
    DISPLAY_FLEX: "flex",
    DISPLAY_INLINE_FLEX: "inline-flex",
    FONT_WEIGHT_BOLD: "bold",
    TEXT_SHADOW_LIGHT: "0 1px 1px rgba(255,255,255,0.35)",
    TEXT_SHADOW_DARK: "0 1px 1px rgba(0,0,0,0.6)",
    TEXT_SHADOW_NONE: "none",
    COLOR_HASH: "#",
    GRID_ROW: 1,
    GRID_COLUMN_OFFSET: 1,
};

/** UI内の輝度設定。 */
export const UiLuminance = {
    RED_WEIGHT: 0.2126,
    GREEN_WEIGHT: 0.7152,
    BLUE_WEIGHT: 0.0722,
};
