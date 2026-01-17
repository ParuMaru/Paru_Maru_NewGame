///
/// 役割: 戦闘UIの描画/入力を管理し、ログやメニューを制御する。
/// 入出力: バトル状態から表示情報を受け取り、DOMへ反映する。
/// 関連: battle_manager.js, battle_state.js, ui_classes.js
///
import { SkillData } from './skills.js';
import { ItemData } from './items.js';
import { RelicData } from './relics.js';
import { UiClasses } from './ui_classes.js';
import { UiColors } from './ui_colors.js';
import { UiLuminance, UiStyle } from './ui_style.js';
import { GameConfig } from './game_config.js';

/**
 * 戦闘中のUI表示と入力を管理する。
 * @class
 */
export class UIManager {
    /**
     * UI初期値を設定する。
     */
    constructor() {
        this.logElement = document.getElementById(GameConfig.UI.IDS.LOG);
        this.commandContainer = document.getElementById(GameConfig.UI.IDS.COMMAND_CONTAINER);
        this.turnLabel = document.getElementById(GameConfig.UI.IDS.TURN_LABEL);
        this.enemyContainer = document.getElementById(GameConfig.UI.IDS.ENEMY_TARGET);
        this.currentActor = null; 
        this.inventory = null;
        this.initTurnOrderUI();
        this.initRelicUI();
        this.initAllOutUI();
    }
    
    // ★追加: 画面左に行動順表示エリアを作る
    /**
     * 行動順UIの初期DOMを生成する。
     * 副作用: DOM要素を追加する。
     */
    initTurnOrderUI() {
        // すでにあったら作らない
        if (document.getElementById(GameConfig.UI.IDS.TURN_ORDER_PANEL)) return;

        const canvasArea = document.getElementById(GameConfig.UI.IDS.CANVAS_AREA);
        const panel = document.createElement('div');
        panel.id = GameConfig.UI.IDS.TURN_ORDER_PANEL;
        

        const roundInfo = document.createElement('div');
        roundInfo.className = UiClasses.ROUND_INFO;
        roundInfo.id = GameConfig.UI.IDS.ROUND_INFO_TEXT;
        roundInfo.innerText = "▶ NEXT";
        panel.appendChild(roundInfo);


        // リスト本体
        const list = document.createElement('div');
        list.id = GameConfig.UI.IDS.TURN_LIST_CONTAINER;
        panel.appendChild(list);

        canvasArea.appendChild(panel);
    }

    // ★追加: 行動順とラウンド情報の更新メソッド
    /**
     * 行動順UIを更新する。
     * @param {Array} turnQueue - 行動順配列。
     * @param {number} currentRound - 現在ラウンド。
     * 副作用: DOM表示を更新する。
     */
    updateTurnOrder(turnQueue, currentRound) {
        const listContainer = document.getElementById(GameConfig.UI.IDS.TURN_LIST_CONTAINER);
        const roundText = document.getElementById(GameConfig.UI.IDS.ROUND_INFO_TEXT);
        
        if (!listContainer) return;

        // --- 変更: ラウンド表示更新をコメントアウト ---
        // if (roundText) roundText.innerText = `Round ${currentRound}`;
        // ------------------------------------------

        listContainer.innerHTML = ""; // 一旦クリア

        // 先頭から最大5人分だけ表示（多すぎると画面が埋まるため）
        const displayLimit = GameConfig.UI.LIMITS.TURN_QUEUE_DISPLAY;
        const queueToShow = turnQueue.slice(0, displayLimit);

        queueToShow.forEach((chara, index) => {
            if (!chara.is_alive()) return; // 死体は表示しない

            const item = document.createElement('div');
            item.className = UiClasses.TURN_ITEM;
            
            // 現在の行動者（先頭）
            if (index === 0) {
                item.classList.add(UiClasses.CURRENT_TURN);
            }

            // 味方か敵かで枠の色を変える
            // entities.jsで job を持っているのが味方、enemyTypeを持ってるのが敵
            if (chara.job) {
                item.classList.add(UiClasses.IS_ALLY);
            } else {
                item.classList.add(UiClasses.IS_ENEMY);
            }

            // 画像
            const img = document.createElement('img');
            // 味方の画像パスがない場合は適当なアイコンを割り当てる想定
            // entities.jsで味方にも img プロパティを持たせるか、ここで分岐が必要です
            // 一旦、Entity基底クラスに img がある前提で書きます
            if (chara.job === GameConfig.JOBS.HERO) img.src = GameConfig.ASSETS.IMAGES.HERO_ICON; // 
            else if (chara.job === GameConfig.JOBS.WIZARD) img.src = GameConfig.ASSETS.IMAGES.WIZARD_ICON;
            else if (chara.job === GameConfig.JOBS.HEALER) img.src = GameConfig.ASSETS.IMAGES.HEALER_ICON;
            else img.src = chara.img || GameConfig.ASSETS.IMAGES.ENEMY_FALLBACK; // 敵は持ってるimgを使う

            // ※もし味方の画像を用意していない場合は、job名で分岐して仮画像を出してください
            // img.src が 404 になると見栄えが悪いのでエラーハンドリング
            img.onerror = () => { img.src = GameConfig.ASSETS.IMAGES.ENEMY_FALLBACK; };

            // 行動値 (Action Value) バッジ
            const avBadge = document.createElement('div');
            avBadge.className = UiClasses.TURN_AV_BADGE;
            // 小数点以下は切り捨てて表示
            avBadge.innerText = Math.floor(chara.actionValue);

            item.appendChild(img);
            item.appendChild(avBadge);
            listContainer.appendChild(item);
        });
    }

    /**
     * 弱点タグを表示文言に変換する。
     * @param {string} tag - 弱点タグ。
     * @returns {string}
     */
    getWeaknessLabel(tag) {
        const labelMap = {
            [GameConfig.WEAKNESS_TAGS.FIRE]: "炎",
            [GameConfig.WEAKNESS_TAGS.ICE]: "氷",
            [GameConfig.WEAKNESS_TAGS.HOLY]: "聖",
            [GameConfig.WEAKNESS_TAGS.SLASH]: "斬"
        };
        return labelMap[tag]
            ? `弱点:${labelMap[tag]}`
            : "弱点:なし";
    }

    /**
     * 所持品情報をUI側へ同期する。
     * @param {object} inventory - 所持品情報。
     */
    setInventory(inventory) {
        this.inventory = inventory;
    }
    // ログ出力
    /**
     * 戦闘ログへメッセージを追加する。
     * @param {string} message - 表示文。
     * @param {string} color - 表示色。
     * @param {boolean} isBold - 強調表示するか。
     */
    addLog(message, color = UiColors.LOG_DEFAULT,isBold = false){
        const div = document.createElement('div');
        div.style.color = color;
        div.innerHTML = message;
        
        if (isBold) {
            div.style.fontWeight = UiStyle.FONT_WEIGHT_BOLD;
            div.style.fontSize = `${GameConfig.UI.LIMITS.LOG_BOLD_FONT_SIZE_PX}px`; 
        }
        
        this.logElement.appendChild(div);
        this.logElement.scrollTop = this.logElement.scrollHeight;
    }

    /**
     * プレイヤー行動のコマンドを表示する。
     * @param {object} actor - 行動者。
     * @param {Function} onSelect - 選択時コールバック。
     * @param {Array|null} options - 表示オプション。
     * 副作用: コマンドUIを生成する。
     */
    showCommands(actor, onSelect, options = null) {
        this.currentActor = actor;
        if (options) {
            this.commandOptions = options;
        } else if (!this.commandOptions) {
            this.commandOptions = {};
        }
        this.commandContainer.innerHTML = "";
        this.turnLabel.innerText = "▼ {name} の行動選択".replace('{name}', actor.name); 

        this._createButton("攻撃", UiColors.BUTTON_ATTACK, () => onSelect({ type: 'attack' }));

        actor.skills.forEach(id => {
            const skill = SkillData[id];
            if (!skill) return;

            let btnColor = skill.color;

            if (skill.menu === GameConfig.SKILL_MENUS.MAIN) {
                const mainColor = skill.id === GameConfig.SKILL_IDS.MEDITATION
                    ? UiColors.BUTTON_MAIN_MAGIC
                    : UiColors.BUTTON_MAIN_SKILL;
                this._createButton(skill.name, mainColor, () => onSelect({ type: 'skill', detail: skill }));
            } else if (skill.menu === GameConfig.SKILL_MENUS.MAGIC && !this._hasButton("魔法")) {
                this._createButton("魔法", btnColor, () => this.showSubMenu(GameConfig.SKILL_MENUS.MAGIC, onSelect));
            } else if (skill.menu === GameConfig.SKILL_MENUS.SKILL && !this._hasButton("スキル")) {
                this._createButton("スキル", UiColors.BUTTON_SKILL, () => this.showSubMenu(GameConfig.SKILL_MENUS.SKILL, onSelect));
            }
        });

        this._createButton("どうぐ", UiColors.BUTTON_ITEM, () => this.showItemMenu(onSelect));
    }

    /**
     * 総攻撃UIのDOMを初期化する。
     * 副作用: DOM要素を追加する。
     */
    initAllOutUI() {
        if (document.getElementById(GameConfig.UI.IDS.ALLOUT_OVERLAY)) return;

        const wrapper = document.getElementById(GameConfig.UI.IDS.GAME_WRAPPER) || document.body;

        const overlay = document.createElement('div');
        overlay.id = GameConfig.UI.IDS.ALLOUT_OVERLAY;
        overlay.innerHTML = `
            <div class="${UiClasses.ALL_OUT_DARKEN}"></div>
            <div class="${UiClasses.ALL_OUT_WIPE}"></div>
            <div class="${UiClasses.ALL_OUT_CUTIN}">
                <img src="${GameConfig.ASSETS.IMAGES.TRINITY_CUTIN}" alt="">
            </div>
        `;
        wrapper.appendChild(overlay);

        const cutinImage = overlay.querySelector(`.${UiClasses.ALL_OUT_CUTIN} img`);
        if (cutinImage) {
            cutinImage.onerror = () => {
                const cutin = overlay.querySelector(`.${UiClasses.ALL_OUT_CUTIN}`);
                if (cutin) cutin.classList.add(UiClasses.ALL_OUT_CUTIN_MISSING);
            };
        }

        const prompt = document.createElement('div');
        prompt.id = GameConfig.UI.IDS.ALLOUT_PROMPT;
        prompt.innerHTML = `
            <div class="${UiClasses.ALL_OUT_PROMPT_BOX}">
                <div class="${UiClasses.ALL_OUT_PROMPT_TITLE}">トリニティアタックのチャンス！</div>
                <div class="${UiClasses.ALL_OUT_PROMPT_BUTTONS}">
                    <button class="${UiClasses.ALL_OUT_CONFIRM}">トリニティアタック</button>
                    <button class="${UiClasses.ALL_OUT_CANCEL}">しない</button>
                </div>
            </div>
        `;
        wrapper.appendChild(prompt);
    }

    /**
     * 総攻撃チャンスのプロンプトを表示する。
     * 副作用: UI表示を更新する。
     */
    showAllOutPrompt() {
        return new Promise(resolve => {
            const prompt = document.getElementById(GameConfig.UI.IDS.ALLOUT_PROMPT);
            if (!prompt) {
                resolve(false);
                return;
            }

            const confirmBtn = prompt.querySelector(`.${UiClasses.ALL_OUT_CONFIRM}`);
            const cancelBtn = prompt.querySelector(`.${UiClasses.ALL_OUT_CANCEL}`);

            const cleanup = (result) => {
                prompt.classList.remove(UiClasses.ALL_OUT_ACTIVE);
                confirmBtn.onclick = null;
                cancelBtn.onclick = null;
                resolve(result);
            };

            confirmBtn.onclick = () => cleanup(true);
            cancelBtn.onclick = () => cleanup(false);

            prompt.classList.add(UiClasses.ALL_OUT_ACTIVE);
        });
    }

    /**
     * 総攻撃アニメーションを再生する。
     * 副作用: DOMクラスを変更する。
     */
    playAllOutAnimation() {
        return new Promise(resolve => {
            const overlay = document.getElementById(GameConfig.UI.IDS.ALLOUT_OVERLAY);
            if (!overlay) {
                resolve();
                return;
            }

            overlay.classList.remove(UiClasses.ALL_OUT_ACTIVE);
            void overlay.offsetWidth;
            overlay.classList.add(UiClasses.ALL_OUT_ACTIVE);

            const animDuration = GameConfig.TIME.ALL_OUT_ANIMATION || GameConfig.TIME.ALL_OUT_ANIMATION_FALLBACK;
            const tailDelay = GameConfig.TIMING.ALL_OUT_TAIL_DELAY_MS;
            const shakeTarget = document.getElementById(GameConfig.UI.IDS.GAME_WRAPPER);
            if (shakeTarget) shakeTarget.classList.add(UiClasses.ALL_OUT_SHAKE);
            setTimeout(() => resolve(), animDuration);
            setTimeout(() => overlay.classList.remove(UiClasses.ALL_OUT_ACTIVE), animDuration + tailDelay);
            setTimeout(() => {
                if (shakeTarget) shakeTarget.classList.remove(UiClasses.ALL_OUT_SHAKE);
            }, animDuration + tailDelay);
        });
    }

    /**
     * サブメニュー（スキル/アイテム）を表示する。
     * @param {string} menuType - メニュー種別。
     * @param {Function} onSelect - 選択時コールバック。
     */
    showSubMenu(menuType, onSelect) {
        this.commandContainer.innerHTML = "";
        this.turnLabel.innerText = menuType === GameConfig.SKILL_MENUS.MAGIC
            ? "魔法を選択"
            : "スキルを選択";

        this.currentActor.skills.forEach(id => {
            const skill = SkillData[id];
            if (skill && skill.menu === menuType) {
                const canUse = (this.currentActor.mp >= skill.cost) || (skill.id === GameConfig.SKILL_IDS.RAISE);
                
                let btnText = "{name} ({cost})"
                    .replace('{name}', skill.name)
                    .replace('{cost}', skill.cost);
                let btnColor = skill.color;
                
                if (skill.id === GameConfig.SKILL_IDS.RAISE && this.currentActor.mp < skill.cost) {
                    btnText = "命の代償";
                    btnColor = UiColors.BUTTON_RAISE; 
                }
                
                this._createButton(
                    btnText,
                    btnColor,
                    () => onSelect({ type: 'skill', detail: skill }),
                    canUse
                );
            }
        });

        this._createButton("戻る", UiColors.BUTTON_BACK, () => this.showCommands(this.currentActor, onSelect, this.commandOptions));
    }

    /**
     * アイテム選択メニューを表示する。
     * @param {Function} onSelect - 選択時コールバック。
     */
    showItemMenu(onSelect) {
        this.commandContainer.innerHTML = "";
        this.turnLabel.innerText = "アイテムを選択";
        
        const items = this.inventory || ItemData;

        Object.values(items).forEach(item => {
            const canUse = item.count > 0;
            this._createButton(
                "{name} ({count})"
                    .replace('{name}', item.name)
                    .replace('{count}', item.count),
                item.color,
                () => onSelect({ type: 'item', detail: item }),
                canUse
            );
        });

        this._createButton("戻る", UiColors.BUTTON_BACK, () => this.showCommands(this.currentActor, onSelect, this.commandOptions));
    }
    
    /**
     * ターゲット選択メニュー
     * 敵も味方もクリックで選べるように改良
     */
    /**
     * 対象選択メニューを表示する。
     * @param {Array} targets - 対象一覧。
     * @param {Function} onSelect - 選択時コールバック。
     * @param {Function} onBack - 戻る処理。
     * @param {object|null} action - 元の行動情報。
     */
    showTargetMenu(targets, onSelect, onBack, action = null) {
        this.commandContainer.innerHTML = "";
        
        
        if (action?.detail?.desc) {
            this.turnLabel.innerText = action.detail.desc;
        } else {
            this.turnLabel.innerText = "対象を選択してください";
        }

        // --- クリック選択機能 ---

        // 1. まず変数を定義する
        const enemyUnits = document.querySelectorAll(`.${UiClasses.ENEMY_UNIT}`);
        const memberCards = document.querySelectorAll(`.${UiClasses.MEMBER_CARD}`);

        // 2. お掃除関数を定義
        const cleanupClickEvents = () => {
            enemyUnits.forEach(u => {
                u.classList.remove(UiClasses.TARGET_CANDIDATE);
                u.onclick = null;
            });
            memberCards.forEach(c => {
                c.classList.remove(UiClasses.TARGET_CANDIDATE);
                c.onclick = null;
            });
        };

        // 3. コールバックのラップ
        const wrappedOnSelect = (target) => {
            cleanupClickEvents();
            onSelect(target);
        };
        const wrappedOnBack = () => {
            cleanupClickEvents();
            onBack();
        };

        // 4. クリックイベントの付与
        // 敵キャラ
        enemyUnits.forEach(unit => {
            if (unit._enemyRef && targets.includes(unit._enemyRef)) {
                unit.classList.add(UiClasses.TARGET_CANDIDATE);
                unit.onclick = () => wrappedOnSelect(unit._enemyRef);
            }
        });

        // 味方キャラ
        memberCards.forEach(card => {
            if (card._memberRef && targets.includes(card._memberRef)) {
                card.classList.add(UiClasses.TARGET_CANDIDATE);
                card.onclick = () => wrappedOnSelect(card._memberRef);
            }
        });

        // --- ボタン生成 ---
        
        targets.forEach((target, i) => {
            this._createButton(
                target.name,
                target.job ? UiColors.TARGET_ALLY : UiColors.TARGET_ENEMY, 
                () => wrappedOnSelect(target)
            );
        });

        this._createButton("戻る", UiColors.BUTTON_BACK, wrappedOnBack);
    }

    _createButton(text, color, action, enabled = true) {
        const btn = document.createElement('button');
        btn.innerText = text;
        btn.className = UiClasses.COMMAND_BTN;
        btn.style.backgroundColor = enabled ? color : UiColors.BUTTON_DISABLED_BG;
        const textColor = enabled ? this._getButtonTextColor(color) : UiColors.BUTTON_DISABLED_TEXT;
        btn.style.color = textColor;
        btn.style.textShadow = enabled
            ? (textColor === UiColors.BUTTON_TEXT_DARK
                ? UiStyle.TEXT_SHADOW_LIGHT
                : UiStyle.TEXT_SHADOW_DARK)
            : UiStyle.TEXT_SHADOW_NONE;
        btn.disabled = !enabled;
        btn.onclick = action;
        this.commandContainer.appendChild(btn);
    }

    _hasButton(text) {
        return Array.from(this.commandContainer.children).some(btn => btn.innerText === text);
    }

    _getButtonTextColor(color) {
        if (!color || color[0] !== UiStyle.COLOR_HASH || color.length < GameConfig.UI.LIMITS.HEX_COLOR_MIN_LENGTH) return UiColors.BUTTON_TEXT_LIGHT;
        const hex = color.replace(UiStyle.COLOR_HASH, "");
        const r = parseInt(hex.substring(0, 2), 16);
        const g = parseInt(hex.substring(2, 4), 16);
        const b = parseInt(hex.substring(4, 6), 16);
        const luminance = (UiLuminance.RED_WEIGHT * r + UiLuminance.GREEN_WEIGHT * g + UiLuminance.BLUE_WEIGHT * b)
            / GameConfig.UI.LIMITS.LUMINANCE_DENOMINATOR;
        return luminance > GameConfig.UI.LIMITS.LUMINANCE_THRESHOLD
            ? UiColors.BUTTON_TEXT_DARK
            : UiColors.BUTTON_TEXT_LIGHT;
    }

    /**
     * 敵グラフィックの再描画を行う。
     * @param {Array} enemies - 敵一覧。
     * 副作用: DOMを更新する。
     */
    refreshEnemyGraphics(enemies) {
        this.enemyContainer.innerHTML = ''; 

        Object.assign(this.enemyContainer.style, {
            display: UiStyle.GRID_DISPLAY,
            gridTemplateColumns: `${UiStyle.GRID_TEMPLATE_PREFIX}${enemies.length}${UiStyle.GRID_TEMPLATE_SUFFIX}`, 
            width: UiStyle.WIDTH_FULL,
            justifyItems: UiStyle.JUSTIFY_CENTER, 
            alignItems: UiStyle.ALIGN_END      
        });

        enemies.forEach((enemy, index) => {
            if (!enemy.is_alive()) return; 

            const unitDiv = document.createElement('div');
            unitDiv.className = UiClasses.ENEMY_UNIT;
            unitDiv.id = GameConfig.UI.ID_TEMPLATES.ENEMY_SPRITE.replace('{index}', index); 
            
            // enemyオブジェクトが持つフラグに基づきCSSクラスを付与
            if (enemy.isSplitLeft) {
                unitDiv.classList.add(UiClasses.SPLIT_POS_LEFT);
            } else if (enemy.isSplitRight) {
                unitDiv.classList.add(UiClasses.SPLIT_POS_RIGHT);
            }
            
            // DOM要素に敵データを埋め込む（クリック選択用）
            unitDiv._enemyRef = enemy;

            unitDiv.style.gridColumn = index + UiStyle.GRID_COLUMN_OFFSET;
            unitDiv.style.gridRow = UiStyle.GRID_ROW; 

            if (enemy.isBoss) {
                if (enemy.enemyType === GameConfig.ENEMY_TYPES.ICE_DRAGON) {
                    unitDiv.classList.add(UiClasses.DRAGON_SIZE);
                } else {
                    unitDiv.classList.add(UiClasses.KING_SIZE);
                }
            }
            if (enemy.enemyType === GameConfig.ENEMY_TYPES.ICE_DRAGON || enemy.enemyType === GameConfig.ENEMY_TYPES.SHADOW_LORD) {
                unitDiv.classList.add(UiClasses.BOSS_LIFT);
            }
            
            //  影シリーズの場合、特別なクラスを付与
            if (enemy.enemyType && enemy.enemyType.startsWith(GameConfig.ENEMY_TYPES.SHADOW_PREFIX)) {
                unitDiv.classList.add(UiClasses.SHADOW_AURA);
            }

            const nameDiv = document.createElement('div');
            nameDiv.className = UiClasses.ENEMY_LABEL;
            nameDiv.innerText = enemy.name;

            const infoDiv = document.createElement('div');
            infoDiv.className = UiClasses.ENEMY_INFO;

            const weaknessDiv = document.createElement('div');
            weaknessDiv.className = UiClasses.ENEMY_WEAKNESS;
            weaknessDiv.innerText = this.getWeaknessLabel(enemy.weaknessTag);

            const downDiv = document.createElement('div');
            downDiv.className = UiClasses.ENEMY_DOWN;
            downDiv.innerText = "DOWN";
            downDiv.style.display = enemy.down ? UiStyle.DISPLAY_INLINE_FLEX : UiStyle.DISPLAY_NONE;

            infoDiv.appendChild(weaknessDiv);
            infoDiv.appendChild(downDiv);

            const hpBox = document.createElement('div');
            hpBox.className = UiClasses.ENEMY_HP_CONTAINER;
            
            const hpBar = document.createElement('div');
            hpBar.className = UiClasses.ENEMY_HP_BAR;
            const hpPercent = (enemy.hp / enemy.max_hp) * 100;
            hpBar.style.width = `${hpPercent}%`;

            hpBox.appendChild(hpBar);

            let breakBox = null;
            if (enemy.isBoss && enemy.breakMax) {
                breakBox = document.createElement('div');
                breakBox.className = UiClasses.ENEMY_BREAK_CONTAINER;

                const breakBar = document.createElement('div');
                breakBar.className = UiClasses.ENEMY_BREAK_BAR;
                const breakPercent = (enemy.breakGauge / enemy.breakMax) * 100;
                breakBar.style.width = `${breakPercent}%`;
                breakBox.appendChild(breakBar);
            }

            const img = document.createElement('img');
            img.src = enemy.img || GameConfig.ASSETS.IMAGES.ENEMY_FALLBACK; 
            img.className = UiClasses.ENEMY_IMG;
            img.onerror = () => { img.src = GameConfig.ASSETS.IMAGES.ENEMY_FALLBACK; };
            
            unitDiv.appendChild(nameDiv);
            unitDiv.appendChild(infoDiv);
            unitDiv.appendChild(hpBox);
            if (breakBox) {
                unitDiv.appendChild(breakBox);
            }
            unitDiv.appendChild(img);

            this.enemyContainer.appendChild(unitDiv);
        });
    }

    /**
     * 敵HPゲージ表示を更新する。
     * @param {Array} enemies - 敵一覧。
     * 副作用: DOMを更新する。
     */
    updateEnemyHP(enemies) {
        enemies.forEach((enemy, index) => {
            const hpBar = document.querySelector(
                `#${GameConfig.UI.ID_TEMPLATES.ENEMY_SPRITE.replace('{index}', index)} .${UiClasses.ENEMY_HP_BAR}`
            );
            if (hpBar) {
                const hpPercent = Math.max(GameConfig.UI.LIMITS.MIN_PERCENT, (enemy.hp / enemy.max_hp) * 100);
                hpBar.style.width = `${hpPercent}%`;
            }
            const breakBar = document.querySelector(
                `#${GameConfig.UI.ID_TEMPLATES.ENEMY_SPRITE.replace('{index}', index)} .${UiClasses.ENEMY_BREAK_BAR}`
            );
            if (breakBar && enemy.breakMax) {
                const breakPercent = Math.max(GameConfig.UI.LIMITS.MIN_PERCENT, (enemy.breakGauge / enemy.breakMax) * 100);
                breakBar.style.width = `${breakPercent}%`;
            }
        });
    }
    
    /**
     * 現在の行動者を強調表示する。
     * @param {number|null} actorIndex - 行動者インデックス。
     * 副作用: DOMクラスを更新する。
     */
    highlightActiveMember(actorIndex) {
        for (let i = 0; i < GameConfig.UI.LIMITS.PARTY_SIZE; i++) { 
            const card = document.getElementById(GameConfig.UI.ID_TEMPLATES.CARD.replace('{index}', i));
            if (card) {
                card.classList.remove(UiClasses.ACTIVE_MEMBER);
            }
        }
        if (actorIndex >= 0) {
            const activeCard = document.getElementById(GameConfig.UI.ID_TEMPLATES.CARD.replace('{index}', actorIndex));
            if (activeCard) {
                activeCard.classList.add(UiClasses.ACTIVE_MEMBER);
            }
        }
    }
    
    // レリック置き場を作る
    /**
     * レリック表示欄を初期化する。
     * 副作用: DOM要素を追加する。
     */
    initRelicUI() {
        const canvasArea = document.getElementById(GameConfig.UI.IDS.CANVAS_AREA);
        
        // すでにあったら作らない
        if (document.getElementById(GameConfig.UI.IDS.RELIC_CONTAINER)) return;

        const container = document.createElement('div');
        container.id = GameConfig.UI.IDS.RELIC_CONTAINER;
        // 最初は空なので隠しておくか、そのまま表示しておく
        canvasArea.appendChild(container);
        this.relicContainer = container;
    }

    // レリックリストを受け取って描画更新
    /**
     * レリック表示を更新する。
     * @param {Array} relicIdList - 所持レリックID一覧。
     * 副作用: DOMを更新する。
     */
    updateRelicBar(relicIdList) {
        if (!this.relicContainer) return;
        
        this.relicContainer.innerHTML = ""; 

        if (!relicIdList || relicIdList.length === 0) {
            this.relicContainer.style.display = UiStyle.DISPLAY_NONE;
            return;
        }
        this.relicContainer.style.display = UiStyle.DISPLAY_FLEX;

        relicIdList.forEach(id => {
            const data = RelicData[id];
            if (!data) return;

            const icon = document.createElement('div');
            icon.className = UiClasses.RELIC_ICON;
            // アイコン文字（なければ💎）
            icon.innerText = data.icon || "💎"; 
            icon.title = "{name}\n{desc}"
                .replace('{name}', data.name)
                .replace('{desc}', data.desc);
            
            this.relicContainer.appendChild(icon);
        });
    }
}
