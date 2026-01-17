///
/// 役割: 効果音/BGMのファイルパスや音量設定を定義する。
/// 入出力: music.jsや効果音再生処理から参照される定数データ。
/// 関連: music.js, battle_manager.js
///
/** 音声関連の定数定義。 */
export const AudioConstants = {
    WAVEFORMS: {
        NOTE: "square",
        INSTRUMENT_DEFAULT: "sawtooth",
    },
    FILTERS: {
        LOWPASS: "lowpass",
        INSTRUMENT_FREQ: 2000,
    },
};
