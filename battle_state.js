import { Hero, Wizard, Healer, Slime, KingSlime } from './entities.js';

export class BattleState {
    constructor() {
        // 1. 味方の生成
        this.party = [
            new Hero(),
            new Wizard(),
            new Healer()
        ];

        // 2. 敵の生成（初期はキングスライム）
        this.enemies = [
            new KingSlime()
        ];

        // 3. ターン管理（配列で順番を管理する方式に変更）
        this.turnOrder = [];
        this.currentActorIndex = 0;
        
        // 初回の行動順を計算
        this.calculateTurnOrder();
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