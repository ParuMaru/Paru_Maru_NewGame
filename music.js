///
/// 役割: BGMとSEの読み込み/再生を管理する。
/// 入出力: AudioConstants/GameConfigを参照し、Web Audio APIを操作する。
/// 関連: battle_manager.js, action_executor.js, audio_constants.js
///
import { AudioConstants } from './audio_constants.js';
import { GameConfig } from './game_config.js';

/**
 * ゲーム内のBGMおよびSE（効果音）を制御するクラス
 * Web Audio APIを使用してリアルタイムに音を合成・再生します
 */
/**
 * ゲーム内のBGMおよびSE（効果音）を制御するクラス。
 * Web Audio APIを使用してリアルタイムに音を合成・再生する。
 * @class
 */
export class BattleBGM {
    /**
     * AudioContextやBGMデータの初期状態を作成する。
     */
    constructor() {
        this.ctx = null;           // AudioContext
        this.isPlaying = false;    // BGM再生中フラグ
        this.allNotes = [];        // 現在再生中の音符データ
        this.fixedBpm = GameConfig.AUDIO.BPM.DEFAULT;       // 現在の再生速度
        this.baseBpm = GameConfig.AUDIO.BPM.DEFAULT;        // 通常曲の基本BPM
        
        this.totalDuration = 0;    
        this.schedulerTimer = null; 
        this.nextNoteIndex = 0;    
        this.startTime = 0;        
        this.activeSources = [];   
        
        // ★重要：勝利ループ再生中かどうかの厳密なフラグ
        // なんか止まらないからいったん保留
        this.isVictoryLoopActive = false;

        // 楽曲データ保存用
        this.bgmData = {
            [GameConfig.AUDIO.BGM_TYPES.MAP]: [],
            [GameConfig.AUDIO.BGM_TYPES.NORMAL]: [], 
            [GameConfig.AUDIO.BGM_TYPES.ELITE]: [], 
            [GameConfig.AUDIO.BGM_TYPES.SHADOW]: [],
            [GameConfig.AUDIO.BGM_TYPES.BOSS]: []    
        };
        
        // MIDIファイルパス設定
        this.bgmFiles = {
            [GameConfig.AUDIO.BGM_TYPES.MAP]: GameConfig.AUDIO.BGM_FILES.MAP,
            [GameConfig.AUDIO.BGM_TYPES.NORMAL]: GameConfig.AUDIO.BGM_FILES.NORMAL, 
            [GameConfig.AUDIO.BGM_TYPES.ELITE]: GameConfig.AUDIO.BGM_FILES.ELITE, 
            [GameConfig.AUDIO.BGM_TYPES.SHADOW]: GameConfig.AUDIO.BGM_FILES.SHADOW, 
            [GameConfig.AUDIO.BGM_TYPES.BOSS]: GameConfig.AUDIO.BGM_FILES.BOSS   
        };

        // エンディング用MP3ファイルのパス
        this.endingFile = GameConfig.AUDIO.ENDING_FILE;
        this.endingBuffer = null;
        this.currentType = GameConfig.AUDIO.BGM_TYPES.NORMAL;
        
        // ボス後半戦用ファイルのパス
        this.boss2File = GameConfig.AUDIO.BOSS2_FILE;
        this.boss2Buffer = null;
        this.currentType = GameConfig.AUDIO.BGM_TYPES.NORMAL;
        
        this.seFiles = {
            [GameConfig.AUDIO.SE_KEYS.SLASH]: GameConfig.AUDIO.SE_FILES.SLASH,
            [GameConfig.AUDIO.SE_KEYS.MAGIC]: GameConfig.AUDIO.SE_FILES.MAGIC,
            [GameConfig.AUDIO.SE_KEYS.FIRE]: GameConfig.AUDIO.SE_FILES.FIRE,
            [GameConfig.AUDIO.SE_KEYS.ICE]: GameConfig.AUDIO.SE_FILES.ICE,
            [GameConfig.AUDIO.SE_KEYS.HOLY]: GameConfig.AUDIO.SE_FILES.HOLY,
            [GameConfig.AUDIO.SE_KEYS.METEOR]: GameConfig.AUDIO.SE_FILES.METEOR,
            [GameConfig.AUDIO.SE_KEYS.HEAL]: GameConfig.AUDIO.SE_FILES.HEAL,
            [GameConfig.AUDIO.SE_KEYS.MEDITATION]: GameConfig.AUDIO.SE_FILES.MEDITATION,
            [GameConfig.AUDIO.SE_KEYS.KOBU]: GameConfig.AUDIO.SE_FILES.KOBU,
            [GameConfig.AUDIO.SE_KEYS.COVER]: GameConfig.AUDIO.SE_FILES.COVER,
            [GameConfig.AUDIO.SE_KEYS.SPLITED]: GameConfig.AUDIO.SE_FILES.SPLITED,
            [GameConfig.AUDIO.SE_KEYS.BUKUBUKU]: GameConfig.AUDIO.SE_FILES.BUKUBUKU,
            [GameConfig.AUDIO.SE_KEYS.DAMAGE]: GameConfig.AUDIO.SE_FILES.DAMAGE,
            [GameConfig.AUDIO.SE_KEYS.POISON]: GameConfig.AUDIO.SE_FILES.POISON,
            [GameConfig.AUDIO.SE_KEYS.BREATH]: GameConfig.AUDIO.SE_FILES.BREATH,
            [GameConfig.AUDIO.SE_KEYS.DRAGON_VOICE]: GameConfig.AUDIO.SE_FILES.DRAGON_VOICE,
            [GameConfig.AUDIO.SE_KEYS.WIN]: GameConfig.AUDIO.SE_FILES.WIN,
            [GameConfig.AUDIO.SE_KEYS.SPECIAL_READY]: GameConfig.AUDIO.SE_FILES.SPECIAL_READY,
            [GameConfig.AUDIO.SE_KEYS.SPECIAL]: GameConfig.AUDIO.SE_FILES.SPECIAL
        };
        
        this.victoryLoopTimer = null; 
        this.seBuffers = {};       
    }

    /**
     * AudioContextを作成し、BGMファイルを読み込む。
     * 副作用: 非同期でBGMデータを格納する。
     */
    async initAndLoad() {
        this.initContext();

        // SEのロード
        const sePromises = Object.keys(this.seFiles).map(async key => {
            try {
                const res = await fetch(this.seFiles[key]);
                const arrayBuf = await res.arrayBuffer();
                const audioBuf = await this.ctx.decodeAudioData(arrayBuf);
                this.seBuffers[key] = audioBuf;
            } catch (e) {
                console.warn(`SE load failed: ${key}`, e);
            }
        });

        // エンディング曲(MP3)のロード
        const endingPromise = (async () => {
            try {
                const res = await fetch(this.endingFile);
                if(res.ok) {
                    const arrayBuf = await res.arrayBuffer();
                    this.endingBuffer = await this.ctx.decodeAudioData(arrayBuf);
                } else {
                    console.warn("Ending BGM not found.");
                }
            } catch(e) {
                console.warn("Ending BGM load failed", e);
            }
        })();
        // エンディング曲(MP3)のロード
        const boss2Promise = (async () => {
            try {
                const res = await fetch(this.boss2File);
                if(res.ok) {
                    const arrayBuf = await res.arrayBuffer();
                    this.boss2Buffer = await this.ctx.decodeAudioData(arrayBuf);
                } else {
                    console.warn("Boss2 BGM not found.");
                }
            } catch(e) {
                console.warn("Boss2 BGM load failed", e);
            }
        })();

        // 各MIDI BGMの読み込み
        const bgmPromiseMap = this.loadMidi(this.bgmFiles[GameConfig.AUDIO.BGM_TYPES.MAP], GameConfig.AUDIO.BGM_TYPES.MAP);
        const bgmPromiseNormal = this.loadMidi(this.bgmFiles[GameConfig.AUDIO.BGM_TYPES.NORMAL], GameConfig.AUDIO.BGM_TYPES.NORMAL);
        
        const bgmPromiseElite = this.loadMidi(this.bgmFiles[GameConfig.AUDIO.BGM_TYPES.ELITE], GameConfig.AUDIO.BGM_TYPES.ELITE).catch(() => {
            console.log("エリートBGMが見つかりません。通常曲を流用します。");
            this.bgmData[GameConfig.AUDIO.BGM_TYPES.ELITE] = null;
        });
        const bgmPromiseShadow = this.loadMidi(this.bgmFiles[GameConfig.AUDIO.BGM_TYPES.SHADOW], GameConfig.AUDIO.BGM_TYPES.SHADOW).catch(() => {
            console.log("shadowBGMが見つかりません。通常曲を流用します。");
            this.bgmData[GameConfig.AUDIO.BGM_TYPES.ELITE] = null;
        });

        const bgmPromiseBoss = this.loadMidi(this.bgmFiles[GameConfig.AUDIO.BGM_TYPES.BOSS], GameConfig.AUDIO.BGM_TYPES.BOSS).catch(() => {
            console.log("ボスBGMが見つかりません。エリート曲を流用します。");
            this.bgmData[GameConfig.AUDIO.BGM_TYPES.BOSS] = null; 
        });

        await Promise.all([...sePromises, endingPromise, bgmPromiseNormal, bgmPromiseElite, bgmPromiseBoss]);
        console.log("全オーディオファイルのロード完了");
    }

    /**
     * MIDIファイルを読み込み解析する。
     * @param {string} url - MIDIファイルURL。
     * @param {string} type - BGM種別。
     * 副作用: bgmDataを更新する。
     */
    async loadMidi(url, type) {
        const res = await fetch(url);
        if (!res.ok) throw new Error(`File not found: ${url}`);
        const arrayBuffer = await res.arrayBuffer();
        
        let targetBpm = GameConfig.AUDIO.BPM.DEFAULT;
        if (type === GameConfig.AUDIO.BGM_TYPES.MAP) targetBpm = GameConfig.AUDIO.BPM.MAP;
        if (type === GameConfig.AUDIO.BGM_TYPES.ELITE) targetBpm = GameConfig.AUDIO.BPM.ELITE; 
        if (type === GameConfig.AUDIO.BGM_TYPES.DARK)  targetBpm = GameConfig.AUDIO.BPM.DARK; 
        if (type === GameConfig.AUDIO.BGM_TYPES.BOSS)  targetBpm = GameConfig.AUDIO.BPM.BOSS; 

        this.bgmData[type] = this.parseMidiBuffer(arrayBuffer, targetBpm);
    }
    
    /**
     * 効果音を再生する。
     * @param {string} name - SEキー。
     * @param {number} volume - 音量。
     */
    playSE(name, volume = GameConfig.AUDIO.VOLUME.SE_DEFAULT) {
        if (!this.ctx || !this.seBuffers[name]) return;
        const source = this.ctx.createBufferSource();
        source.buffer = this.seBuffers[name];
        const gainNode = this.ctx.createGain();
        gainNode.gain.setValueAtTime(volume, this.ctx.currentTime);
        source.connect(gainNode).connect(this.ctx.destination);
        source.start(0);
    }

    /**
     * AudioContextを初期化または再開する。
     * 副作用: AudioContextの状態を変更する。
     */
    initContext() {
        if (!this.ctx) {
            const AudioContextClass = window.AudioContext || window.webkitAudioContext;
            this.ctx = new AudioContextClass();
        }
        if (this.ctx.state === 'suspended') this.ctx.resume();
    }
    
    /**
     * BGM再生
     */
    /**
     * BGM再生を開始する。
     * @param {string} type - BGM種別。
     * 副作用: 再生状態とスケジューラを更新する。
     */
    playBGM(type = GameConfig.AUDIO.BGM_TYPES.NORMAL) {
        this.stopBGM(); // ★ここで全てのBGM（勝利ループ含む）を停止
        this.currentType = type;

        // エンディング(MP3)の場合はここで再生してリターン
        if (type === GameConfig.AUDIO.BGM_TYPES.ENDING) {
            if (this.endingBuffer) {
                const source = this.ctx.createBufferSource();
                source.buffer = this.endingBuffer;
                source.loop = true; 
                
                const gainNode = this.ctx.createGain();
                gainNode.gain.value = GameConfig.AUDIO.VOLUME.ENDING_GAIN; 

                source.connect(gainNode).connect(this.ctx.destination);
                source.start(0);
                
                this.activeSources.push(source);
                this.isPlaying = true;
            }
            return; // MIDI処理には行かない
        }
        else if(type === GameConfig.AUDIO.BGM_TYPES.BOSS2) {
            if (this.endingBuffer) {
                const source = this.ctx.createBufferSource();
                source.buffer = this.boss2Buffer;
                source.loop = true; 
                
                const gainNode = this.ctx.createGain();
                gainNode.gain.value = GameConfig.AUDIO.VOLUME.BOSS2_GAIN; 

                source.connect(gainNode).connect(this.ctx.destination);
                source.start(0);
                
                this.activeSources.push(source);
                this.isPlaying = true;
            }
            return; // MIDI処理には行かない
        }

        // --- MIDI再生ロジック ---
        let notesToPlay = this.bgmData[GameConfig.AUDIO.BGM_TYPES.NORMAL];
        let bpmToUse = this.baseBpm;

        if (type === GameConfig.AUDIO.BGM_TYPES.MAP){
            if (this.bgmData[GameConfig.AUDIO.BGM_TYPES.MAP]) {
                notesToPlay = this.bgmData[GameConfig.AUDIO.BGM_TYPES.MAP];
                bpmToUse = GameConfig.AUDIO.BPM.MAP; 
            } else {
                notesToPlay = []; 
            }
        }
        else if (type === GameConfig.AUDIO.BGM_TYPES.BOSS) {
            if (this.bgmData[GameConfig.AUDIO.BGM_TYPES.BOSS]) {
                notesToPlay = this.bgmData[GameConfig.AUDIO.BGM_TYPES.BOSS];
                bpmToUse = GameConfig.AUDIO.BPM.BOSS_PLAY; 
            } else if (this.bgmData[GameConfig.AUDIO.BGM_TYPES.ELITE]) {
                notesToPlay = this.bgmData[GameConfig.AUDIO.BGM_TYPES.ELITE];
                bpmToUse = GameConfig.AUDIO.BPM.ELITE_PLAY;
            }
        }
        else if (type === GameConfig.AUDIO.BGM_TYPES.SHADOW) {
            if (this.bgmData[GameConfig.AUDIO.BGM_TYPES.BOSS]) {
                notesToPlay = this.bgmData[GameConfig.AUDIO.BGM_TYPES.SHADOW];
                bpmToUse = GameConfig.AUDIO.BPM.SHADOW_PLAY; 
            } else if (this.bgmData[GameConfig.AUDIO.BGM_TYPES.ELITE]) {
                notesToPlay = this.bgmData[GameConfig.AUDIO.BGM_TYPES.ELITE];
                bpmToUse = GameConfig.AUDIO.BPM.ELITE_PLAY;
            }
        } 
        else if (type === GameConfig.AUDIO.BGM_TYPES.ELITE) {
            if (this.bgmData[GameConfig.AUDIO.BGM_TYPES.ELITE]) {
                notesToPlay = this.bgmData[GameConfig.AUDIO.BGM_TYPES.ELITE];
                bpmToUse = GameConfig.AUDIO.BPM.ELITE_PLAY; 
            } else {
                notesToPlay = this.bgmData[GameConfig.AUDIO.BGM_TYPES.NORMAL];
                bpmToUse = this.baseBpm * GameConfig.AUDIO.MULTIPLIERS.ELITE_FALLBACK_BPM;
            }
        }

        this.allNotes = notesToPlay;
        this.fixedBpm = bpmToUse;

        if (this.allNotes && this.allNotes.length > 0) {
            this.isPlaying = true;
            this.nextNoteIndex = 0;
            this.startTime = this.ctx.currentTime + GameConfig.AUDIO.TIMING.START_TIME_OFFSET_S;
            this.schedule();
        }
    }

    /**
     * BGMの次ノートをスケジュールする。
     * 副作用: AudioContextにノートを予約する。
     */
    schedule() {
        if (!this.isPlaying) return;
        if (this.currentType === GameConfig.AUDIO.BGM_TYPES.ENDING) return;
        if (this.currentType === GameConfig.AUDIO.BGM_TYPES.BOSS2) return;

        const lookAhead = GameConfig.AUDIO.TIMING.LOOK_AHEAD_S; 
        const currentTime = this.ctx.currentTime - this.startTime;

        while (this.nextNoteIndex < this.allNotes.length && 
               this.allNotes[this.nextNoteIndex].time < currentTime + lookAhead) {
            const note = this.allNotes[this.nextNoteIndex];
            this.playNote(note.freq, this.startTime + note.time, GameConfig.AUDIO.VOLUME.NOTE_DEFAULT);
            this.nextNoteIndex++;
        }

        if (this.nextNoteIndex >= this.allNotes.length && this.allNotes.length > 0) {
            const lastNoteTime = this.allNotes[this.allNotes.length - 1].time;
            if (currentTime > lastNoteTime + GameConfig.AUDIO.TIMING.LOOP_GAP_S) {
                this.nextNoteIndex = 0;
                this.startTime = this.ctx.currentTime;
            }
        }
        this.schedulerTimer = setTimeout(() => this.schedule(), GameConfig.AUDIO.TIMING.SCHEDULE_INTERVAL_MS);
    }

    /**
     * 単音を再生する。
     * @param {number} freq - 周波数。
     * @param {number} time - 開始時刻。
     * @param {number} vol - 音量。
     */
    playNote(freq, time, vol) {
        if (!this.ctx) return;
        const osc = this.ctx.createOscillator();
        const g = this.ctx.createGain();
        
        osc.type = AudioConstants.WAVEFORMS.NOTE; 
        
        osc.frequency.setValueAtTime(freq, time);
        const duration = GameConfig.AUDIO.TIMING.NOTE_DURATION_S; 

        g.gain.setValueAtTime(0, time);
        g.gain.linearRampToValueAtTime(vol * GameConfig.AUDIO.MULTIPLIERS.NOTE_VOLUME, time + GameConfig.AUDIO.TIMING.NOTE_RAMP_UP_S);
        g.gain.exponentialRampToValueAtTime(GameConfig.AUDIO.TIMING.NOTE_MIN_GAIN, time + duration); 

        osc.connect(g).connect(this.ctx.destination);
        osc.start(time);
        osc.stop(time + duration + GameConfig.AUDIO.TIMING.NOTE_STOP_OFFSET_S);
        
        this.activeSources.push(osc);
        setTimeout(() => {
            const idx = this.activeSources.indexOf(osc);
            if (idx > -1) this.activeSources.splice(idx, 1);
        }, (duration + GameConfig.AUDIO.TIMING.ACTIVE_SOURCE_CLEANUP_BUFFER_S) * 1000);
    }

    /**
     * すべての再生音を停止する。
     * 副作用: AudioContextの再生中ソースを停止する。
     */
    stop() {
        this.stopBGM();
    }

    /**
     * BGM再生のみ停止する。
     * 副作用: BGM再生状態を停止する。
     */
    stopBGM() {
        this.isPlaying = false;
        
        // ★修正: 停止時に勝利ループ用フラグを確実に倒す
        this.isVictoryLoopActive = false;

        if (this.schedulerTimer) clearTimeout(this.schedulerTimer);
        
        if (this.victoryLoopTimer) {
            clearTimeout(this.victoryLoopTimer);
            this.victoryLoopTimer = null;
        }
        
        // 全ての音源停止
        this.activeSources.forEach(s => { 
            try { 
                s.stop(); 
                s.disconnect(); 
            } catch(e){} 
        });
        this.activeSources = [];
    }

    /**
     * MIDIバッファを解析してノート配列に変換する。
     * @param {ArrayBuffer} buffer - MIDIバッファ。
     * @param {number} targetBpm - 目標BPM。
     * @returns {Array}
     */
    parseMidiBuffer(buffer, targetBpm) {
        const data = new DataView(buffer);
        let offset = 0;
        if (data.getUint8(0) !== 0x4D || data.getUint8(1) !== 0x54) return []; 
        offset = 14; 
        const numTracks = data.getUint16(10);
        const division = data.getUint16(12);
        const notes = [];
        for (let i = 0; i < numTracks; i++) {
            if (offset >= data.byteLength) break;
            if (data.getUint8(offset) === 0x4D && data.getUint8(offset+1) === 0x54) { 
                const trackLength = data.getUint32(offset + 4);
                offset += 8;
                this.parseTrack(data, offset, trackLength, division, notes, targetBpm);
                offset += trackLength;
            } else { break; }
        }
        notes.sort((a, b) => a.time - b.time);
        return notes;
    }

    /**
     * MIDIトラックを解析してノート情報を追加する。
     * @param {Uint8Array} data - MIDIデータ。
     * @param {number} offset - 開始位置。
     * @param {number} length - 解析長。
     * @param {number} division - 分解能。
     * @param {Array} notesArray - 追加先配列。
     * @param {number} targetBpm - 目標BPM。
     */
    parseTrack(data, offset, length, division, notesArray, targetBpm) {
        const end = offset + length;
        let timeTicks = 0;
        let lastStatus = 0;
        while (offset < end && offset < data.byteLength) {
            let delta = 0;
            while (true) {
                const b = data.getUint8(offset++);
                delta = (delta << 7) | (b & 0x7F);
                if (!(b & 0x80)) break;
            }
            timeTicks += delta;
            let timeSec = (timeTicks / division) * (60 / targetBpm);
            let status = data.getUint8(offset++);
            if (!(status & 0x80)) { status = lastStatus; offset--; }
            lastStatus = status;
            const eventType = status & 0xF0;
            if (eventType === 0x90) { 
                const noteNumber = data.getUint8(offset++);
                const velocity = data.getUint8(offset++);
                if (velocity > 0) {
                    const freq = 440 * Math.pow(2, (noteNumber - 69) / 12);
                    notesArray.push({ freq, time: timeSec, velocity: velocity / 127 });
                }
            } 
            else if (eventType === 0x80 || eventType === 0xA0 || eventType === 0xB0 || eventType === 0xE0) { offset += 2; }
            else if (eventType === 0xC0 || eventType === 0xD0) { offset += 1; }
            else if (status === 0xFF) { offset++; const metaLen = data.getUint8(offset++); offset += metaLen; }
        }
    }
    
    // --- SE再生メソッド群 ---
    playAttack() { this.playSE(GameConfig.AUDIO.SE_KEYS.SLASH); }
    playMagic() { this.playSE(GameConfig.AUDIO.SE_KEYS.MAGIC); }
    playMagicFire() { this.playSE(GameConfig.AUDIO.SE_KEYS.FIRE); }
    playMagicMeteor() { this.playSE(GameConfig.AUDIO.SE_KEYS.METEOR); }
    playHeal() { this.playSE(GameConfig.AUDIO.SE_KEYS.HEAL); }
    playMeditation(){ this.playSE(GameConfig.AUDIO.SE_KEYS.MEDITATION); }
    playKobu(){ this.playSE(GameConfig.AUDIO.SE_KEYS.KOBU); }
    playCover(){ this.playSE(GameConfig.AUDIO.SE_KEYS.COVER); }
    playSplited(){this.playSE(GameConfig.AUDIO.SE_KEYS.SPLITED);}
    playBukubuku(){this.playSE(GameConfig.AUDIO.SE_KEYS.BUKUBUKU);}
    playPoison(){this.playSE(GameConfig.AUDIO.SE_KEYS.POISON);}
    playBreath(){this.playSE(GameConfig.AUDIO.SE_KEYS.BREATH);}
    playDragon_voice(){this.playSE(GameConfig.AUDIO.SE_KEYS.DRAGON_VOICE);}
    playSpecialReady() { this.playSE(GameConfig.AUDIO.SE_KEYS.SPECIAL_READY); }
    playSpecial() { this.playSE(GameConfig.AUDIO.SE_KEYS.SPECIAL); }
    /**
     * 属性ヒット音を再生する。
     * @param {string} tag - 属性タグ。
     */
    playElementHit(tag) {
        if (tag === GameConfig.ELEMENT_TAGS.HOLY) return this.playSE(GameConfig.AUDIO.SE_KEYS.HOLY);
        if (tag === GameConfig.ELEMENT_TAGS.ICE) return this.playSE(GameConfig.AUDIO.SE_KEYS.ICE);
        if (tag === GameConfig.ELEMENT_TAGS.FIRE) return this.playSE(GameConfig.AUDIO.SE_KEYS.FIRE);
        return this.playSE(GameConfig.AUDIO.SE_KEYS.MAGIC);
    }
    /**
     * 被ダメージ音を再生する。
     */
    playDamage() {
        this.playSE(GameConfig.AUDIO.SE_KEYS.DAMAGE);
    }
    playWin(){this.playSE(GameConfig.AUDIO.SE_KEYS.WIN);}
    

    /**
     * 和音/単音をまとめて再生する。
     * @param {Array} freqs - 周波数配列。
     * @param {number} time - 開始時刻。
     * @param {number} dur - 再生時間。
     * @param {number} vol - 音量。
     * @param {string} type - 波形種別。
     */
    playInstr(freqs, time, dur, vol, type = AudioConstants.WAVEFORMS.INSTRUMENT_DEFAULT) {
        if (!this.ctx) return;
        
        // ★修正: 停止フラグが降りていたら音を予約しない（これが重要！）
        if (!this.isPlaying && !this.isVictoryLoopActive) return;

        const tones = Array.isArray(freqs) ? freqs : [freqs];

        tones.forEach(f => {
            const osc = this.ctx.createOscillator();
            const g = this.ctx.createGain();
            osc.type = type;

            const filter = this.ctx.createBiquadFilter();
            filter.type = AudioConstants.FILTERS.LOWPASS;
            filter.frequency.value = AudioConstants.FILTERS.INSTRUMENT_FREQ;

            osc.frequency.setValueAtTime(f, time);
            g.gain.setValueAtTime(0, time);
            g.gain.linearRampToValueAtTime(vol, time + GameConfig.AUDIO.INSTRUMENT.GAIN_RAMP_UP_S);
            g.gain.setValueAtTime(vol * GameConfig.AUDIO.INSTRUMENT.GAIN_SUSTAIN_MULTIPLIER, time + GameConfig.AUDIO.INSTRUMENT.GAIN_SUSTAIN_TIME_S); 
            g.gain.linearRampToValueAtTime(0, time + dur); 

            osc.connect(filter).connect(g).connect(this.ctx.destination);
            osc.start(time);
            osc.stop(time + dur + GameConfig.AUDIO.INSTRUMENT.STOP_OFFSET_S);
            
            this.activeSources.push(osc);
            setTimeout(() => {
                 const idx = this.activeSources.indexOf(osc);
                 if (idx > -1) this.activeSources.splice(idx, 1);
            }, (dur + GameConfig.AUDIO.INSTRUMENT.CLEANUP_BUFFER_S) * 1000);
        });
    }

}
