/**
 * ゲーム内のBGMおよびSE（効果音）を制御するクラス
 * Web Audio APIを使用してリアルタイムに音を合成・再生します
 */
export class BattleBGM {
    constructor() {
        this.ctx = null;           // AudioContext
        this.isPlaying = false;    // BGM再生中フラグ
        this.allNotes = [];        // 現在再生中の音符データ
        this.fixedBpm = 180;       // 現在の再生速度
        this.baseBpm = 180;        // 通常曲の基本BPM
        
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
            map:    [],
            normal: [], 
            elite:  [], 
            shadow:   [],
            boss:   []    
        };
        
        // MIDIファイルパス設定
        this.bgmFiles = {
            map: './resource/map.mid',
            normal: './resource/endtime.mid', 
            elite:  './resource/endymion.mid', 
            shadow:   './resource/magnoria.mid', 
            boss:   './resource/Laqryma.mid'   
        };

        // エンディング用MP3ファイルのパス
        this.endingFile = './resource/ending.mp3';
        this.endingBuffer = null;

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
        this.seBuffers = {};       
    }

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

        // 各MIDI BGMの読み込み
        const bgmPromiseMap = this.loadMidi(this.bgmFiles.map, 'map');
        const bgmPromiseNormal = this.loadMidi(this.bgmFiles.normal, 'normal');
        
        const bgmPromiseElite = this.loadMidi(this.bgmFiles.elite, 'elite').catch(() => {
            console.log("エリートBGMが見つかりません。通常曲を流用します。");
            this.bgmData.elite = null;
        });
        const bgmPromiseShadow = this.loadMidi(this.bgmFiles.shadow, 'shadow').catch(() => {
            console.log("shadowBGMが見つかりません。通常曲を流用します。");
            this.bgmData.elite = null;
        });

        const bgmPromiseBoss = this.loadMidi(this.bgmFiles.boss, 'boss').catch(() => {
            console.log("ボスBGMが見つかりません。エリート曲を流用します。");
            this.bgmData.boss = null; 
        });

        await Promise.all([...sePromises, endingPromise, bgmPromiseNormal, bgmPromiseElite, bgmPromiseBoss]);
        console.log("全オーディオファイルのロード完了");
    }

    async loadMidi(url, type) {
        const res = await fetch(url);
        if (!res.ok) throw new Error(`File not found: ${url}`);
        const arrayBuffer = await res.arrayBuffer();
        
        let targetBpm = 180;
        if (type ==='map') targetBpm = 100;
        if (type === 'elite') targetBpm = 220; 
        if (type === 'dark')  targetBpm = 160; 
        if (type === 'boss')  targetBpm = 236; 

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
    
    /**
     * BGM再生
     */
    playBGM(type = 'normal') {
        this.stopBGM(); // ★ここで全てのBGM（勝利ループ含む）を停止
        this.currentType = type;

        // エンディング(MP3)の場合はここで再生してリターン
        if (type === 'ending') {
            if (this.endingBuffer) {
                const source = this.ctx.createBufferSource();
                source.buffer = this.endingBuffer;
                source.loop = true; 
                
                const gainNode = this.ctx.createGain();
                gainNode.gain.value = 0.6; 

                source.connect(gainNode).connect(this.ctx.destination);
                source.start(0);
                
                this.activeSources.push(source);
                this.isPlaying = true;
            }
            return; // MIDI処理には行かない
        }

        // --- MIDI再生ロジック ---
        let notesToPlay = this.bgmData.normal;
        let bpmToUse = this.baseBpm;

        if (type === 'map'){
            if (this.bgmData.map) {
                notesToPlay = this.bgmData.map;
                bpmToUse = 100; 
            } else {
                notesToPlay = []; 
            }
        }
        else if (type === 'boss') {
            if (this.bgmData.boss) {
                notesToPlay = this.bgmData.boss;
                bpmToUse = 236; 
            } else if (this.bgmData.elite) {
                notesToPlay = this.bgmData.elite;
                bpmToUse = 220;
            }
        }
        else if (type === 'shadow') {
            if (this.bgmData.boss) {
                notesToPlay = this.bgmData.shadow;
                bpmToUse = 160; 
            } else if (this.bgmData.elite) {
                notesToPlay = this.bgmData.elite;
                bpmToUse = 220;
            }
        } 
        else if (type === 'elite') {
            if (this.bgmData.elite) {
                notesToPlay = this.bgmData.elite;
                bpmToUse = 220; 
            } else {
                notesToPlay = this.bgmData.normal;
                bpmToUse = this.baseBpm * 1.2;
            }
        }

        this.allNotes = notesToPlay;
        this.fixedBpm = bpmToUse;

        if (this.allNotes && this.allNotes.length > 0) {
            this.isPlaying = true;
            this.nextNoteIndex = 0;
            this.startTime = this.ctx.currentTime + 0.1;
            this.schedule();
        }
    }

    schedule() {
        if (!this.isPlaying) return;
        if (this.currentType === 'ending') return;

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

    stop() {
        this.stopBGM();
    }

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
    
    /**
     * 勝利ファンファーレ（イントロ演奏後、ループへ移行）
     */
    playVictoryFanfare() {
        if (!this.ctx) return;
        this.stopBGM();
        const now = this.ctx.currentTime + 0.1;
        
        // ★修正: 勝利モードON（このフラグがないとループしません）
        this.isVictoryLoopActive = true;

        // Cメジャーコードのファンファーレ
        const C4=261.6, E4=329.6, G4=392.0, Ab4=415.3, Bb4=466.2, C5=523.2, F4=349.2, D4=293.7;
        const s = 0.11; 
        const v = 0.05; 

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

    playInstr(freqs, time, dur, vol, type = "sawtooth") {
        if (!this.ctx) return;
        
        // ★修正: 停止フラグが降りていたら音を予約しない（これが重要！）
        if (!this.isPlaying && !this.isVictoryLoopActive) return;

        const tones = Array.isArray(freqs) ? freqs : [freqs];

        tones.forEach(f => {
            const osc = this.ctx.createOscillator();
            const g = this.ctx.createGain();
            osc.type = type;

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

    /**
     * 勝利後のBGMループ処理
     */
    startVictoryLoop(startTime) {
        const self = this;
        const scheduleNext = (time) => {
            // ★修正: ここで専用フラグをチェック！
            // stopBGM() が呼ばれてフラグがfalseになったら、即座に終了します
            if (!self.isVictoryLoopActive) return;

            // もしstopBGM()が呼ばれていたら止める（念のため）
            if (self.victoryLoopTimer === null) return;

            const C3=130.8, C4=261.6, D4=293.7, E4=329.6, F4=349.2, G4=392.0, A4=440.0, B4=493.8, C5=523.2;

            // ベース
            for (let i = 0; i < 8; i++) {
                const t = time + i * 0.4;
                self.playInstr([C3], t, 0.2, 0.05, "square"); 
                self.playInstr([C4], t + 0.2, 0.1, 0.03, "square");
            }

            // メロディ
            const melody = [
                { f: [C5, G4], d: 0, dur: 0.3 },
                { f: [C5, G4], d: 0.4, dur: 0.3 },
                { f: [G4], d: 0.8, dur: 0.3 },
                { f: [A4], d: 1.2, dur: 0.3 },
                { f: [B4], d: 1.6, dur: 0.6 },
                { f: [C5], d: 2.4, dur: 0.8 }
            ];

            melody.forEach(m => {
                self.playInstr(m.f, time + m.d, m.dur, 0.06, "sawtooth");
                self.playInstr(m.f, time + m.d, m.dur, 0.03, "square");
            });

            // 和音
            self.playInstr([E4, G4], time, 1.5, 0.03, "triangle");
            self.playInstr([F4, A4], time + 1.6, 1.5, 0.03, "triangle");

            // 再帰呼び出し（3秒ループ）
            self.victoryLoopTimer = setTimeout(() => {
                // ここでも停止済みかチェック
                if (!self.isVictoryLoopActive) return;
                
                const nextStartTime = Math.max(time + 3.2, self.ctx.currentTime + 0.1);
                scheduleNext(nextStartTime);
            }, 3000);
        };
        
        // 初回起動
        this.victoryLoopTimer = setTimeout(() => {}, 0); 
        scheduleNext(startTime);
    }
}