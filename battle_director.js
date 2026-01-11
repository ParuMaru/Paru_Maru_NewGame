import { GodCat } from './entities.js';
import { GameConfig } from './game_config.js'; // ★Configをインポート

export class BattleDirector {
    constructor(ui, music, effects, party, enemies) {
        this.ui = ui;
        this.music = music;
        this.effects = effects;
        this.party = party;
        this.enemies = enemies;
        
        const img = new Image();
        img.src = './resource/zabochi.webp';
    }

    /**
     * キャラクターに対応するDOM IDを取得する
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
        const logColor = actor.job ? GameConfig.COLORS.LOG_SKILL : GameConfig.COLORS.LOG_ATTACK;
        this.ui.addLog(`${actor.name}の攻撃！`, logColor, true);
        const isMagicUser = (actor.job === 'wizard' || actor.job === 'healer');
        
        if (isMagicUser) this.music.playMagic();
        else this.music.playAttack();

        return isMagicUser;
    }

    showPhysicalHit(target, damage, isCritical, isMagicHit) {
        const targetId = this._getTargetId(target);

        if (isMagicHit) this.effects.magicExplosion(targetId);
        else this.effects.slashEffect(targetId);

        // ★定数使用
        const popupColor = GameConfig.COLORS.DAMAGE;
        this.effects.damagePopup(damage, targetId, popupColor);

        if (isCritical) this.ui.addLog("クリティカルヒット！", GameConfig.COLORS.CRITICAL, true);
        this.ui.addLog(`> ${target.name}に ${damage} のダメージ！`);

        this._checkDeath(target, targetId);
    }

    // --- スキル・魔法系の演出 ---

    showSkillStart(actor, skill) {
        const logColor = actor.job ? GameConfig.COLORS.LOG_SKILL : GameConfig.COLORS.LOG_ATTACK;
        this.ui.addLog(`${actor.name}は ${skill.name} を使った！`, logColor, true);
    }

    showMagicEffect(actor, skill, targets) {
        const actorId = this._getTargetId(actor);

        if (skill.id === 'fire') {
            this.music.playMagicFire();
            targets.forEach(t => this.effects.fireEffect(this._getTargetId(t), actorId));
        } 
        else if (skill.id === 'fira') {
            this.music.playMagicFire();
            const targetIds = targets.map(t => this._getTargetId(t));
            this.effects.allFireEffect(targetIds);
        } 
        else if (skill.id === 'meteor' || skill.id === 'dark_meteor') {
            this.music.playMagicMeteor();
            targets.forEach(t => this.effects.meteorEffect(this._getTargetId(t)));
        }
        else if (skill.id === 'ice_breath') {
            this.music.playBreath(); 
            this.effects.allIceEffect(targets); 
        }
        else if (skill.id === 'curse') {
            this.music.playPoison(); 
            targets.forEach(t => this.effects.magicExplosion(this._getTargetId(t)));
        }
        else if (skill.id === 'chaos_wave') {
            this.music.playMagicMeteor();
            
            document.body.classList.add('screen-shake');
            this.effects.flash("rgba(0, 0, 0, 0.8)");
            
            targets.forEach(t => {
                this.effects.magicExplosion(this._getTargetId(t));
            });

            // ★定数使用
            setTimeout(() => document.body.classList.remove('screen-shake'), GameConfig.TIME.SHAKE_LONG);
        }
        else {
            this.music.playMagic();
            targets.forEach(t => this.effects.magicExplosion(this._getTargetId(t)));
        }
    }

    showMagicHit(target, damage) {
        const targetId = this._getTargetId(target);
        // ★定数使用
        this.effects.damagePopup(damage, targetId, GameConfig.COLORS.DAMAGE);
        this.ui.addLog(`> ${target.name}に ${damage} のダメージ！`);
        this._checkDeath(target, targetId);
    }

    // --- 回復・支援系の演出 ---

    showHeal(target, amount, isMp = false, playSound = true) {
        if (playSound) {
            if (!isMp) this.music.playHeal();
            else this.music.playMeditation();
        }

        const targetId = this._getTargetId(target);
        this.effects.healEffect(targetId);
        
        // ★定数使用
        const color = isMp ? GameConfig.COLORS.HEAL_MP : GameConfig.COLORS.HEAL_HP;
        const unit = isMp ? "MP" : "";
        this.effects.damagePopup(`+${amount}${unit}`, targetId, color);

        const typeStr = isMp ? "MP" : "HP";
        this.ui.addLog(`> ${target.name}の${typeStr}が ${amount} 回復した`);
    }

    showFullHeal(target) {
        this.music.playHeal();
        const targetId = this._getTargetId(target);
        this.effects.healEffect(targetId);
        // ★定数使用
        this.effects.damagePopup("FULL", targetId, GameConfig.COLORS.FULL_HEAL);
        this.ui.addLog(`> ${target.name}のHP・MPが全回復した！`, GameConfig.COLORS.FULL_HEAL);
    }

    showResurrection(target, isFullRevive = false) {
        const targetId = this._getTargetId(target);
        this.effects.resurrectionEffect(targetId);
        this.music.playHeal();
        
        if (isFullRevive) {
            this.ui.addLog(`${target.name}が完全な状態で蘇生した！`, GameConfig.COLORS.LOG_IMPORTANT, true);
        } else {
            this.ui.addLog(`> ${target.name}が蘇った！`, GameConfig.COLORS.LOG_ATTACK);
        }
    }

    showCover(actor) {
        this.music.playCover();
        this.ui.addLog(`${actor.name}は身構えた！`, GameConfig.COLORS.LOG_SKILL, true);
        this.ui.addLog(` > 仲間への攻撃を身代わりする！`);
    }

    showCoverAction(protector, target) {
         this.ui.addLog(` > ${protector.name}が${target.name}をかばった！`, GameConfig.COLORS.LOG_SKILL);
    }

    showBuff(targets, skillName) {
        if (skillName === "竜の咆哮") {
            this.music.playBreath(); 
            const actorId = this._getTargetId(targets[0]);
            this.effects.roarEffect(actorId);
            this.ui.addLog(` > ドラゴンの攻撃力が激増した！`, GameConfig.COLORS.LOG_BUFF);
        } else {
            this.music.playKobu();
            this.ui.addLog(` > 味方の攻撃力が上がった！`); 
        }

        targets.forEach(t => {
            if(t.is_alive()) this.effects.healEffect(this._getTargetId(t));
        });
    }

    showRegen(actor) {
        this.music.playHeal();
        this.ui.addLog(`${actor.name}は天に祈りを捧げた！`, GameConfig.COLORS.LOG_PRAYER, true);
        this.ui.addLog(` > 味方全員に祝福が宿る！`, GameConfig.COLORS.LOG_PRAYER);
    }
    
    // --- 分裂イベント演出 ---

    async showSplittingTrigger(enemy) {
        this.ui.addLog(`${enemy.name}の体が震えだした...！`, "#ff00ff");
        this.music.playBukubuku();
        
        const targetId = this._getTargetId(enemy); 
        const unitDiv = document.getElementById(targetId);
        
        if (unitDiv) {
            unitDiv.classList.remove('splitting');
            void unitDiv.offsetWidth; 
            unitDiv.classList.add('splitting'); 
        }
    }

    showSplittingTransform(oldName) {
        this.ui.addLog(`${oldName}は3匹に分裂した！`, "#ff00ff");
        this.music.playSplited(); 
    }

    showSplittingAppear(startIndex) {
        const spriteLeft = document.getElementById(`enemy-sprite-${startIndex}`);
        const spriteRight = document.getElementById(`enemy-sprite-${startIndex+2}`);

        if (spriteLeft) {
            const unitLeft = spriteLeft.closest('.enemy-unit') || spriteLeft;
            void spriteLeft.offsetWidth; 
            spriteLeft.classList.add('appear-left');
        }

        if (spriteRight) {
            const unitRight = spriteRight.closest('.enemy-unit') || spriteRight;
            void spriteRight.offsetWidth;
            spriteRight.classList.add('appear-right');
        }
    }
    
    async showShadowFusionStart() {
        this.ui.addLog("影たちが一点に凝縮していく...！", GameConfig.COLORS.LOG_PRAYER, true);
        this.music.playMeditation(); 

        const container = document.getElementById('enemy-target');
        if (container) container.style.position = 'relative';

        const core = document.createElement('div');
        core.className = 'fusion-core';
        if (container) container.appendChild(core);

        const deadShadows = document.querySelectorAll('.enemy-unit');
        
        setTimeout(() => {
            deadShadows.forEach(el => {
                el.style.opacity = '1'; 
                requestAnimationFrame(() => {
                    el.classList.add('being-absorbed');
                    el.style.transformOrigin = "center center";
                });
            });
        }, 200);

        // ★定数使用
        await new Promise(r => setTimeout(r, GameConfig.TIME.FUSION_ANIM));
        
        const flash = document.createElement('div');
        flash.className = 'dark-flash';
        document.body.appendChild(flash);
        
        if (core.parentNode) core.parentNode.removeChild(core);
        
        await new Promise(r => setTimeout(r, 500)); 
        if (flash.parentNode) flash.parentNode.removeChild(flash);
    }

    async showShadowFusionEnd() {
        this.ui.addLog("「影の支配者」が現れた！！！", GameConfig.COLORS.LOG_BUFF, true);
        this.music.playMagicMeteor(); 
        
        const bossEl = document.getElementById('enemy-sprite-0');
        if (bossEl) {
            bossEl.classList.add('shadow-aura'); 
            bossEl.classList.add('king-size'); 
            
            bossEl.style.animation = 'none';
            void bossEl.offsetHeight; 
            bossEl.style.animation = 'resurrectionFlash 1.5s ease-out';
        }
        
        document.body.classList.add('screen-shake');
        // ★定数使用
        setTimeout(() => document.body.classList.remove('screen-shake'), 1200);
        
        await new Promise(r => setTimeout(r, 1200));
    }
    
    async playDragonTransformation(enemy, allEnemies) {
        const enemyIndex = allEnemies.indexOf(enemy);
        const enemyEl = document.getElementById(`enemy-sprite-${enemyIndex}`);

        this.ui.addLog("『我ガ眠リヲ妨ゲル者ハ...消エ去レ...！！』", GameConfig.COLORS.LOG_BUFF);
        if (enemyEl) enemyEl.classList.add('sway-slow');
        // ★定数使用
        await new Promise(r => setTimeout(r, GameConfig.TIME.TRANSFORM_WAIT));

        if (enemyEl) {
            enemyEl.classList.remove('sway-slow');
            enemyEl.classList.add('flash-rapid');
        }
        await new Promise(r => setTimeout(r, 1000));

        const flashOverlay = document.createElement('div');
        flashOverlay.id = 'flash-overlay';
        document.body.appendChild(flashOverlay);
        await new Promise(r => requestAnimationFrame(r));
        flashOverlay.style.opacity = '1';
        await new Promise(r => setTimeout(r, 300));

        this.ui.refreshEnemyGraphics(allEnemies);
        
        flashOverlay.style.opacity = '0';
        setTimeout(() => flashOverlay.remove(), 500);

        const enemyArea = document.getElementById('canvas-area'); 

        if (enemyArea) {
            enemyArea.style.position = 'relative'; 
            enemyArea.style.overflow = 'hidden';

            const blizzardContainer = document.createElement('div');
            blizzardContainer.className = 'blizzard-container'; 
            blizzardContainer.id = 'active-blizzard'; 

            blizzardContainer.innerHTML = `
                <div class="snow-layer back"></div>
                <div class="snow-layer middle"></div>
                <div class="snow-layer front"></div>
            `;
            
            enemyArea.appendChild(blizzardContainer);

            await new Promise(r => requestAnimationFrame(r));
            blizzardContainer.style.opacity = '1';
        }

        this.ui.addLog("猛吹雪が吹き荒れる！", "#00d2ff");
        await new Promise(r => setTimeout(r, 1000));
    }
    
    async playDespairAndRevival(party) {
        await new Promise(r => setTimeout(r, 1000));
        this.ui.addLog("覚醒アイスドラゴン『無ニ帰ス...絶対零度！！』", "#ff0000");
        this.music.playDragon_voice();
        await new Promise(r => setTimeout(r, 1500));
        this.music.stopBGM();

        const redFlash = document.createElement('div');
        redFlash.className = 'flash-red';
        document.body.appendChild(redFlash);
        document.body.classList.add('screen-shake');
        await new Promise(r => setTimeout(r, 200));

        party.forEach((p, i) => {
            p._hp = 0;
            p.is_dead = true;
            p.clear_all_buffs();
            const hpText = document.getElementById(`p${i}-hp-text`);
            const hpBar  = document.getElementById(`p${i}-hp-bar`);
            const card   = document.getElementById(`card-${i}`);
            if (hpText) hpText.innerText = `HP: 0 / ${p.max_hp}`;
            if (hpBar)  hpBar.style.width = "0%";
            if (card)   card.style.opacity = "0.5";
            const badgeContainer = card.querySelector('.status-container');
                if (badgeContainer) badgeContainer.innerHTML = '';
        });

        await new Promise(r => setTimeout(r, 1000));
        document.body.classList.remove('screen-shake');
        redFlash.remove();

        this.ui.addLog("パーティは全滅した...", GameConfig.COLORS.LOG_DESPAIR);
        await new Promise(r => setTimeout(r, 2000));
        this.ui.addLog("もうだめかと思ったその時...", "#ffffff");
        this.music.playBGM('boss2');
        await new Promise(r => setTimeout(r, 2000));
        
        this.ui.addLog("？？？『にゃにを諦めているにゃ！？』", GameConfig.COLORS.LOG_ATTACK);
        await new Promise(r => setTimeout(r, 1500));
        
        const goldFlash = document.createElement('div');
        goldFlash.className = 'flash-gold';
        document.body.appendChild(goldFlash);

        const zabochiImg = document.createElement('img');
        zabochiImg.src = './resource/zabochi.webp'; 
        zabochiImg.className = 'zabochi-appear';   
        document.body.appendChild(zabochiImg);

        await new Promise(r => setTimeout(r, 1000));
        
        party.forEach((p, i) => {
            p.revive(p.max_hp); p.add_mp(p.max_mp);
            const hpText = document.getElementById(`p${i}-hp-text`);
            const hpBar  = document.getElementById(`p${i}-hp-bar`);
            const card   = document.getElementById(`card-${i}`);
            if (hpText) hpText.innerText = `HP: ${p.max_hp} / ${p.max_hp}`;
            if (hpBar)  hpBar.style.width = "100%";
            if (card)   card.style.opacity = "1";
        });

        this.music.playHeal();
        this.ui.addLog("伝説の神猫『ざぼち』が降臨し、奇跡を起こした！", GameConfig.COLORS.LOG_ATTACK);
        this.ui.addLog("味方全員のHP・MPが全回復！", GameConfig.COLORS.LOG_ATTACK);
        
        const hasZabochi = party.some(m => m instanceof GodCat);
        if (!hasZabochi) {
            const zabochi = new GodCat();
            zabochi.resetActionValue(); 
            party.push(zabochi);
            
            this.ui.addLog("ざぼちが共闘してくれる！", GameConfig.COLORS.LOG_ATTACK);
        }
        await new Promise(r => setTimeout(r, 5000)); 
        
        goldFlash.remove();
        zabochiImg.remove();
    }

    showItemUse(actor, item) {
        this.ui.addLog(`${actor.name}は ${item.name} を使った！`, GameConfig.COLORS.LOG_ITEM, true);
    }
    
    _checkDeath(target, targetId) {
        if (!target.is_alive()) {
            if (!target.job) {
                this.effects.enemyDeath(targetId);
            }
        }
    }

    refreshStatus() {
        this.ui.updateEnemyHP(this.enemies);
    }
}