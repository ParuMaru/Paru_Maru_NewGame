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
            const rand = Math.random();

            // A. HPが減って怒り状態（バフがかかっていないなら優先的に咆哮）
            // enemy.buff_turns が 0 なら 20% の確率で咆哮
            if (!enemy.hasBuff('atk_up') && rand < 0.2) {
                 return {
                    type: 'skill',
                    target: enemy,
                    detail: SkillData.howling
                };
            }

            // B. 35%で全体ブレス
            if (rand < 0.35) {
                return {
                    type: 'skill',
                    target: party,
                    detail: SkillData.ice_breath
                };
            }
            
            // C. 35%で強力な爪攻撃（HPが低いキャラを狙う等の嫌らしい動きも可）
            if (rand < 0.70) {
                 // ランダムターゲット
                 const target = party[Math.floor(Math.random() * party.length)];
                 return {
                    type: 'skill',
                    target: target,
                    detail: SkillData.dragon_claw
                };
            }

            // D. 残りは通常攻撃
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