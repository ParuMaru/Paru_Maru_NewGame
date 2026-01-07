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
            // A. 自分に攻撃UPがないなら、50%で「鼓舞」
            if (enemy.mp >= SkillData.encourage.cost && !enemy.hasBuff('atk_up')) {
                if (Math.random() < 0.5) {
                    return { type: 'skill', target: allies, detail: SkillData.encourage };
                }
            }
            
            // B. MPがあれば、30%で必殺技「シャドウスラッシュ」
            if (enemy.mp >= SkillData.shadow_slash.cost && Math.random() < 0.3) {
                // HPが一番低いキャラを狙う
                const target = [...party].sort((a,b) => a.hp - b.hp)[0];
                return { type: 'skill', target: target, detail: SkillData.shadow_slash };
            }
        }

        // --- 2. 影の魔導師 ---
        if (enemy.enemyType === 'shadow_wizard') {
            // A. 30%の確率で「ダークメテオ」（全体大魔法）
            if (enemy.mp >= SkillData.dark_meteor.cost && Math.random() < 0.2) {
                 return { type: 'skill', target: party, detail: SkillData.dark_meteor };
            }

            // B. ファイラ (40%)
            if (enemy.mp >= SkillData.fira.cost && Math.random() < 0.4) {
                 return { type: 'skill', target: party, detail: SkillData.fira };
            }
            
            // C. ファイア
            if (enemy.mp >= SkillData.fire.cost && Math.random() < 0.4) {
                 const target = party[Math.floor(Math.random() * party.length)];
                 return { type: 'skill', target: target, detail: SkillData.fire };
            }
        }

        // --- 3. 影の僧侶 ---
        if (enemy.enemyType === 'shadow_healer') {
            const pinchAllies = allies.filter(a => (a.hp / a.max_hp) < 0.5);

            // A. ピンチなら回復優先 
            if (pinchAllies.length >= 2 && enemy.mp >= SkillData.medica.cost) {
                return { type: 'skill', target: allies, detail: SkillData.medica };
            }
            if (pinchAllies.length >= 1 && enemy.mp >= SkillData.heal.cost) {
                const target = [...pinchAllies].sort((a,b) => a.hp - b.hp)[0];
                return { type: 'skill', target: target, detail: SkillData.heal };
            }

            // B. 余裕があるときは「カース」で攻撃＆デバフ 
            if (enemy.mp >= SkillData.curse.cost && Math.random() < 0.9) {
                 const target = party[Math.floor(Math.random() * party.length)];
                 return { type: 'skill', target: target, detail: SkillData.curse };
            }
        }
        // --- 影の支配者 ---
        if (enemy.enemyType === 'shadow_lord') {
            const rand = Math.random();

            // A. 3ターンに1回くらいの高確率で「カオスウェーブ」(全体)
            // MPが十分あれば 35%
            if (enemy.mp >= SkillData.chaos_wave.cost && rand < 0.35) {
                return { type: 'skill', target: party, detail: SkillData.chaos_wave };
            }
            
            // B. 30%で「ダークメテオ」
            if (enemy.mp >= SkillData.dark_meteor.cost && rand < 0.65) {
                return { type: 'skill', target: party, detail: SkillData.dark_meteor };
            }

            // C. 残りは「シャドウスラッシュ」で確実に一人を狙う
            if (enemy.mp >= SkillData.shadow_slash.cost) {
                // HPが高いキャラを狙い撃ち（勇者狙い）
                const target = party.sort((a,b) => b.hp - a.hp)[0];
                return { type: 'skill', target: target, detail: SkillData.shadow_slash };
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
        else if (!enemy.enemyType && enemy.name.includes('クラゲ')) {
            // 30%で「触手」
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