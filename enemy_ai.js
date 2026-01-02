import { SkillData } from './skills.js';

export class EnemyAI {
    /**
     * 敵の行動を決定する
     * @param {Entity} enemy - 行動する敵
     * @param {Array} party - 生存している味方パーティ
     */
    think(enemy, party) {
        // ターゲットがいなければ何もしない
        if (!party || party.length === 0) {
            return { type: 'wait', target: null };
        }

        // --- キングスライムの行動パターン ---
        if (enemy.isKing) {
            // 3割の確率で全体攻撃「のしかかり」
            if (Math.random() < 0.3) {
                const skill = SkillData.body_slam;
                if (skill) {
                    return {
                        type: 'skill',
                        target: party, 
                        detail: skill
                    };
                }
            }
        } 
        // --- 通常スライムの行動パターン ---
        else {
            // 3割の確率で強攻撃「消化液」を使用
            if (Math.random() < 0.3) {
                const skill = SkillData.acid;
                // ランダムに誰かを狙う
                const target = party[Math.floor(Math.random() * party.length)];
                
                if (skill) {
                    return {
                        type: 'skill',
                        target: target,
                        detail: skill
                    };
                }
            }
        }

        // --- 通常攻撃（デフォルト） ---
        // 上記の条件に当てはまらなかったら、ランダムに殴る
        const target = party[Math.floor(Math.random() * party.length)];
        return {
            type: 'attack',
            target: target,
            detail: null
        };
    }
}