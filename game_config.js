///
/// 役割: ゲーム全体のバランス定数やUI設定を集約する。
/// 入出力: 各種マネージャー/計算ロジックから参照される。
/// 関連: battle_calculator.js, reward_manager.js, map_manager.js
///
/** ゲーム定数の集約。 */
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
        CURSE_POISON_PERCENT: 0.1,    // 呪いダメージ割合
        MP_REGEN_VALUE: 9,            // いのりによるMP回復量
        
        COVER_DAMAGE_RATE: 0.5,       // かばう時のダメージ軽減率

        DOWN_DELAY: 60,               // 弱点ダウン時の行動値遅延量
        ALL_OUT_POWER: 1.2,           // トリニティアタックダメージ倍率（合計ATKに掛ける）
        BOSS_BREAK_MAX: 100,          // ボス崩しゲージ最大値
        BOSS_BREAK_WEAKNESS_DAMAGE: 30, // 弱点命中時のボス崩しゲージ減少量
        BOSS_BREAK_OTHER_DAMAGE: 5,   // 弱点以外のボス崩しゲージ減少量
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
        ALL_OUT_ANIMATION: 1000,  // トリニティアタック演出の待ち時間
        ALL_OUT_ANIMATION_FALLBACK: 450, // トリニティアタック演出のフォールバック
    },

    UI: {
        IDS: {
            LOG: 'log',
            COMMAND_CONTAINER: 'command-container',
            TURN_LABEL: 'turn-label',
            ENEMY_TARGET: 'enemy-target',
            CANVAS_AREA: 'canvas-area',
            TURN_ORDER_PANEL: 'turn-order-panel',
            ROUND_INFO_TEXT: 'round-info-text',
            TURN_LIST_CONTAINER: 'turn-list-container',
            GAME_WRAPPER: 'game-wrapper',
            ALLOUT_OVERLAY: 'allout-overlay',
            ALLOUT_PROMPT: 'allout-prompt',
            RELIC_CONTAINER: 'relic-container',
            FLASH_OVERLAY: 'flash-overlay',
            DESPAIR_BLIZZARD: 'despair-blizzard',
            ACTIVE_BLIZZARD: 'active-blizzard',
        },
        ID_TEMPLATES: {
            ENEMY_SPRITE: 'enemy-sprite-{index}',
            CARD: 'card-{index}',
            PLAYER_HP_TEXT: 'p{index}-hp-text',
            PLAYER_HP_BAR: 'p{index}-hp-bar',
        },
        LIMITS: {
            TURN_QUEUE_DISPLAY: 5,
            LOG_BOLD_FONT_SIZE_PX: 15,
            PARTY_SIZE: 3,
            HEX_COLOR_MIN_LENGTH: 7,
            LUMINANCE_THRESHOLD: 0.7,
            LUMINANCE_DENOMINATOR: 255,
            MIN_PERCENT: 0,
        },
    },

    AUDIO: {
        BPM: {
            DEFAULT: 180,
            MAP: 100,
            ELITE: 180,
            DARK: 220,
            BOSS: 180,
            BOSS_PLAY: 236,
            SHADOW_PLAY: 160,
            ELITE_PLAY: 220,
        },
        VOLUME: {
            SE_DEFAULT: 0.5,
            ENDING_GAIN: 0.6,
            BOSS2_GAIN: 0.4,
            NOTE_DEFAULT: 0.1,
        },
        MULTIPLIERS: {
            ELITE_FALLBACK_BPM: 1.2,
            NOTE_VOLUME: 0.2,
        },
        TIMING: {
            LOOK_AHEAD_S: 1.0,
            START_TIME_OFFSET_S: 0.1,
            NOTE_DURATION_S: 0.2,
            NOTE_RAMP_UP_S: 0.01,
            NOTE_MIN_GAIN: 0.001,
            NOTE_STOP_OFFSET_S: 0.1,
            ACTIVE_SOURCE_CLEANUP_BUFFER_S: 0.2,
            LOOP_GAP_S: 0.25,
            SCHEDULE_INTERVAL_MS: 200,
        },
        INSTRUMENT: {
            GAIN_RAMP_UP_S: 0.02,
            GAIN_SUSTAIN_MULTIPLIER: 0.8,
            GAIN_SUSTAIN_TIME_S: 0.05,
            STOP_OFFSET_S: 0.1,
            CLEANUP_BUFFER_S: 0.2,
        },
        BGM_FILES: {
            MAP: './resource/map.mid',
            NORMAL: './resource/01battle.mid',
            ELITE: './resource/03boss_battle.mid',
            SHADOW: './resource/04boss_battle.mid',
            BOSS: './resource/01boss_battle.mid',
        },
        ENDING_FILE: './resource/ending.mp3',
        BOSS2_FILE: './resource/burning_heart.mp3',
        SE_FILES: {
            SLASH: './resource/slash.mp3',
            MAGIC: './resource/magic.mp3',
            FIRE: './resource/fire.mp3',
            ICE: './resource/ice.mp3',
            HOLY: './resource/holy.mp3',
            METEOR: './resource/meteor.mp3',
            HEAL: './resource/heal.mp3',
            MEDITATION: './resource/meditation.mp3',
            KOBU: './resource/kobu.mp3',
            COVER: './resource/cover.mp3',
            SPLITED: './resource/splited.mp3',
            BUKUBUKU: './resource/bukubuku.mp3',
            DAMAGE: './resource/damage.mp3',
            POISON: './resource/poison.mp3',
            BREATH: './resource/breath.mp3',
            DRAGON_VOICE: './resource/dragon_voice.mp3',
            WIN: './resource/win.mp3',
            SPECIAL_READY: './resource/special_ready.mp3',
            SPECIAL: './resource/special.mp3',
        },
        SE_KEYS: {
            SLASH: 'slash',
            MAGIC: 'magic',
            FIRE: 'fire',
            ICE: 'ice',
            HOLY: 'holy',
            METEOR: 'meteor',
            HEAL: 'heal',
            MEDITATION: 'meditation',
            KOBU: 'kobu',
            COVER: 'cover',
            SPLITED: 'splited',
            BUKUBUKU: 'bukubuku',
            DAMAGE: 'damage',
            POISON: 'poison',
            BREATH: 'breath',
            DRAGON_VOICE: 'dragon_voice',
            WIN: 'win',
            SPECIAL_READY: 'special_ready',
            SPECIAL: 'special',
        },
        BGM_TYPES: {
            NORMAL: 'normal',
            MAP: 'map',
            ELITE: 'elite',
            SHADOW: 'shadow',
            BOSS: 'boss',
            ENDING: 'ending',
            BOSS2: 'boss2',
            DARK: 'dark',
        },
    },

    ASSETS: {
        IMAGES: {
            ZABOCHI: './resource/zabochi.webp',
            TRINITY_CUTIN: './resource/trinity_attack.jpg',
            HERO_ICON: './resource/hero_icon.webp',
            WIZARD_ICON: './resource/wizard_icon.webp',
            HEALER_ICON: './resource/healer_icon.webp',
            ENEMY_FALLBACK: './resource/cragen.webp',
            ICE_DRAGON_EVENT: './resource/ice_dragon_event.jpg',
        },
    },

    SKILL_IDS: {
        FIRE: 'fire',
        FIRA: 'fira',
        METEOR: 'meteor',
        DARK_METEOR: 'dark_meteor',
        BLIZZARD: 'blizzard',
        BLIZZARA: 'blizzara',
        ICE_BREATH: 'ice_breath',
        CURSE: 'curse',
        HOLY_STRIKE: 'holy_strike',
        HOLY: 'holy',
        ONRYO_CURSE: 'onryo_curse',
        LAVA_SPRAY: 'lava_spray',
        CHAOS_WAVE: 'chaos_wave',
        MEDITATION: 'meditation',
        GROOMING: 'grooming',
        RAISE: 'raise',
    },

    SKILL_MENUS: {
        MAIN: 'main',
        MAGIC: 'magic',
        SKILL: 'skill',
    },

    SKILL_EFFECTS: {
        GROOMING_HP_RATE: 0.2,
        GROOMING_MP_RATE: 0.1,
    },

    JOBS: {
        HERO: 'hero',
        WIZARD: 'wizard',
        HEALER: 'healer',
    },

    ENEMY_TYPES: {
        ICE_DRAGON: 'ice_dragon',
        SHADOW_LORD: 'shadow_lord',
        SHADOW_PREFIX: 'shadow',
    },

    WEAKNESS_TAGS: {
        FIRE: 'fire',
        ICE: 'ice',
        HOLY: 'holy',
        SLASH: 'slash',
    },

    ELEMENT_TAGS: {
        HOLY: 'holy',
        ICE: 'ice',
        FIRE: 'fire',
    },

    TIMING: {
        BLIZZARD_OVERLAY_REMOVE_MS: 600,
        SHADOW_FUSION_ABSORB_MS: 200,
        SHADOW_FUSION_FLASH_REMOVE_MS: 500,
        SHADOW_FUSION_SHAKE_MS: 1200,
        SHADOW_FUSION_WAIT_MS: 1200,
        DRAGON_FLASH_WAIT_MS: 1000,
        DRAGON_FLASH_FADE_MS: 300,
        DRAGON_FLASH_REMOVE_MS: 500,
        BLIZZARD_WAIT_MS: 1000,
        DESPAIR_INTRO_WAIT_MS: 1000,
        DESPAIR_LINE_WAIT_MS: 1500,
        DESPAIR_SHAKE_WAIT_MS: 350,
        DESPAIR_AFTER_WIPE_WAIT_MS: 1000,
        DESPAIR_LOG_WAIT_MS: 2000,
        DESPAIR_HOPE_WAIT_MS: 2000,
        DESPAIR_ZABOCHI_WAIT_MS: 1500,
        DESPAIR_ZABOCHI_APPEAR_MS: 1000,
        DESPAIR_ZABOCHI_JOIN_WAIT_MS: 5000,
        ALL_OUT_TAIL_DELAY_MS: 400,
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
