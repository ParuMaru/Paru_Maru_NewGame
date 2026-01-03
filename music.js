/**
 * ゲーム内のBGMおよびSE（効果音）を制御するクラス
 * Web Audio APIを使用してリアルタイムに音を合成・再生します
 */
export class BattleBGM {
    constructor() {
        this.ctx = null;           // AudioContext
        this.isPlaying = false;    // 通常BGM再生中フラグ
        this.allNotes = [];        // 現在再生中の音符データ
        this.fixedBpm = 180;       // 現在の再生速度
        this.baseBpm = 180;        // 通常曲の基本BPM
        
        this.bgmData = {
            normal: [], 
            boss: []    
        };
        
        this.bgmFiles = {
            normal: './resource/endtime.mid', 
            boss:   './resource/endymion.mid' 
        };
        
        this.currentType = 'normal';
        
        this.seFiles = {
            'slash': './resource/slash.mp3',
            'magic': './resource/magic.mp3',
            'fire': './resource/fire.mp3',
            'meteor': './resource/meteor.mp3',
            'heal': './resource/heal.mp3',
            'meditation': './resource/meditation.mp3',
            'kobu': './resource/kobu.mp3',
            'cover': './resource/cover.mp3',
            'splited': './resource/splited.mp3',
            'bukubuku': './resource/bukubuku.mp3',
            'damage': './resource/damage.mp3',
            'poison': './resource/poison.mp3',
            'breath': './resource/breath.mp3'
        };
        
        this.victoryLoopTimer = null;
        this.schedulerTimer = null; 
        this.nextNoteIndex = 0;    
        this.startTime = 0;        
        this.activeSources = [];   
        this.seBuffers = {};       
    }

    async initAndLoad() {
        this.initContext();

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

        const bgmPromiseNormal = this.loadMidi(this.bgmFiles.normal, 'normal');
        const bgmPromiseBoss = this.loadMidi(this.bgmFiles.boss, 'boss').catch(() => {
            console.log("ボスBGMが見つかりません。通常BGMを流用します。");
            this.bgmData.boss = null; 
        });

        await Promise.all([...sePromises, bgmPromiseNormal, bgmPromiseBoss]);
        console.log("全オーディオファイルのロード完了");
    }

    async loadMidi(url, type) {
        const res = await fetch(url);
        if (!res.ok) throw new Error(`File not found: ${url}`);
        const arrayBuffer = await res.arrayBuffer();
        const targetBpm = (type === 'boss') ? 220 : 180;
        this.bgmData[type] = this.parseMidiBuffer(arrayBuffer, targetBpm);
    }
    
    playSE(name, volume = 0.5) {
        if (!this.ctx || !this.seBuffers[name]) return;

        const source = this.ctx.createBufferSource();
        source.buffer = this.seBuffers[name];
        const gainNode = this.ctx.createGain();
        gainNode.gain.setValueAtTime(volume, this.ctx.currentTime);
        source.connect(gainNode).connect(this.ctx.destination);
        source.start(0);
    }

    initContext() {
        if (!this.ctx) {
            const AudioContextClass = window.AudioContext || window.webkitAudioContext;
            this.ctx = new AudioContextClass();
        }
        if (this.ctx.state === 'suspended') this.ctx.resume();
    }
    
    playBGM(type = 'normal') {
        this.stopBGM(); // ファンファーレループもここで止まります
        this.currentType = type;

        if (type === 'boss' && this.bgmData.boss && this.bgmData.boss.length > 0) {
            this.allNotes = this.bgmData.boss;
            this.fixedBpm = 220; 
        } else {
            this.allNotes = this.bgmData.normal;
            if (type === 'boss' && !this.bgmData.boss) {
                this.fixedBpm = this.baseBpm * 1.2; 
            } else {
                this.fixedBpm = this.baseBpm; 
            }
        }

        if (this.allNotes && this.allNotes.length > 0) {
            this.isPlaying = true;
            this.nextNoteIndex = 0;
            this.startTime = this.ctx.currentTime + 0.1;
            this.schedule();
        }
    }

    schedule() {
        if (!this.isPlaying) return;
        const lookAhead = 1.0; 
        const currentTime = this.ctx.currentTime - this.startTime;

        while (this.nextNoteIndex < this.allNotes.length && 
               this.allNotes[this.nextNoteIndex].time < currentTime + lookAhead) {
            const note = this.allNotes[this.nextNoteIndex];
            this.playNote(note.freq, this.startTime + note.time, 0.1);
            this.nextNoteIndex++;
        }

        if (this.nextNoteIndex >= this.allNotes.length && this.allNotes.length > 0) {
            const lastNoteTime = this.allNotes[this.allNotes.length - 1].time;
            if (currentTime > lastNoteTime + 2.0) {
                this.nextNoteIndex = 0;
                this.startTime = this.ctx.currentTime;
            }
        }
        this.schedulerTimer = setTimeout(() => this.schedule(), 200);
    }

    playNote(freq, time, vol) {
        if (!this.ctx) return;
        const osc = this.ctx.createOscillator();
        const g = this.ctx.createGain();
        
        osc.type = "square"; 
        
        osc.frequency.setValueAtTime(freq, time);
        const duration = 0.2; 

        g.gain.setValueAtTime(0, time);
        g.gain.linearRampToValueAtTime(vol * 0.2, time + 0.01);
        g.gain.exponentialRampToValueAtTime(0.001, time + duration); 

        osc.connect(g).connect(this.ctx.destination);
        osc.start(time);
        osc.stop(time + duration + 0.1);
        
        this.activeSources.push(osc);
        setTimeout(() => {
            const idx = this.activeSources.indexOf(osc);
            if (idx > -1) this.activeSources.splice(idx, 1);
        }, (duration + 0.2) * 1000);
    }

    // エイリアス
    stop() {
        this.stopBGM();
    }

    stopBGM() {
        this.isPlaying = false; // これをfalseにすることでvictoryLoop内のscheduleNextも止まる仕組み
        if (this.schedulerTimer) clearTimeout(this.schedulerTimer);
        if (this.victoryLoopTimer) {
            clearTimeout(this.victoryLoopTimer);
            this.victoryLoopTimer = null;
        }
        this.activeSources.forEach(s => { try { s.stop(); s.disconnect(); } catch(e){} });
        this.activeSources = [];
    }

    // --- MIDI解析 ---
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
    playAttack() { this.playSE('slash'); }
    playMagic() { this.playSE('magic'); }
    playMagicFire() { this.playSE('fire'); }
    playMagicMeteor() { this.playSE('meteor'); }
    playHeal() { this.playSE('heal'); }
    playMeditation(){ this.playSE('meditation'); }
    playKobu(){ this.playSE('kobu'); }
    playCover(){ this.playSE('cover'); }
    playSplited(){this.playSE('splited');}
    playBukubuku(){this.playSE('bukubuku');}
    playPoison(){this.playSE('poison');}
    playBreath(){this.playSE('breath');}
    playDamage() {
        if (!this.ctx) this.initContext();
        const now = this.ctx.currentTime;
        const osc = this.ctx.createOscillator();
        const g = this.ctx.createGain();
        osc.type = "sawtooth";
        osc.frequency.setValueAtTime(150, now);
        osc.frequency.linearRampToValueAtTime(40, now + 0.2); 
        g.gain.setValueAtTime(0.1, now);
        g.gain.linearRampToValueAtTime(0, now + 0.2);
        osc.connect(g).connect(this.ctx.destination);
        osc.start();
        osc.stop(now + 0.2);
    }
    
    playVictoryFanfare() {
        this.stop(); 
        this.initContext();
        this.isPlaying = false; // 通常BGMフラグをオフ

        const now = this.ctx.currentTime + 0.1;
        const C4=261.6, E4=329.6, G4=392.0, Ab4=415.3, Bb4=466.2, C5=523.2, F4=349.2, D4=293.7;
        const s = 0.11; // テンポ設定
        const v = 0.05; // 音量

        // 1. メインフレーズ
        this.playInstr([C5, G4, E4], now + 0, 0.1, v);
        this.playInstr([C5, G4, E4], now + s, 0.1, v);
        this.playInstr([C5, G4, E4], now + s * 2, 0.1, v);
        this.playInstr([C5, G4, E4], now + s * 3, 0.6, v); 
        this.playInstr([Ab4, 311.1, 207.6], now + 0.8, 0.4, v);
        this.playInstr([Bb4, 349.2, 233.1], now + 1.2, 0.4, v);

        const t3 = now + 1.6;
        this.playInstr([C5, G4, E4], t3, 0.2, v);
        this.playInstr([Bb4, F4, D4], t3 + 0.35, 0.12, v);
        this.playInstr([C5, G4, E4, 261.6], t3 + 0.47, 2.5, v + 0.02);

        // 3秒後にループBGMへ移行
        this.startVictoryLoop(now + 3.0);
    }

    /**
     * 指定した周波数（単音または配列による和音）を鳴らす関数
     * ★引数に type (波形) を追加しました！
     */
    playInstr(freqs, time, dur, vol, type = "sawtooth") {
        if (!this.ctx) return;
        
        const tones = Array.isArray(freqs) ? freqs : [freqs];

        tones.forEach(f => {
            const osc = this.ctx.createOscillator();
            const g = this.ctx.createGain();
            
            // ★ここを変更：引数で指定された波形を使う（デフォルトはsawtooth）
            osc.type = type;

            // フィルター（ブラスっぽい響きのため）
            const filter = this.ctx.createBiquadFilter();
            filter.type = "lowpass";
            filter.frequency.value = 2000;

            osc.frequency.setValueAtTime(f, time);
            
            g.gain.setValueAtTime(0, time);
            g.gain.linearRampToValueAtTime(vol, time + 0.02);
            g.gain.setValueAtTime(vol * 0.8, time + 0.05); 
            g.gain.linearRampToValueAtTime(0, time + dur); 

            osc.connect(filter).connect(g).connect(this.ctx.destination);
            osc.start(time);
            osc.stop(time + dur + 0.1);
            
            this.activeSources.push(osc);
            setTimeout(() => {
                 const idx = this.activeSources.indexOf(osc);
                 if (idx > -1) this.activeSources.splice(idx, 1);
            }, (dur + 0.2) * 1000);
        });
    }

    // ★ご指定のループ関数（playInstrの波形指定に対応済み）
    startVictoryLoop(startTime) {
        const self = this;
        const scheduleNext = (time) => {
            // 他のBGM（戦闘開始やマップ遷移で isPlaying が true に戻ったら）停止
            if (self.isPlaying) return; 

            const C3=130.8, G3=196.0, C4=261.6, D4=293.7, E4=329.6, F4=349.2, G4=392.0, A4=440.0, B4=493.8, C5=523.2;

            // --- A. ベースライン（ドッ・ドッのリズム） ---
            for (let i = 0; i < 8; i++) {
                const t = time + i * 0.4;
                self.playInstr([C3], t, 0.2, 0.05, "square"); 
                self.playInstr([C4], t + 0.2, 0.1, 0.03, "square");
            }

            // --- B. 凱旋メロディ（力強い旋律） ---
            const melody = [
                { f: [C5, G4], d: 0, dur: 0.3 },
                { f: [C5, G4], d: 0.4, dur: 0.3 },
                { f: [G4], d: 0.8, dur: 0.3 },
                { f: [A4], d: 1.2, dur: 0.3 },
                { f: [B4], d: 1.6, dur: 0.6 },
                { f: [C5], d: 2.4, dur: 0.8 }
            ];

            melody.forEach(m => {
                // 複数の波形を重ねて音に厚みを出す
                self.playInstr(m.f, time + m.d, m.dur, 0.06, "sawtooth");
                self.playInstr(m.f, time + m.d, m.dur, 0.03, "square");
            });

            // --- C. 背後の和音 ---
            self.playInstr([E4, G4], time, 1.5, 0.03, "triangle");
            self.playInstr([F4, A4], time + 1.6, 1.5, 0.03, "triangle");

            // 再帰的に次の小節を予約
            self.victoryLoopTimer = setTimeout(() => {
                const nextStartTime = Math.max(time + 3.2, self.ctx.currentTime + 0.1);
                scheduleNext(nextStartTime);
            }, 3000);
        };

        scheduleNext(startTime);
    }
}