import { GodCat } from './entities.js';
import { EffectsConfig } from './effects_constants.js';
import { UiClasses } from './ui_classes.js';
import { UiColors } from './ui_colors.js';
import { UiStyle } from './ui_style.js';
import { UiText } from './ui_text.js';
import { GameConfig } from './game_config.js'; // ★Configをインポート

export class BattleDirector {
    constructor(ui, music, effects, party, enemies) {
        this.ui = ui;
        this.music = music;
        this.effects = effects;
        this.party = party;
        this.enemies = enemies;
        
        const img = new Image();
        img.src = GameConfig.ASSETS.IMAGES.ZABOCHI;
    }

    /**
     * キャラクターに対応するDOM IDを取得する
     */
    _getTargetId(target) {
        if (target.job) {
            return GameConfig.UI.ID_TEMPLATES.CARD.replace('{index}', this.party.indexOf(target));
        } else {
            const index = this.enemies.indexOf(target);
            return index >= 0
                ? GameConfig.UI.ID_TEMPLATES.ENEMY_SPRITE.replace('{index}', index)
                : GameConfig.UI.IDS.ENEMY_TARGET;
        }
    }

    _ensureFullscreenBlizzardOverlay() {
        if (!document || !document.body) return null;
        let overlay = document.getElementById(GameConfig.UI.IDS.DESPAIR_BLIZZARD);
        if (!overlay) {
            overlay = document.createElement('div');
            overlay.id = GameConfig.UI.IDS.DESPAIR_BLIZZARD;
            overlay.className = UiClasses.BLIZZARD_CONTAINER;
            overlay.innerHTML = `
                <div class="${UiClasses.SNOW_LAYER_BACK}"></div>
                <div class="${UiClasses.SNOW_LAYER_MIDDLE}"></div>
                <div class="${UiClasses.SNOW_LAYER_FRONT}"></div>
            `;
            document.body.appendChild(overlay);
        }
        return overlay;
    }

    _setFullscreenBlizzardMode(mode) {
        const overlay = this._ensureFullscreenBlizzardOverlay();
        if (!overlay) return;
        overlay.classList.remove(UiClasses.BLIZZARD_WHITEOUT, UiClasses.BLIZZARD_NORMAL);
        overlay.classList.add(`${UiClasses.BLIZZARD_PREFIX}${mode}`);
        overlay.classList.add(UiClasses.BLIZZARD_ACTIVE);
        this._setLogWhiteout(mode === UiClasses.BLIZZARD_MODE_WHITEOUT);
    }

    _showFullscreenBlizzard(mode = UiClasses.BLIZZARD_MODE_WHITEOUT) {
        const overlay = this._ensureFullscreenBlizzardOverlay();
        if (!overlay) return;
        overlay.classList.remove(UiClasses.BLIZZARD_WHITEOUT, UiClasses.BLIZZARD_NORMAL);
        overlay.classList.add(`${UiClasses.BLIZZARD_PREFIX}${mode}`);
        overlay.classList.remove(UiClasses.BLIZZARD_ACTIVE);
        requestAnimationFrame(() => overlay.classList.add(UiClasses.BLIZZARD_ACTIVE));
        this._setLogWhiteout(mode === UiClasses.BLIZZARD_MODE_WHITEOUT);
    }

    _hideFullscreenBlizzard() {
        const overlay = document.getElementById(GameConfig.UI.IDS.DESPAIR_BLIZZARD);
        if (!overlay) return;
        overlay.classList.remove(
            UiClasses.BLIZZARD_ACTIVE,
            UiClasses.BLIZZARD_WHITEOUT,
            UiClasses.BLIZZARD_NORMAL
        );
        this._setLogWhiteout(false);
        const removeOverlay = () => overlay.remove();
        overlay.addEventListener('transitionend', removeOverlay, { once: true });
        setTimeout(removeOverlay, GameConfig.TIMING.BLIZZARD_OVERLAY_REMOVE_MS);
    }

    _setLogWhiteout(isActive) {
        const log = document.getElementById(GameConfig.UI.IDS.LOG);
        if (!log) return;
        log.classList.toggle(UiClasses.LOG_WHITEOUT, isActive);
    }

    // --- 攻撃系の演出 ---

    showAttackStart(actor) {
        const logColor = actor.job ? UiColors.LOG_SKILL : UiColors.LOG_ATTACK;
        this.ui.addLog(
            UiText.LOG_ATTACK_TEMPLATE.replace('{name}', actor.name),
            logColor,
            true
        );
        const isMagicUser = (actor.job === GameConfig.JOBS.WIZARD || actor.job === GameConfig.JOBS.HEALER);

        return isMagicUser;
    }

    showPhysicalHit(target, damage, isCritical, isMagicHit) {
        const targetId = this._getTargetId(target);

        if (isMagicHit) this.effects.magicExplosion(targetId);
        else this.effects.slashEffect(targetId);

        // ★定数使用
        const popupColor = UiColors.DAMAGE;
        this.effects.damagePopup(damage, targetId, popupColor);

        if (isCritical) this.ui.addLog(UiText.LOG_CRITICAL, UiColors.CRITICAL, true);
        this.ui.addLog(
            UiText.LOG_DAMAGE_TEMPLATE
                .replace('{name}', target.name)
                .replace('{damage}', damage)
        );

        this._checkDeath(target, targetId);
    }

    // --- スキル・魔法系の演出 ---

    showSkillStart(actor, skill) {
        const logColor = actor.job ? UiColors.LOG_SKILL : UiColors.LOG_ATTACK;
        this.ui.addLog(
            UiText.LOG_SKILL_TEMPLATE
                .replace('{name}', actor.name)
                .replace('{skill}', skill.name),
            logColor,
            true
        );
    }

    showMagicEffect(actor, skill, targets) {
        const actorId = this._getTargetId(actor);

        if (skill.id === GameConfig.SKILL_IDS.FIRE) {
            this.music.playMagicFire();
            targets.forEach(t => this.effects.fireEffect(this._getTargetId(t), actorId));
        } 
        else if (skill.id === GameConfig.SKILL_IDS.FIRA) {
            this.music.playMagicFire();
            const targetIds = targets.map(t => this._getTargetId(t));
            this.effects.allFireEffect(targetIds);
        } 
        else if (skill.id === GameConfig.SKILL_IDS.METEOR || skill.id === GameConfig.SKILL_IDS.DARK_METEOR) {
            this.music.playMagicMeteor();
            targets.forEach(t => this.effects.meteorEffect(this._getTargetId(t)));
        }
        else if (skill.id === GameConfig.SKILL_IDS.BLIZZARD) {
            this.music.playMagic();
            targets.forEach(t => this.effects.iceEffect(this._getTargetId(t)));
        }
        else if (skill.id === GameConfig.SKILL_IDS.BLIZZARA) {
            this.music.playMagic();
            targets.forEach(t => this.effects.iceEffect(this._getTargetId(t)));
        }
        else if (skill.id === GameConfig.SKILL_IDS.ICE_BREATH) {
            this.music.playBreath(); 
            this.effects.allIceEffect(targets); 
        }
        else if (skill.id === GameConfig.SKILL_IDS.CURSE) {
            this.music.playPoison(); 
            targets.forEach(t => this.effects.magicExplosion(this._getTargetId(t)));
        }
        else if (skill.id === GameConfig.SKILL_IDS.HOLY_STRIKE) {
            this.music.playMagic();
            targets.forEach(t => this.effects.magicExplosion(this._getTargetId(t)));
            this.effects.flash(EffectsConfig.FLASH.HOLY_STRIKE);
        }
        else if (skill.id === GameConfig.SKILL_IDS.HOLY) {
            this.music.playMagic();
            targets.forEach(t => this.effects.magicExplosion(this._getTargetId(t)));
            this.effects.flash(EffectsConfig.FLASH.HOLY);
        }
        else if (skill.id === GameConfig.SKILL_IDS.ONRYO_CURSE) {
            this.music.playPoison();
            targets.forEach(t => this.effects.magicExplosion(this._getTargetId(t)));
            this.effects.flash(EffectsConfig.FLASH.ONRYO_CURSE);
        }
        else if (skill.id === GameConfig.SKILL_IDS.LAVA_SPRAY) {
            this.music.playMagicFire();
            const targetIds = targets.map(t => this._getTargetId(t));
            this.effects.allFireEffect(targetIds);
        }
        else if (skill.id === GameConfig.SKILL_IDS.CHAOS_WAVE) {
            this.music.playMagicMeteor();
            
            document.body.classList.add(UiClasses.SCREEN_SHAKE);
            this.effects.flash(EffectsConfig.FLASH.CHAOS_WAVE);
            
            targets.forEach(t => {
                this.effects.magicExplosion(this._getTargetId(t));
            });

            // ★定数使用
            setTimeout(() => document.body.classList.remove(UiClasses.SCREEN_SHAKE), GameConfig.TIME.SHAKE_LONG);
        }
        else {
            this.music.playMagic();
            targets.forEach(t => this.effects.magicExplosion(this._getTargetId(t)));
        }
    }

    showMagicHit(target, damage) {
        const targetId = this._getTargetId(target);
        // ★定数使用
        this.effects.damagePopup(damage, targetId, UiColors.DAMAGE);
        this.ui.addLog(
            UiText.LOG_DAMAGE_TEMPLATE
                .replace('{name}', target.name)
                .replace('{damage}', damage)
        );
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
        const color = isMp ? UiColors.HEAL_MP : UiColors.HEAL_HP;
        const unit = isMp ? UiText.LOG_MP : "";
        this.effects.damagePopup(`+${amount}${unit}`, targetId, color);

        const typeStr = isMp ? UiText.LOG_MP : UiText.LOG_HP;
        this.ui.addLog(
            UiText.LOG_HEAL_TEMPLATE
                .replace('{name}', target.name)
                .replace('{type}', typeStr)
                .replace('{amount}', amount)
        );
    }

    showFullHeal(target) {
        this.music.playHeal();
        const targetId = this._getTargetId(target);
        this.effects.healEffect(targetId);
        // ★定数使用
        this.effects.damagePopup(UiText.LOG_FULL, targetId, UiColors.FULL_HEAL);
        this.ui.addLog(
            UiText.LOG_FULL_HEAL_TEMPLATE.replace('{name}', target.name),
            UiColors.FULL_HEAL
        );
    }

    showResurrection(target, isFullRevive = false) {
        const targetId = this._getTargetId(target);
        this.effects.resurrectionEffect(targetId);
        this.music.playHeal();
        
        if (isFullRevive) {
            this.ui.addLog(
                UiText.LOG_RESURRECT_FULL_TEMPLATE.replace('{name}', target.name),
                UiColors.LOG_IMPORTANT,
                true
            );
        } else {
            this.ui.addLog(
                UiText.LOG_RESURRECT_TEMPLATE.replace('{name}', target.name),
                UiColors.LOG_ATTACK
            );
        }
    }

    showCover(actor) {
        this.music.playCover();
        this.ui.addLog(
            UiText.LOG_COVER_READY_TEMPLATE.replace('{name}', actor.name),
            UiColors.LOG_SKILL,
            true
        );
        this.ui.addLog(UiText.LOG_COVER_DESC);
    }

    showCoverAction(protector, target) {
         this.ui.addLog(
             UiText.LOG_COVER_ACTION_TEMPLATE
                 .replace('{protector}', protector.name)
                 .replace('{target}', target.name),
             UiColors.LOG_SKILL
         );
    }

    showBuff(targets, skillName) {
        if (skillName === UiText.LOG_DRAGON_ROAR) {
            this.music.playBreath(); 
            const actorId = this._getTargetId(targets[0]);
            this.effects.roarEffect(actorId);
            this.ui.addLog(UiText.LOG_DRAGON_ATTACK_UP, UiColors.LOG_BUFF);
        } else {
            this.music.playKobu();
            this.ui.addLog(UiText.LOG_ALLY_ATTACK_UP); 
        }

        targets.forEach(t => {
            if(t.is_alive()) this.effects.healEffect(this._getTargetId(t));
        });
    }

    showRegen(actor) {
        this.music.playHeal();
        this.ui.addLog(
            UiText.LOG_REGEN_TEMPLATE.replace('{name}', actor.name),
            UiColors.LOG_PRAYER,
            true
        );
        this.ui.addLog(UiText.LOG_REGEN_EFFECT, UiColors.LOG_PRAYER);
    }
    
    // --- 分裂イベント演出 ---

    async showSplittingTrigger(enemy) {
        this.ui.addLog(
            UiText.LOG_SPLIT_TRIGGER_TEMPLATE.replace('{name}', enemy.name),
            UiColors.LOG_SPLIT
        );
        this.music.playBukubuku();
        
        const targetId = this._getTargetId(enemy); 
        const unitDiv = document.getElementById(targetId);
        
        if (unitDiv) {
            unitDiv.classList.remove(UiClasses.SPLITTING);
            void unitDiv.offsetWidth; 
            unitDiv.classList.add(UiClasses.SPLITTING); 
        }
    }

    showSplittingTransform(oldName) {
        this.ui.addLog(
            UiText.LOG_SPLIT_TRANSFORM_TEMPLATE.replace('{name}', oldName),
            UiColors.LOG_SPLIT
        );
        this.music.playSplited(); 
    }

    showSplittingAppear(startIndex) {
        const spriteLeft = document.getElementById(
            GameConfig.UI.ID_TEMPLATES.ENEMY_SPRITE.replace('{index}', startIndex)
        );
        const spriteRight = document.getElementById(
            GameConfig.UI.ID_TEMPLATES.ENEMY_SPRITE.replace('{index}', startIndex + 2)
        );

        if (spriteLeft) {
            const unitLeft = spriteLeft.closest(`.${UiClasses.ENEMY_UNIT}`) || spriteLeft;
            void spriteLeft.offsetWidth; 
            spriteLeft.classList.add(UiClasses.APPEAR_LEFT);
        }

        if (spriteRight) {
            const unitRight = spriteRight.closest(`.${UiClasses.ENEMY_UNIT}`) || spriteRight;
            void spriteRight.offsetWidth;
            spriteRight.classList.add(UiClasses.APPEAR_RIGHT);
        }
    }
    
    async showShadowFusionStart() {
        this.ui.addLog(UiText.LOG_SHADOW_FUSION_START, UiColors.LOG_PRAYER, true);
        this.music.playMeditation(); 

        const container = document.getElementById(GameConfig.UI.IDS.ENEMY_TARGET);
        if (container) container.style.position = UiStyle.POSITION_RELATIVE;

        const core = document.createElement('div');
        core.className = UiClasses.FUSION_CORE;
        if (container) container.appendChild(core);

        const deadShadows = document.querySelectorAll(`.${UiClasses.ENEMY_UNIT}`);
        
        setTimeout(() => {
            deadShadows.forEach(el => {
                el.style.opacity = UiStyle.OPACITY_VISIBLE; 
                requestAnimationFrame(() => {
                    el.classList.add(UiClasses.BEING_ABSORBED);
                    el.style.transformOrigin = UiStyle.TRANSFORM_ORIGIN;
                });
            });
        }, GameConfig.TIMING.SHADOW_FUSION_ABSORB_MS);

        // ★定数使用
        await new Promise(r => setTimeout(r, GameConfig.TIME.FUSION_ANIM));
        
        const flash = document.createElement('div');
        flash.className = UiClasses.DARK_FLASH;
        document.body.appendChild(flash);
        
        if (core.parentNode) core.parentNode.removeChild(core);
        
        await new Promise(r => setTimeout(r, GameConfig.TIMING.SHADOW_FUSION_FLASH_REMOVE_MS)); 
        if (flash.parentNode) flash.parentNode.removeChild(flash);
    }

    async showShadowFusionEnd() {
        this.ui.addLog(UiText.LOG_SHADOW_FUSION_END, UiColors.LOG_BUFF, true);
        this.music.playMagicMeteor(); 
        
        const bossEl = document.getElementById(GameConfig.UI.ID_TEMPLATES.ENEMY_SPRITE.replace('{index}', 0));
        if (bossEl) {
            bossEl.classList.add(UiClasses.SHADOW_AURA); 
            bossEl.classList.add(UiClasses.KING_SIZE); 
            bossEl.classList.add(UiClasses.BOSS_LIFT);
            
            bossEl.style.animation = EffectsConfig.ANIMATION.NONE;
            void bossEl.offsetHeight; 
            bossEl.style.animation = EffectsConfig.ANIMATION.RESURRECTION_FLASH;
        }
        
        document.body.classList.add(UiClasses.SCREEN_SHAKE);
        // ★定数使用
        setTimeout(
            () => document.body.classList.remove(UiClasses.SCREEN_SHAKE),
            GameConfig.TIMING.SHADOW_FUSION_SHAKE_MS
        );
        
        await new Promise(r => setTimeout(r, GameConfig.TIMING.SHADOW_FUSION_WAIT_MS));
    }
    
    async playDragonTransformation(enemy, allEnemies) {
        const enemyIndex = allEnemies.indexOf(enemy);
        const enemyEl = document.getElementById(
            GameConfig.UI.ID_TEMPLATES.ENEMY_SPRITE.replace('{index}', enemyIndex)
        );

        this.ui.addLog(UiText.LOG_DRAGON_TRANSFORM, UiColors.LOG_BUFF);
        if (enemyEl) enemyEl.classList.add(UiClasses.SWAY_SLOW);
        // ★定数使用
        await new Promise(r => setTimeout(r, GameConfig.TIME.TRANSFORM_WAIT));

        if (enemyEl) {
            enemyEl.classList.remove(UiClasses.SWAY_SLOW);
            enemyEl.classList.add(UiClasses.FLASH_RAPID);
        }
        await new Promise(r => setTimeout(r, GameConfig.TIMING.DRAGON_FLASH_WAIT_MS));

        const flashOverlay = document.createElement('div');
        flashOverlay.id = GameConfig.UI.IDS.FLASH_OVERLAY;
        document.body.appendChild(flashOverlay);
        await new Promise(r => requestAnimationFrame(r));
        flashOverlay.style.opacity = UiStyle.OPACITY_VISIBLE;
        await new Promise(r => setTimeout(r, GameConfig.TIMING.DRAGON_FLASH_FADE_MS));

        this.ui.refreshEnemyGraphics(allEnemies);

        const refreshedEnemyEl = document.getElementById(
            GameConfig.UI.ID_TEMPLATES.ENEMY_SPRITE.replace('{index}', enemyIndex)
        );
        if (refreshedEnemyEl && enemy.enemyType === GameConfig.ENEMY_TYPES.ICE_DRAGON) {
            refreshedEnemyEl.classList.add(UiClasses.BOSS_LIFT);
        }
        
        flashOverlay.style.opacity = UiStyle.OPACITY_HIDDEN;
        setTimeout(() => flashOverlay.remove(), GameConfig.TIMING.DRAGON_FLASH_REMOVE_MS);

        const enemyArea = document.getElementById(GameConfig.UI.IDS.CANVAS_AREA); 

        if (enemyArea) {
            enemyArea.style.position = UiStyle.POSITION_RELATIVE; 
            enemyArea.style.overflow = UiStyle.OVERFLOW_HIDDEN;

            const blizzardContainer = document.createElement('div');
            blizzardContainer.className = UiClasses.BLIZZARD_CONTAINER; 
            blizzardContainer.id = GameConfig.UI.IDS.ACTIVE_BLIZZARD; 

            blizzardContainer.innerHTML = `
                <div class="${UiClasses.SNOW_LAYER_BACK}"></div>
                <div class="${UiClasses.SNOW_LAYER_MIDDLE}"></div>
                <div class="${UiClasses.SNOW_LAYER_FRONT}"></div>
            `;
            
            enemyArea.appendChild(blizzardContainer);

            await new Promise(r => requestAnimationFrame(r));
            blizzardContainer.style.opacity = UiStyle.OPACITY_VISIBLE;
        }

        this.ui.addLog(UiText.LOG_BLIZZARD, UiColors.LOG_BLIZZARD);
        await new Promise(r => setTimeout(r, GameConfig.TIMING.BLIZZARD_WAIT_MS));
    }
    
    async playDespairAndRevival(party) {
        await new Promise(r => setTimeout(r, GameConfig.TIMING.DESPAIR_INTRO_WAIT_MS));
        this.ui.addLog(UiText.LOG_DESPAIR_ATTACK, UiColors.LOG_DRAGON_DESPAIR);
        this.music.playDragon_voice();
        await new Promise(r => setTimeout(r, GameConfig.TIMING.DESPAIR_LINE_WAIT_MS));
        this.music.stopBGM();

        this._showFullscreenBlizzard(UiClasses.BLIZZARD_MODE_WHITEOUT);
        document.body.classList.add(UiClasses.SCREEN_SHAKE);
        await new Promise(r => setTimeout(r, GameConfig.TIMING.DESPAIR_SHAKE_WAIT_MS));

        party.forEach((p, i) => {
            p._hp = 0;
            p.is_dead = true;
            p.clear_all_buffs();
            const hpText = document.getElementById(
                GameConfig.UI.ID_TEMPLATES.PLAYER_HP_TEXT.replace('{index}', i)
            );
            const hpBar  = document.getElementById(
                GameConfig.UI.ID_TEMPLATES.PLAYER_HP_BAR.replace('{index}', i)
            );
            const card   = document.getElementById(
                GameConfig.UI.ID_TEMPLATES.CARD.replace('{index}', i)
            );
            if (hpText) {
                hpText.innerText = UiText.LOG_STATUS_HP_TEMPLATE
                    .replace('{current}', 0)
                    .replace('{max}', p.max_hp);
            }
            if (hpBar)  hpBar.style.width = UiStyle.ZERO_HP_PERCENT;
            if (card)   card.style.opacity = UiStyle.CARD_OPACITY_DEAD;
            const badgeContainer = card.querySelector(`.${UiClasses.STATUS_CONTAINER}`);
                if (badgeContainer) badgeContainer.innerHTML = '';
        });

        await new Promise(r => setTimeout(r, GameConfig.TIMING.DESPAIR_AFTER_WIPE_WAIT_MS));
        document.body.classList.remove(UiClasses.SCREEN_SHAKE);

        this.ui.addLog(UiText.LOG_PARTY_WIPE, UiColors.LOG_DESPAIR);
        await new Promise(r => setTimeout(r, GameConfig.TIMING.DESPAIR_LOG_WAIT_MS));
        this.ui.addLog(UiText.LOG_HOPE, UiColors.LOG_DEFAULT);
        this.music.playBGM(GameConfig.AUDIO.BGM_TYPES.BOSS2);
        this._setFullscreenBlizzardMode(UiClasses.BLIZZARD_MODE_NORMAL);
        await new Promise(r => setTimeout(r, GameConfig.TIMING.DESPAIR_HOPE_WAIT_MS));
        
        this.ui.addLog(UiText.LOG_ZABOCHI_LINE, UiColors.LOG_ATTACK);
        await new Promise(r => setTimeout(r, GameConfig.TIMING.DESPAIR_ZABOCHI_WAIT_MS));
        
        const goldFlash = document.createElement('div');
        goldFlash.className = UiClasses.FLASH_GOLD;
        document.body.appendChild(goldFlash);

        const zabochiImg = document.createElement('img');
        zabochiImg.src = GameConfig.ASSETS.IMAGES.ZABOCHI; 
        zabochiImg.className = UiClasses.ZABOCHI_APPEAR;   
        document.body.appendChild(zabochiImg);

        await new Promise(r => setTimeout(r, GameConfig.TIMING.DESPAIR_ZABOCHI_APPEAR_MS));
        
        party.forEach((p, i) => {
            p.revive(p.max_hp); p.add_mp(p.max_mp);
            const hpText = document.getElementById(
                GameConfig.UI.ID_TEMPLATES.PLAYER_HP_TEXT.replace('{index}', i)
            );
            const hpBar  = document.getElementById(
                GameConfig.UI.ID_TEMPLATES.PLAYER_HP_BAR.replace('{index}', i)
            );
            const card   = document.getElementById(
                GameConfig.UI.ID_TEMPLATES.CARD.replace('{index}', i)
            );
            if (hpText) {
                hpText.innerText = UiText.LOG_STATUS_HP_TEMPLATE
                    .replace('{current}', p.max_hp)
                    .replace('{max}', p.max_hp);
            }
            if (hpBar)  hpBar.style.width = UiStyle.FULL_HP_PERCENT;
            if (card)   card.style.opacity = UiStyle.CARD_OPACITY_ALIVE;
        });

        this.music.playHeal();
        this.ui.addLog(UiText.LOG_ZABOCHI_MIRACLE, UiColors.LOG_ATTACK);
        this.ui.addLog(UiText.LOG_FULL_RECOVERY, UiColors.LOG_ATTACK);
        
        const hasZabochi = party.some(m => m instanceof GodCat);
        if (!hasZabochi) {
            const zabochi = new GodCat();
            zabochi.resetActionValue(); 
            party.push(zabochi);
            
            this.ui.addLog(UiText.LOG_ZABOCHI_JOIN, UiColors.LOG_ATTACK);
        }
        await new Promise(r => setTimeout(r, GameConfig.TIMING.DESPAIR_ZABOCHI_JOIN_WAIT_MS)); 
        
        goldFlash.remove();
        zabochiImg.remove();
    }

    showItemUse(actor, item) {
        this.ui.addLog(
            UiText.LOG_ITEM_USE_TEMPLATE
                .replace('{name}', actor.name)
                .replace('{item}', item.name),
            UiColors.LOG_ITEM,
            true
        );
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
