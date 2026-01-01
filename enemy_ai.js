import { SkillData } from './skills.js';

export class EnemyAI {
    /**
     * 敵の行動を決定する
     * @param {Entity} enemy - 行動する敵
     * @param {Array} party - 生存している味方パーティ
     */
    think(enemy, party) {
        // ターゲットがいなければ何もしない（エラー回避）
        if (!party || party.length === 0) {
            return { type: 'wait', target: null };
        }

        // --- キングスライムの行動パターン ---
        if (enemy.isKing) {
            // 3割の確率で「のしかかり」を使用
            // ※HPが減って分裂した後は通常スライムになるので使わなくなる
            if (Math.random() < 0.3) {
                // skills.jsから読み込む
                const skill = SkillData.body_slam;
                
                if (skill) {
                    return {
                        type: 'skill',
                        target: party, // 全体攻撃なのでパーティ全員をターゲットに
                        detail: skill
                    };
                }
            }
        }

        // --- 通常攻撃（デフォルト） ---
        // ランダムに一人を狙う
        const target = party[Math.floor(Math.random() * party.length)];
        return {
            type: 'attack',
            target: target,
            detail: null
        };
    }
}