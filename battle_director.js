export class BattleDirector {
    constructor(ui, music, effects, party, enemies) {
        this.ui = ui;
        this.music = music;
        this.effects = effects;
        this.party = party;
        this.enemies = enemies;
    }

    /**
     * キャラクターに対応するDOM IDを取得する（演出用）
     */
    _getTargetId(target) {
        if (target.job) {
            return `card-${this.party.indexOf(target)}`;
        } else {
            const index = this.enemies.indexOf(target);
            return index >= 0 ? `enemy-sprite-${index}` : 'enemy-target';
        }
    }

    // --- 攻撃系の演出 ---

    showAttackStart(actor) {
        const logColor = actor.job ? "#3498db" : "#f1c40f";
        this.ui.addLog(`${actor.name}の攻撃！`, logColor, true);
        const isMagicUser = (actor.job === 'wizard' || actor.job === 'healer');
        
        if (isMagicUser) this.music.playMagic();
        else this.music.playAttack();

        return isMagicUser; // 魔法職かどうかを返す（ヒット演出の分岐用）
    }

    showPhysicalHit(target, damage, isCritical, isMagicHit) {
        const targetId = this._getTargetId(target);

        // エフェクト分岐
        if (isMagicHit) this.effects.magicExplosion(targetId);
        else this.effects.slashEffect(targetId);

        // ポップアップ色
        const popupColor = "#ff4757";
        this.effects.damagePopup(damage, targetId, popupColor);

        // ログ
        if (isCritical) this.ui.addLog("クリティカルヒット！", "#f1c40f", true);
        this.ui.addLog(`> ${target.name}に ${damage} のダメージ！`);

        this._checkDeath(target, targetId);
    }

    // --- スキル・魔法系の演出 ---

    showSkillStart(actor, skill) {
        const logColor = actor.job ? "#3498db" : "#f1c40f";
        this.ui.addLog(`${actor.name}は ${skill.name} を使った！`, logColor, true);
    }

    showMagicEffect(skill, targets) {
        // 魔法ごとの特殊エフェクト分岐
        if (skill.id === 'fire') {
            this.music.playMagicFire();
            targets.forEach(t => this.effects.fireEffect(this._getTargetId(t)));
        } 
        else if (skill.id === 'fira') {
            this.music.playMagicFire();
            this.effects.allFireEffect(this.enemies);
        } 
        else if (skill.id === 'meteor') {
            this.music.playMagicMeteor();
            targets.forEach(t => this.effects.meteorEffect(this._getTargetId(t)));
        }
        else if (skill.id === 'ice_breath') {
            
            this.music.playBreath(); 
            this.effects.allIceEffect(targets); // 青いエフェクト
        }
        else {
            // 汎用魔法
            this.music.playMagic();
            targets.forEach(t => this.effects.magicExplosion(this._getTargetId(t)));
        }
    }

    showMagicHit(target, damage) {
        const targetId = this._getTargetId(target);
        this.effects.damagePopup(damage, targetId, "#a29bfe");
        this.ui.addLog(`> ${target.name}に ${damage} のダメージ！`);
        this._checkDeath(target, targetId);
    }

    // --- 回復・支援系の演出 ---

    /**
     * 回復演出
     * @param {Entity} target - 対象
     * @param {number} amount - 回復量
     * @param {boolean} isMp - MP回復かどうか
     * @param {boolean} playSound - 音を鳴らすかどうか（省略時はtrue）
     */
    showHeal(target, amount, isMp = false, playSound = true) {
        // ★修正：playSoundが true の時だけ鳴らす
        if (playSound) {
            if (!isMp) this.music.playHeal();
            else this.music.playMeditation();
        }

        const targetId = this._getTargetId(target);
        this.effects.healEffect(targetId);
        
        const color = isMp ? "#3498db" : "#2ecc71";
        const unit = isMp ? "MP" : "";
        this.effects.damagePopup(`+${amount}${unit}`, targetId, color);

        const typeStr = isMp ? "MP" : "HP";
        this.ui.addLog(`> ${target.name}の${typeStr}が ${amount} 回復した`);
    }

    showResurrection(target, isFullRevive = false) {
        const targetId = this._getTargetId(target);
        this.effects.resurrectionEffect(targetId);
        this.music.playHeal();
        
        if (isFullRevive) {
            this.ui.addLog(`${target.name}が完全な状態で蘇生した！`, "#ffff00", true);
        } else {
            this.ui.addLog(`> ${target.name}が蘇った！`, "#f1c40f");
        }
    }

    showCover(actor) {
        this.music.playCover();
        this.ui.addLog(`${actor.name}は身構えた！`, "#3498db", true);
        this.ui.addLog(` > 仲間への攻撃を身代わりする！`);
    }

    showCoverAction(protector, target) {
         this.ui.addLog(` > ${protector.name}が${target.name}をかばった！`, "#3498db");
    }

    showBuff(targets, skillName) {
        this.music.playKobu();
        this.ui.addLog(` > 味方の攻撃力が上がった！`); 
        targets.forEach(t => {
            if(t.is_alive()) this.effects.healEffect(this._getTargetId(t));
        });
    }

    showRegen(actor) {
        this.music.playHeal();
        this.ui.addLog(`${actor.name}は天に祈りを捧げた！`, "#8e44ad", true);
        this.ui.addLog(` > 味方全員に祝福が宿る！`, "#8e44ad");
    }
    
    
    // --- 分裂イベント演出 ---

    async showSplittingTrigger(enemy) {
        this.ui.addLog(`${enemy.name}の体が震えだした...！`, "#ff00ff");
        
        // 震えるアニメーション付与
        const targetId = this._getTargetId(enemy);
        const el = document.getElementById(targetId);
        if (el) {
            const img = el.querySelector('img');
            if (img) img.classList.add('splitting'); 
        }

        this.music.playBukubuku();
        
        // 溜め時間（呼び出し元で待つため、ここでは待機しない）
    }

    showSplittingTransform(oldName) {
        this.ui.addLog(`${oldName}は三体に分裂した！`, "#ff00ff");
        this.music.playSplited(); 
    }

    showSplittingAppear(startIndex) {
        // 新しいスライムたちの登場アニメーション
        const spriteA = document.getElementById(`enemy-sprite-${startIndex}`);
        const spriteC = document.getElementById(`enemy-sprite-${startIndex+2}`);

        if (spriteA) spriteA.classList.add('appear-right'); 
        if (spriteC) spriteC.classList.add('appear-left');
    }

    // --- アイテム演出 ---

    showItemUse(actor, item) {
        this.ui.addLog(`${actor.name}は ${item.name} を使った！`, "#e67e22", true);
    }
    
    // --- 共通処理 ---

    /** 死亡判定と演出 */
    _checkDeath(target, targetId) {
        if (!target.is_alive()) {
            // 味方ならカードを暗くする処理等はupdateUIでやるが、敵なら消滅エフェクト
            if (!target.job) {
                this.effects.enemyDeath(targetId);
            }
        }
    }

    /** 画面更新（最後に呼ぶ） */
    refreshStatus() {
        this.ui.updateEnemyHP(this.enemies);
        // ダメージ音などはここで鳴らしても良い
        // this.music.playDamage(); // 必要に応じて
    }
}