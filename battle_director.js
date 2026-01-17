///
/// 役割: 戦闘中の演出（カットイン/エフェクト/字幕）を一元管理する。
/// 入出力: UI要素とBGM/エフェクトにアクセスし、戦闘演出を描画する。
/// 関連: battle_manager.js, ui_manager.js, effects.js
///
import { GodCat } from './entities.js';
import { EffectsConfig } from './effects_constants.js';
import { UiClasses } from './ui_classes.js';
import { UiColors } from './ui_colors.js';
import { UiStyle } from './ui_style.js';
import { GameConfig } from './game_config.js'; // ★Configをインポート

/**
 * 戦闘演出の表示・非表示を制御する。
 * @class
 */
export class BattleDirector {
    /**
     * UI/音/エフェクトを受け取って初期化する。
     * @param {UIManager} ui - UIマネージャー。
     * @param {BattleBGM} music - BGM管理。
     * @param {EffectManager} effects - 画面エフェクト。
     * @param {Array} party - 味方一覧。
     * @param {Array} enemies - 敵一覧。
     */
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
        const canvasArea = document.getElementById(GameConfig.UI.IDS.CANVAS_AREA);
        if (!canvasArea) return null;
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
        }
        canvasArea.appendChild(overlay);
        return overlay;
    }

    _setFullscreenBlizzardMode(mode) {
        const overlay = this._ensureFullscreenBlizzardOverlay();
        if (!overlay) return;
        overlay.classList.remove(UiClasses.BLIZZARD_WHITEOUT, UiClasses.BLIZZARD_NORMAL);
        overlay.classList.add(`${UiClasses.BLIZZARD_PREFIX}${mode}`);
        overlay.classList.add(UiClasses.BLIZZARD_ACTIVE);
    }

    _showFullscreenBlizzard(mode = UiClasses.BLIZZARD_MODE_WHITEOUT) {
        const overlay = this._ensureFullscreenBlizzardOverlay();
        if (!overlay) return;
        overlay.classList.remove(UiClasses.BLIZZARD_WHITEOUT, UiClasses.BLIZZARD_NORMAL);
        overlay.classList.add(`${UiClasses.BLIZZARD_PREFIX}${mode}`);
        overlay.classList.remove(UiClasses.BLIZZARD_ACTIVE);
        requestAnimationFrame(() => overlay.classList.add(UiClasses.BLIZZARD_ACTIVE));
    }

    _hideFullscreenBlizzard() {
        const overlay = document.getElementById(GameConfig.UI.IDS.DESPAIR_BLIZZARD);
        if (!overlay) return;
        overlay.classList.remove(
            UiClasses.BLIZZARD_ACTIVE,
            UiClasses.BLIZZARD_WHITEOUT,
            UiClasses.BLIZZARD_NORMAL
        );
        const removeOverlay = () => overlay.remove();
        overlay.addEventListener('transitionend', removeOverlay, { once: true });
        setTimeout(removeOverlay, GameConfig.TIMING.BLIZZARD_OVERLAY_REMOVE_MS);
    }

    _ensureActiveBlizzardOverlay() {
        const enemyArea = document.getElementById(GameConfig.UI.IDS.CANVAS_AREA);
        if (!enemyArea) return null;
        enemyArea.style.position = UiStyle.POSITION_RELATIVE;
        enemyArea.style.overflow = UiStyle.OVERFLOW_HIDDEN;

        let blizzardContainer = document.getElementById(GameConfig.UI.IDS.ACTIVE_BLIZZARD);
        if (!blizzardContainer) {
            blizzardContainer = document.createElement('div');
            blizzardContainer.className = UiClasses.BLIZZARD_CONTAINER;
            blizzardContainer.id = GameConfig.UI.IDS.ACTIVE_BLIZZARD;

            blizzardContainer.innerHTML = `
                <div class="${UiClasses.SNOW_LAYER_BACK}"></div>
                <div class="${UiClasses.SNOW_LAYER_MIDDLE}"></div>
                <div class="${UiClasses.SNOW_LAYER_FRONT}"></div>
            `;
            enemyArea.appendChild(blizzardContainer);
        }
        return blizzardContainer;
    }

    _startIceDragonEventOverlay(subtitleText,color=null,fontSize = null) {
        const canvasArea = document.getElementById(GameConfig.UI.IDS.CANVAS_AREA);
        if (!canvasArea) return;
        if (this._iceDragonEventOverlay?.container) {
            this._updateIceDragonEventSubtitle(subtitleText);
            return;
        }

        this._showIceDragonEventFlash(canvasArea);

        const container = document.createElement('div');
        container.className = UiClasses.ICE_DRAGON_EVENT_OVERLAY;

        const topBar = document.createElement('div');
        topBar.className = UiClasses.ICE_DRAGON_EVENT_BAR;

        const image = document.createElement('img');
        image.className = UiClasses.ICE_DRAGON_EVENT_IMAGE;
        image.src = GameConfig.ASSETS.IMAGES.ICE_DRAGON_EVENT;
        image.alt = '';

        const bottomBar = document.createElement('div');
        bottomBar.className = UiClasses.ICE_DRAGON_EVENT_BAR;

        const caption = document.createElement('div');
        caption.className = UiClasses.ICE_DRAGON_EVENT_CAPTION;
        caption.textContent = subtitleText ?? '';

        bottomBar.appendChild(caption);
        container.appendChild(topBar);
        container.appendChild(image);
        container.appendChild(bottomBar);
        canvasArea.appendChild(container);

        this._iceDragonEventOverlay = { container, caption };
        requestAnimationFrame(() => container.classList.add(UiClasses.ICE_DRAGON_EVENT_ACTIVE));
    }

    _showIceDragonEventFlash(canvasArea) {
        const targetArea = canvasArea ?? document.getElementById(GameConfig.UI.IDS.CANVAS_AREA);
        if (!targetArea) return;
        const flash = document.createElement('div');
        flash.className = UiClasses.ICE_DRAGON_FLASH;
        targetArea.appendChild(flash);

        const removeFlash = () => {
            if (flash.parentNode) flash.remove();
        };

        setTimeout(() => {
            flash.classList.add(UiClasses.ICE_DRAGON_FLASH_FADEOUT);
            flash.addEventListener('transitionend', removeFlash, { once: true });
            setTimeout(removeFlash, 1300);
        }, 1000);
    }

    _updateIceDragonEventSubtitle(subtitleText, color = null, fontSize = null) {
        if (!this._iceDragonEventOverlay?.caption) return;
        
        // テキスト更新
        this._iceDragonEventOverlay.caption.textContent = subtitleText ?? '';
        
        // 色が指定されていれば変更、なければ元（CSSの色）に戻す
        if (color) {
            this._iceDragonEventOverlay.caption.style.color = color;
        } else {
            this._iceDragonEventOverlay.caption.style.color = ''; // 指定がなければリセット
        }
        //サイズ指定
        if (fontSize) {
            // '24px', '2em', '150%' などの文字列が入る
            this._iceDragonEventOverlay.caption.style.fontSize = fontSize;
        } else {
            // 指定がなければCSSのデフォルト(clamp設定など)に戻す
            this._iceDragonEventOverlay.caption.style.fontSize = ''; 
        }
    }

    _fadeOutIceDragonEventOverlay() {
        const overlay = this._iceDragonEventOverlay?.container;
        if (!overlay) return Promise.resolve();
        return new Promise((resolve) => {
            const cleanup = () => {
                if (overlay.parentNode) overlay.remove();
                this._iceDragonEventOverlay = null;
                resolve();
            };
            overlay.addEventListener(
                'transitionend',
                (event) => {
                    if (event.propertyName !== 'opacity') return;
                    cleanup();
                },
                { once: true }
            );
            overlay.classList.add(UiClasses.ICE_DRAGON_EVENT_FADEOUT);
            setTimeout(cleanup, 1100);
        });
    }

    _refreshAwakenedEnemyAppearance() {
        if (!this._pendingAwakenRefresh) return;
        const { enemy, allEnemies, enemyIndex } = this._pendingAwakenRefresh;
        this._pendingAwakenRefresh = null;

        this.ui.refreshEnemyGraphics(allEnemies);
        const refreshedEnemyEl = document.getElementById(
            GameConfig.UI.ID_TEMPLATES.ENEMY_SPRITE.replace('{index}', enemyIndex)
        );
        if (refreshedEnemyEl && enemy.enemyType === GameConfig.ENEMY_TYPES.ICE_DRAGON) {
            refreshedEnemyEl.classList.add(UiClasses.BOSS_LIFT);
        }
    }

    _showCanvasCutinImage(src, opts = {}) {
        const canvasArea = document.getElementById(GameConfig.UI.IDS.CANVAS_AREA);
        if (!canvasArea || !src) return;
        const displayMs = opts.displayMs ?? 1100;
        const cutin = document.createElement('div');
        cutin.className = UiClasses.ICE_DRAGON_CUTIN;

        const img = document.createElement('img');
        img.src = src;
        img.alt = opts.alt ?? '';

        const removeCutin = () => {
            if (cutin.parentNode) cutin.remove();
        };

        img.addEventListener('error', removeCutin, { once: true });
        img.addEventListener(
            'load',
            () => {
                cutin.appendChild(img);
                canvasArea.appendChild(cutin);
                requestAnimationFrame(() => cutin.classList.add(UiClasses.ICE_DRAGON_CUTIN_ACTIVE));

                const fadeOutTimer = setTimeout(() => {
                    cutin.classList.add(UiClasses.ICE_DRAGON_CUTIN_FADEOUT);
                }, displayMs);

                cutin.addEventListener(
                    'transitionend',
                    (event) => {
                        if (event.propertyName !== 'opacity') return;
                        if (cutin.classList.contains(UiClasses.ICE_DRAGON_CUTIN_FADEOUT)) {
                            clearTimeout(fadeOutTimer);
                            removeCutin();
                        }
                    },
                    { once: true }
                );

                setTimeout(removeCutin, displayMs + 600);
            },
            { once: true }
        );
    }

    // --- 攻撃系の演出 ---

    /**
     * 通常攻撃開始時の演出を表示する。
     * @param {object} actor - 行動者。
     * 副作用: UI/効果音を更新する。
     */
    showAttackStart(actor) {
        const logColor = actor.job ? UiColors.LOG_SKILL : UiColors.LOG_ATTACK;
        this.ui.addLog(
            "{name}の攻撃！".replace('{name}', actor.name),
            logColor,
            true
        );
        const isMagicUser = (actor.job === GameConfig.JOBS.WIZARD || actor.job === GameConfig.JOBS.HEALER);

        return isMagicUser;
    }

    /**
     * 物理攻撃の被弾演出を表示する。
     * @param {object} target - 対象。
     * @param {number} damage - ダメージ量。
     * @param {boolean} isCritical - クリティカルか。
     * @param {boolean} isMagicHit - 魔法被弾の補助表示。
     */
    showPhysicalHit(target, damage, isCritical, isMagicHit) {
        const targetId = this._getTargetId(target);

        if (isMagicHit) this.effects.magicExplosion(targetId);
        else this.effects.slashEffect(targetId);

        // ★定数使用
        const popupColor = UiColors.DAMAGE;
        this.effects.damagePopup(damage, targetId, popupColor);

        if (isCritical) this.ui.addLog("クリティカルヒット！", UiColors.CRITICAL, true);
        this.ui.addLog(
            "> {name}に {damage} のダメージ！"
                .replace('{name}', target.name)
                .replace('{damage}', damage)
        );

        this._checkDeath(target, targetId);
    }

    // --- スキル・魔法系の演出 ---

    /**
     * スキル発動開始時の演出を表示する。
     * @param {object} actor - 行動者。
     * @param {object} skill - スキル定義。
     */
    showSkillStart(actor, skill) {
        const logColor = actor.job ? UiColors.LOG_SKILL : UiColors.LOG_ATTACK;
        this.ui.addLog(
            "{name}の {skill} "
                .replace('{name}', actor.name)
                .replace('{skill}', skill.name),
            logColor,
            true
        );
    }

    /**
     * 魔法系スキルのエフェクトを表示する。
     * @param {object} actor - 行動者。
     * @param {object} skill - スキル定義。
     * @param {Array} targets - 対象一覧。
     */
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

    /**
     * 魔法被弾の演出を表示する。
     * @param {object} target - 対象。
     * @param {number} damage - ダメージ量。
     */
    showMagicHit(target, damage) {
        const targetId = this._getTargetId(target);
        // ★定数使用
        this.effects.damagePopup(damage, targetId, UiColors.DAMAGE);
        this.ui.addLog(
            "> {name}に {damage} のダメージ！"
                .replace('{name}', target.name)
                .replace('{damage}', damage)
        );
        this._checkDeath(target, targetId);
    }

    // --- 回復・支援系の演出 ---

    /**
     * 回復演出を表示する。
     * @param {object} target - 対象。
     * @param {number} amount - 回復量。
     * @param {boolean} isMp - MP回復か。
     * @param {boolean} playSound - 効果音を鳴らすか。
     */
    showHeal(target, amount, isMp = false, playSound = true) {
        if (playSound) {
            if (!isMp) this.music.playHeal();
            else this.music.playMeditation();
        }

        const targetId = this._getTargetId(target);
        this.effects.healEffect(targetId);
        
        // ★定数使用
        const color = isMp ? UiColors.HEAL_MP : UiColors.HEAL_HP;
        const unit = isMp ? "MP" : "";
        this.effects.damagePopup(`+${amount}${unit}`, targetId, color);

        const typeStr = isMp ? "MP" : "HP";
        this.ui.addLog(
            "> {name}の{type}が {amount} 回復した"
                .replace('{name}', target.name)
                .replace('{type}', typeStr)
                .replace('{amount}', amount)
        );
    }

    /**
     * 全回復時の演出を表示する。
     * @param {object} target - 対象。
     */
    showFullHeal(target) {
        this.music.playHeal();
        const targetId = this._getTargetId(target);
        this.effects.healEffect(targetId);
        // ★定数使用
        this.effects.damagePopup("FULL", targetId, UiColors.FULL_HEAL);
        this.ui.addLog(
            "> {name}のHP・MPが全回復した！".replace('{name}', target.name),
            UiColors.FULL_HEAL
        );
    }

    /**
     * 蘇生演出を表示する。
     * @param {object} target - 対象。
     * @param {boolean} isFullRevive - 全快蘇生か。
     */
    showResurrection(target, isFullRevive = false) {
        const targetId = this._getTargetId(target);
        this.effects.resurrectionEffect(targetId);
        this.music.playHeal();
        
        if (isFullRevive) {
            this.ui.addLog(
                "{name}が完全な状態で蘇生した！".replace('{name}', target.name),
                UiColors.LOG_IMPORTANT,
                true
            );
        } else {
            this.ui.addLog(
                "> {name}が蘇った！".replace('{name}', target.name),
                UiColors.LOG_ATTACK
            );
        }
    }

    /**
     * かばう発動演出を表示する。
     * @param {object} actor - 行動者。
     */
    showCover(actor) {
        this.music.playCover();
        this.ui.addLog(
            "{name}は身構えた！".replace('{name}', actor.name),
            UiColors.LOG_SKILL,
            true
        );
        this.ui.addLog(" > 仲間への攻撃を身代わりする！");
    }

    /**
     * かばう行動の演出を表示する。
     * @param {object} protector - かばう側。
     * @param {object} target - かばわれる側。
     */
    showCoverAction(protector, target) {
         this.ui.addLog(
             " > {protector}が{target}をかばった！"
                 .replace('{protector}', protector.name)
                 .replace('{target}', target.name),
             UiColors.LOG_SKILL
         );
    }

    /**
     * バフ演出を表示する。
     * @param {Array} targets - 対象一覧。
     * @param {string} skillName - 表示名。
     */
    showBuff(targets, skillName) {
        if (skillName === "竜の咆哮") {
            this.music.playBreath(); 
            const actorId = this._getTargetId(targets[0]);
            this.effects.roarEffect(actorId);
            this.ui.addLog(" > ドラゴンの攻撃力が激増した！", UiColors.LOG_BUFF);
        } else {
            this.music.playKobu();
            this.ui.addLog(" > 味方の攻撃力が上がった！"); 
        }

        targets.forEach(t => {
            if(t.is_alive()) this.effects.healEffect(this._getTargetId(t));
        });
    }

    /**
     * リジェネ演出を表示する。
     * @param {object} actor - 対象。
     */
    showRegen(actor) {
        this.music.playHeal();
        this.ui.addLog(
            "{name}は天に祈りを捧げた！".replace('{name}', actor.name),
            UiColors.LOG_PRAYER,
            true
        );
        this.ui.addLog(" > 味方全員に祝福が宿る！", UiColors.LOG_PRAYER);
    }
    
    // --- 分裂イベント演出 ---

    /**
     * 分裂トリガー演出を表示する。
     * @param {object} enemy - 対象敵。
     */
    async showSplittingTrigger(enemy) {
        this.ui.addLog(
            "{name}の体が震えだした...！".replace('{name}', enemy.name),
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

    /**
     * 分裂変身演出の字幕を表示する。
     * @param {string} oldName - 変身前の名称。
     */
    showSplittingTransform(oldName) {
        this.ui.addLog(
            "{name}は3匹に分裂した！".replace('{name}', oldName),
            UiColors.LOG_SPLIT
        );
        this.music.playSplited(); 
    }

    /**
     * 分裂後の敵出現演出を表示する。
     * @param {number} startIndex - 追加敵の開始位置。
     */
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
    
    /**
     * 影の合体開始演出を表示する。
     */
    async showShadowFusionStart() {
        this.ui.addLog("影たちが一点に凝縮していく...！", UiColors.LOG_PRAYER, true);
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

    /**
     * 影の合体終了演出を表示する。
     */
    async showShadowFusionEnd() {
        this.ui.addLog("「影の支配者」が現れた！！！", UiColors.LOG_BUFF, true);
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
    
    /**
     * ドラゴン変身イベントの演出を行う。
     * @param {object} enemy - 変身対象。
     * @param {Array} allEnemies - 敵一覧。
     */
    async playDragonTransformation(enemy, allEnemies) {
        const enemyIndex = allEnemies.indexOf(enemy);
        const enemyEl = document.getElementById(
            GameConfig.UI.ID_TEMPLATES.ENEMY_SPRITE.replace('{index}', enemyIndex)
        );

        const log1 = "『我ガネムリヲ妨ゲル物ハ・・・消エ去レ・・・！！』";
        this.ui.addLog(log1, UiColors.LOG_BUFF);
        if (enemyEl) enemyEl.classList.add(UiClasses.SWAY_SLOW);
        this._pendingAwakenRefresh = { enemy, allEnemies, enemyIndex };
        // ★定数使用
        await new Promise(r => setTimeout(r, GameConfig.TIME.TRANSFORM_WAIT));

        if (enemyEl) {
            enemyEl.classList.remove(UiClasses.SWAY_SLOW);
            enemyEl.classList.add(UiClasses.FLASH_RAPID);
        }
        await new Promise(r => setTimeout(r, 1000));
        await new Promise(r => setTimeout(r, GameConfig.TIMING.DRAGON_FLASH_WAIT_MS));
    }
    
    /**
     * 絶望→復活イベントの演出を行う。
     * @param {Array} party - パーティ一覧。
     */
    async playDespairAndRevival(party) {
        await new Promise(r => setTimeout(r, GameConfig.TIMING.DESPAIR_INTRO_WAIT_MS));
        const log2 = "覚醒アイスドラゴン『無ニ帰ス・・・絶対零度！！』";
        this.ui.addLog(log2, UiColors.LOG_DRAGON_DESPAIR);
        this._startIceDragonEventOverlay(log2);
        this.music.playDragon_voice();
        await new Promise(r => setTimeout(r, 2000));
        await new Promise(r => setTimeout(r, GameConfig.TIMING.DESPAIR_LINE_WAIT_MS));
        this.music.stopBGM();

        const log3 = "猛吹雪が吹き荒れる。";
        this._refreshAwakenedEnemyAppearance();
        this.ui.addLog(log3, UiColors.LOG_BLIZZARD);
        this._updateIceDragonEventSubtitle(log3);
        await new Promise(r => setTimeout(r, 2000));
        const blizzardOverlay = this._ensureActiveBlizzardOverlay();
        if (blizzardOverlay) {
            await new Promise(r => requestAnimationFrame(r));
            blizzardOverlay.style.opacity = UiStyle.OPACITY_VISIBLE;
        }
        this._showFullscreenBlizzard(UiClasses.BLIZZARD_MODE_NORMAL);
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
                hpText.innerText = "HP: {current} / {max}"
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

        const log4 = "パーティは全滅した･･･";
        this.ui.addLog(log4, UiColors.LOG_DESPAIR);
        this._updateIceDragonEventSubtitle(log4,'red','24px');
        await new Promise(r => setTimeout(r, 2500));
        const log5 = "もうだめかと思った･･･";
        this.ui.addLog(log5, UiColors.LOG_DEFAULT);
        this._updateIceDragonEventSubtitle(log5);
        await new Promise(r => setTimeout(r, 2000));
        const log6 = "その時･･･";
        this.ui.addLog(log6, UiColors.LOG_DEFAULT);
        this._updateIceDragonEventSubtitle(log6);
        await new Promise(r => setTimeout(r, 2500));
        this.music.playBGM(GameConfig.AUDIO.BGM_TYPES.BOSS2);
        await new Promise(r => setTimeout(r, GameConfig.TIMING.DESPAIR_HOPE_WAIT_MS));
        
        const log7 = "？？？『にゃにをあきらめているにゃ！？』";
        this.ui.addLog(log7, UiColors.LOG_ATTACK);
        this._updateIceDragonEventSubtitle(log7);
        await new Promise(r => setTimeout(r, 2000));
        await new Promise(r => setTimeout(r, GameConfig.TIMING.DESPAIR_ZABOCHI_WAIT_MS));
        
        const goldFlash = document.createElement('div');
        goldFlash.className = UiClasses.FLASH_GOLD;
        document.body.appendChild(goldFlash);

        const zabochiImg = document.createElement('img');
        zabochiImg.src = GameConfig.ASSETS.IMAGES.ZABOCHI; 
        zabochiImg.className = UiClasses.ZABOCHI_APPEAR;   
        //document.body.appendChild(zabochiImg);
        
        const gameArea = document.getElementById('canvas-area');
        gameArea.appendChild(zabochiImg);
       
        
        const log8 = "伝説の猫神『ざぼち』が降臨し、軌跡を起こした！";
        this.ui.addLog(log8, UiColors.LOG_ATTACK);
        this._updateIceDragonEventSubtitle(log8);
        await new Promise(r => setTimeout(r, 1000));
        

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
                hpText.innerText = "HP: {current} / {max}"
                    .replace('{current}', p.max_hp)
                    .replace('{max}', p.max_hp);
            }
            if (hpBar)  hpBar.style.width = UiStyle.FULL_HP_PERCENT;
            if (card)   card.style.opacity = UiStyle.CARD_OPACITY_ALIVE;
        });
        
        await this._fadeOutIceDragonEventOverlay();
        this.music.playHeal();
        
        const hasZabochi = party.some(m => m instanceof GodCat);
        if (!hasZabochi) {
            const zabochi = new GodCat();
            zabochi.resetActionValue(); 
            party.push(zabochi);
        }
        await new Promise(r => setTimeout(r, GameConfig.TIMING.DESPAIR_ZABOCHI_JOIN_WAIT_MS)); 
        
        goldFlash.remove();
        zabochiImg.remove();
    }

    /**
     * アイテム使用演出を表示する。
     * @param {object} actor - 行動者。
     * @param {object} item - アイテム定義。
     */
    showItemUse(actor, item) {
        this.ui.addLog(
            "{name}は {item} を使った！"
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

    /**
     * HP/MP表示などのUIを再同期する。
     * 副作用: UI表示を更新する。
     */
    refreshStatus() {
        this.ui.updateEnemyHP(this.enemies);
    }
}
