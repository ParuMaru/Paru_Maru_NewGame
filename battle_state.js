import { Hero, Wizard, Healer, Slime } from './entities.js';

export class BattleState {
    constructor() {
        // 1. 味方の生成
        this.party = [
            new Hero(),
            new Wizard(),
            new Healer()
        ];

        // 2. 敵の生成（初期はスライム1体）
        this.enemies = [
            new Slime()
        ];

        // 3. ターン管理
        this.turnIndex = 0; // 0:味方1, 1:味方2, 2:味方3, 3:敵...
        this.isPlayerTurn = true;
        this.turnCount = 1;
    }

    /**
     * 現在のターン行動者を取得
     */
    getCurrentActor() {
        if (this.turnIndex < this.party.length) {
            return this.party[this.turnIndex];
        } else {
            return this.enemies[this.turnIndex - this.party.length];
        }
    }

    /**
     * 次のターンへ進める
     * 全員の行動が終わったら、最初に戻る
     */
    nextTurn() {
        this.turnIndex++;
        
        // 全員の行動が一周したかチェック
        const totalParticipants = this.party.length + this.enemies.length;
        if (this.turnIndex >= totalParticipants) {
            this.turnIndex = 0;
            this.turnCount++;
        }

        // 現在の行動者が死んでいる場合は、自動的に次へ飛ばす
        const actor = this.getCurrentActor();
        if (actor && !actor.is_alive()) {
            this.nextTurn();
        }
    }

    /**
     * 生存している味方のリストを取得
     */
    getAliveParty() {
        return this.party.filter(p => p.is_alive());
    }

    /**
     * 生存している敵のリストを取得
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
}