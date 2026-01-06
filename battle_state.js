import { Hero, Wizard, Healer, Slime, KingSlime } from './entities.js';

export class BattleState {
    constructor() {
        // 1. 味方の生成
        this.party = [
            new Hero("勇者ぱるむ"),
            new Wizard("魔法使いはな"),
            new Healer("癒し手なつ")
        ];

        // 2. 敵の生成
        this.enemies = [];

        this.turnOrder = [];
        this.currentActor = null;
        
        // ★追加: 戦闘全体の経過行動値（ラウンド計算用）
        this.totalBattleAV = 0; 
        this.currentRound = 1;
        
        // 初回計算
        this.initBattleAV();
    }
    
    // 戦闘開始時の準備
    initBattleAV() {
        const all = [...this.getAliveParty(), ...this.getAliveEnemies()];
        
        // 全員に最初の行動値をセット
        // (スターレイル仕様：開幕は全員 10000/速度 でセットされる)
        all.forEach(chara => {
            chara.resetActionValue();
        });
        
        // ログ用などのために、行動値が小さい順に並べておく（表示用）
        this.sortQueue();
    }

    // 行動値が小さい順に並び替え（UI表示用）
    sortQueue() {
        const all = [...this.getAliveParty(), ...this.getAliveEnemies()];
        this.turnOrder = all.sort((a, b) => a.actionValue - b.actionValue);
    }

    /**
     * ★重要: 次の行動者を決定する（時間を進める）
     */
    advanceTimeAndGetActor() {
        // 生存者リスト
        const all = [...this.getAliveParty(), ...this.getAliveEnemies()];
        if (all.length === 0) return null;

        // 1. 一番行動値が小さい人（＝次の行動者）を探す
        // 並び替えて先頭を取る
        const nextActor = all.sort((a, b) => a.actionValue - b.actionValue)[0];
        
        // 2. その人の行動値（＝経過時間）を取得
        const elapsedAV = nextActor.actionValue;

        // 3. 全員の行動値を、その時間分だけ減らす
        // (nextActorは 0 になり、他の人は 0 に近づく)
        all.forEach(chara => {
            chara.actionValue = Math.max(0, chara.actionValue - elapsedAV);
        });

        // 4. 戦闘全体の時間を進める
        this.totalBattleAV += elapsedAV;
        this.updateRound(); // ラウンド更新チェック

        return nextActor;
    }
    
    // ラウンド（サイクル）の計算
    // 1ラウンド目は150AV、2ラウンド目以降は100AVずつ
    updateRound() {
        // 経過時間から現在のラウンドを逆算
        // 150 (1R) + 100 (2R) + 100 (3R)...
        
        if (this.totalBattleAV <= 150) {
            this.currentRound = 1;
        } else {
            // (経過時間 - 最初の150) / 100 + 1ラウンド目
            this.currentRound = 1 + Math.ceil((this.totalBattleAV - 150) / 100);
        }
    }

    /**
     * 生存している味方を取得
     */
    getAliveParty() {
        return this.party.filter(p => p.is_alive());
    }

    /**
     * 生存している敵を取得
     */
    getAliveEnemies() {
        return this.enemies.filter(e => e.is_alive());
    }

    /**
     * 全滅判定
     */
    checkGameOver() {
        return this.getAliveParty().length === 0;
    }

    /**
     * 勝利判定
     */
    checkVictory() {
        return this.getAliveEnemies().length === 0;
    }

    /**
     * 行動順の計算（素早さ順）
     */
    calculateTurnOrder() {
        // 生きている全員をリストアップ
        const all = [...this.getAliveParty(), ...this.getAliveEnemies()];
        
        // 素早さ(spd)で降順ソート（速い順）
        this.turnOrder = all.sort((a, b) => b.spd - a.spd);
        
        this.currentActorIndex = 0;
    }

    /**
     * 現在のターン行動者を取得
     */
    getCurrentActor() {
        // リストが空、または最後まで行ったら再計算
        if (!this.turnOrder || this.turnOrder.length === 0 || this.currentActorIndex >= this.turnOrder.length) {
            this.calculateTurnOrder();
        }

        // それでも空なら（全員死んでる異常事態）、nullを返す
        if (this.turnOrder.length === 0) return null;
        
        // 行動者が死んでいたらスキップする処理
        // (無限ループしないように while で安全に進める)
        while (
            this.currentActorIndex < this.turnOrder.length &&
            !this.turnOrder[this.currentActorIndex].is_alive()
        ) {
            this.currentActorIndex++;
            // 最後まで行っちゃったら再計算して最初から
            if (this.currentActorIndex >= this.turnOrder.length) {
                this.calculateTurnOrder();
                // 再計算しても誰もいなければ脱出（勝利判定へ行くはず）
                if (this.turnOrder.length === 0) return null;
            }
        }

        return this.turnOrder[this.currentActorIndex];
    }

    /**
     * 次のターンへ
     */
    nextTurn() {
        this.currentActorIndex++;
        // ここではインクリメントだけして、実際のスキップ判定は getCurrentActor に任せる
    }
}