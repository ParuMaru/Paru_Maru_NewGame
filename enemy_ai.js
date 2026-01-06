import { SkillData } from './skills.js';

export class EnemyAI {
    /**
     * 敵の行動を決定する
     */
    think(enemy, party, allies = []) {
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
            // C. 35%で強力な爪攻撃
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
        
        // ==========================================
        // ★追加：影のパーティシリーズの行動
        // ==========================================

        // --- 1. 影の勇者 (shadow_hero) ---
        if (enemy.enemyType === 'shadow_hero') {
            // スキル：鼓舞 (味方全体ATKアップ)
            const skill = SkillData.encourage;
            
            // MPが足りていて、かつ自分に攻撃UPがかかっていないなら高確率で使用
            if (enemy.mp >= skill.cost && !enemy.hasBuff('atk_up')) {
                if (Math.random() < 0.6) {
                    return { type: 'skill', target: allies, detail: skill };
                }
            }
        }

        // --- 2. 影の魔導師 (shadow_wizard) ---
        if (enemy.enemyType === 'shadow_wizard') {
            // スキル：ファイラ(全体) or ファイア(単体)
            
            // MPが十分あれば、40%の確率で「ファイラ(全体)」
            if (enemy.mp >= SkillData.fira.cost && Math.random() < 0.4) {
                 return { type: 'skill', target: party, detail: SkillData.fira };
            }
            
            // MPがあれば、40%の確率で「ファイア(単体)」
            if (enemy.mp >= SkillData.fire.cost && Math.random() < 0.4) {
                 // ランダムターゲット
                 const target = party[Math.floor(Math.random() * party.length)];
                 return { type: 'skill', target: target, detail: SkillData.fire };
            }
            
        }

        // --- 3. 影の僧侶 (shadow_healer) ---
        if (enemy.enemyType === 'shadow_healer') {
            // 味方のピンチ具合をチェック
            const damagedAllies = allies.filter(a => a.hp < a.max_hp);
            const pinchAllies = allies.filter(a => (a.hp / a.max_hp) < 0.5);

            // A. ピンチ(HP半分以下)が2人以上いたら「メディカ(全体回復)」
            if (pinchAllies.length >= 2 && enemy.mp >= SkillData.medica.cost) {
                return { type: 'skill', target: allies, detail: SkillData.medica };
            }

            // B. ピンチが1人でもいたら、その人に「ケアル(単体回復)」
            if (pinchAllies.length >= 1 && enemy.mp >= SkillData.heal.cost) {
                // 一番減っている人を狙う
                const target = pinchAllies.sort((a,b) => a.hp - b.hp)[0];
                return { type: 'skill', target: target, detail: SkillData.heal };
            }

            // C. 誰もピンチじゃないけど、少し減ってる人がいたら30%で回復してあげる
            if (damagedAllies.length > 0 && enemy.mp >= SkillData.heal.cost && Math.random() < 0.3) {
                 const target = damagedAllies[Math.floor(Math.random() * damagedAllies.length)];
                 return { type: 'skill', target: target, detail: SkillData.heal };
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