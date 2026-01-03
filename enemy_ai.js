import { SkillData } from './skills.js';

export class EnemyAI {
    /**
     * 敵の行動を決定する
     */
    think(enemy, party) {
        // ターゲットがいなければ何もしない
        if (!party || party.length === 0) {
            return { type: 'wait', target: null };
        }

        // ------------------------------------------
        // 1. 氷のドラゴンの行動 (ice_dragon)
        // ------------------------------------------
        if (enemy.enemyType === 'ice_dragon') {
            // 40%の確率で「こごえる吹雪」
            if (Math.random() < 0.4) {
                return {
                    type: 'skill',
                    target: party, // 全体攻撃
                    detail: SkillData.ice_breath
                };
            }
            // それ以外は通常攻撃へ
        }

        // ------------------------------------------
        // 2. ゴブリンの行動 (goblin)
        // ------------------------------------------
        if (enemy.enemyType === 'goblin') {
            // 40%の確率で「こんぼう強打」
            if (Math.random() < 0.4) {
                const target = party[Math.floor(Math.random() * party.length)];
                return {
                    type: 'skill',
                    target: target,
                    detail: SkillData.smash
                };
            }
        }

        // ------------------------------------------
        // 3. キングスライムの行動
        // ------------------------------------------
        if (enemy.isKing) {
            // 30%で全体攻撃「のしかかり」
            if (Math.random() < 0.3) {
                return {
                    type: 'skill',
                    target: party, 
                    detail: SkillData.body_slam
                };
            }
        } 
        
        // ------------------------------------------
        // 4. 通常スライム（他の条件に当てはまらない場合で、名前がスライム系）
        // ------------------------------------------
        else if (!enemy.enemyType && enemy.name.includes('スライム')) {
            // 30%で「消化液」
            if (Math.random() < 0.3) {
                const target = party[Math.floor(Math.random() * party.length)];
                return {
                    type: 'skill',
                    target: target,
                    detail: SkillData.acid
                };
            }
        }

        // ------------------------------------------
        // デフォルト：通常攻撃
        // ------------------------------------------
        const target = party[Math.floor(Math.random() * party.length)];
        return {
            type: 'attack',
            target: target,
            detail: null
        };
    }
}