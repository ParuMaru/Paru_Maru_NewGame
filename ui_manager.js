import { SkillData } from './skills.js';
import { ItemData } from './items.js';
import { RelicData } from './relics.js';

export class UIManager {
    constructor() {
        this.logElement = document.getElementById('log');
        this.commandContainer = document.getElementById('command-container');
        this.turnLabel = document.getElementById('turn-label');
        this.enemyContainer = document.getElementById('enemy-target');
        this.currentActor = null; 
        this.inventory = null;
        this.initTurnOrderUI();
        this.initRelicUI();
    }
    
    // ★追加: 画面左に行動順表示エリアを作る
    initTurnOrderUI() {
        // すでにあったら作らない
        if (document.getElementById('turn-order-panel')) return;

        const canvasArea = document.getElementById('canvas-area');
        const panel = document.createElement('div');
        panel.id = 'turn-order-panel';
        
        // ラウンド表示
        const roundInfo = document.createElement('div');
        roundInfo.className = 'round-info';
        roundInfo.id = 'round-info-text';
        roundInfo.innerText = "Round 1";
        panel.appendChild(roundInfo);

        // リスト本体
        const list = document.createElement('div');
        list.id = 'turn-list-container';
        panel.appendChild(list);

        canvasArea.appendChild(panel);
    }

    // ★追加: 行動順とラウンド情報の更新メソッド
    updateTurnOrder(turnQueue, currentRound) {
        const listContainer = document.getElementById('turn-list-container');
        const roundText = document.getElementById('round-info-text');
        
        if (!listContainer) return;

        // ラウンド表示更新
        if (roundText) roundText.innerText = `Round ${currentRound}`;

        listContainer.innerHTML = ""; // 一旦クリア

        // 先頭から最大5人分だけ表示（多すぎると画面が埋まるため）
        const displayLimit = 5;
        const queueToShow = turnQueue.slice(0, displayLimit);

        queueToShow.forEach((chara, index) => {
            if (!chara.is_alive()) return; // 死体は表示しない

            const item = document.createElement('div');
            item.className = 'turn-item';
            
            // 現在の行動者（先頭）
            if (index === 0) {
                item.classList.add('current-turn');
            }

            // 味方か敵かで枠の色を変える
            // entities.jsで job を持っているのが味方、enemyTypeを持ってるのが敵
            if (chara.job) {
                item.classList.add('is-ally');
            } else {
                item.classList.add('is-enemy');
            }

            // 画像
            const img = document.createElement('img');
            // 味方の画像パスがない場合は適当なアイコンを割り当てる想定
            // entities.jsで味方にも img プロパティを持たせるか、ここで分岐が必要です
            // 一旦、Entity基底クラスに img がある前提で書きます
            if (chara.job === 'hero') img.src = './resource/hero_icon.webp'; // 
            else if (chara.job === 'wizard') img.src = './resource/wizard_icon.webp';
            else if (chara.job === 'healer') img.src = './resource/healer_icon.webp';
            else img.src = chara.img || './resource/cragen.webp'; // 敵は持ってるimgを使う

            // ※もし味方の画像を用意していない場合は、job名で分岐して仮画像を出してください
            // img.src が 404 になると見栄えが悪いのでエラーハンドリング
            img.onerror = () => { img.src = './resource/cragen.webp'; };

            // 行動値 (Action Value) バッジ
            const avBadge = document.createElement('div');
            avBadge.className = 'turn-av-badge';
            // 小数点以下は切り捨てて表示
            avBadge.innerText = Math.floor(chara.actionValue);

            item.appendChild(img);
            item.appendChild(avBadge);
            listContainer.appendChild(item);
        });
    }

    setInventory(inventory) {
        this.inventory = inventory;
    }
    // ログ出力
    addLog(message, color = "white",isBold = false){
        const div = document.createElement('div');
        div.style.color = color;
        div.innerHTML = message;
        
        if (isBold) {
            div.style.fontWeight = "bold";
            div.style.fontSize = "15px"; 
        }
        
        this.logElement.appendChild(div);
        this.logElement.scrollTop = this.logElement.scrollHeight;
    }

    showCommands(actor, onSelect) {
        this.currentActor = actor;
        this.commandContainer.innerHTML = "";
        this.turnLabel.innerText = `▼ ${actor.name} の行動選択`; 

        this._createButton("攻撃", "#c0392b", () => onSelect({ type: 'attack' }));

        actor.skills.forEach(id => {
            const skill = SkillData[id];
            if (!skill) return;

            let btnColor = skill.color;
            if (actor.job === "wizard") btnColor = "#2980b9"; 
            if (actor.job === "healer") btnColor = "#27ae60"; 

            if (skill.menu === "main") {
                const mainColor = skill.id === "meditation" ? "#9b59b6" : "#8e44ad";
                this._createButton(skill.name, mainColor, () => onSelect({ type: 'skill', detail: skill }));
            } else if (skill.menu === "magic" && !this._hasButton("魔法")) {
                this._createButton("魔法", btnColor, () => this.showSubMenu("magic", onSelect));
            } else if (skill.menu === "skill" && !this._hasButton("スキル")) {
                this._createButton("スキル", "#f1c40f", () => this.showSubMenu("skill", onSelect));
            }
        });

        this._createButton("どうぐ", "#d35400", () => this.showItemMenu(onSelect));
    }

    showSubMenu(menuType, onSelect) {
        this.commandContainer.innerHTML = "";
        const label = menuType === "magic" ? "魔法" : "スキル";
        this.turnLabel.innerText = `${label}を選択`;

        this.currentActor.skills.forEach(id => {
            const skill = SkillData[id];
            if (skill && skill.menu === menuType) {
                const canUse = (this.currentActor.mp >= skill.cost) || (skill.id === 'raise');
                
                let btnText = `${skill.name} (${skill.cost})`;
                let btnColor = skill.color;
                
                if (skill.id === 'raise' && this.currentActor.mp < skill.cost) {
                    btnText = "命の代償";
                    btnColor = "#e74c3c"; 
                }
                
                this._createButton(
                    btnText,
                    btnColor,
                    () => onSelect({ type: 'skill', detail: skill }),
                    canUse
                );
            }
        });

        this._createButton("戻る", "#574d4d", () => this.showCommands(this.currentActor, onSelect));
    }

    showItemMenu(onSelect) {
        this.commandContainer.innerHTML = "";
        this.turnLabel.innerText = "アイテムを選択";
        
        const items = this.inventory || ItemData;

        Object.values(items).forEach(item => {
            const canUse = item.count > 0;
            this._createButton(
                `${item.name} (${item.count})`,
                item.color,
                () => onSelect({ type: 'item', detail: item }),
                canUse
            );
        });

        this._createButton("戻る", "#574d4d", () => this.showCommands(this.currentActor, onSelect));
    }
    
    /**
     * ターゲット選択メニュー
     * 敵も味方もクリックで選べるように改良
     */
    showTargetMenu(targets, onSelect, onBack) {
        this.commandContainer.innerHTML = "";
        this.turnLabel.innerText = "対象を選択してください";

        // --- クリック選択機能 ---

        // 1. まず変数を定義する（ここが重要！）
        const enemyUnits = document.querySelectorAll('.enemy-unit');
        const memberCards = document.querySelectorAll('.member-card');

        // 2. お掃除関数を定義
        const cleanupClickEvents = () => {
            enemyUnits.forEach(u => {
                u.classList.remove('target-candidate');
                u.onclick = null;
            });
            memberCards.forEach(c => {
                c.classList.remove('target-candidate');
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
                unit.classList.add('target-candidate');
                unit.onclick = () => wrappedOnSelect(unit._enemyRef);
            }
        });

        // 味方キャラ
        memberCards.forEach(card => {
            if (card._memberRef && targets.includes(card._memberRef)) {
                card.classList.add('target-candidate');
                card.onclick = () => wrappedOnSelect(card._memberRef);
            }
        });

        // --- ボタン生成 ---
        
        targets.forEach((target, i) => {
            this._createButton(
                target.name,
                target.job ? "#2ecc71" : "#c0392b", 
                () => wrappedOnSelect(target)
            );
        });

        this._createButton("戻る", "#574d4d", wrappedOnBack);
    }

    _createButton(text, color, action, enabled = true) {
        const btn = document.createElement('button');
        btn.innerText = text;
        btn.className = "command-btn";
        btn.style.backgroundColor = enabled ? color : "#333";
        btn.style.color = enabled ? "white" : "#777";
        btn.disabled = !enabled;
        btn.onclick = action;
        this.commandContainer.appendChild(btn);
    }

    _hasButton(text) {
        return Array.from(this.commandContainer.children).some(btn => btn.innerText === text);
    }

    refreshEnemyGraphics(enemies) {
        this.enemyContainer.innerHTML = ''; 

        Object.assign(this.enemyContainer.style, {
            display: 'grid',
            gridTemplateColumns: `repeat(${enemies.length}, 1fr)`, 
            width: '100%',
            justifyItems: 'center', 
            alignItems: 'end'       
        });

        enemies.forEach((enemy, index) => {
            if (!enemy.is_alive()) return; 

            const unitDiv = document.createElement('div');
            unitDiv.className = 'enemy-unit';
            unitDiv.id = `enemy-sprite-${index}`; 
            
            // enemyオブジェクトが持つフラグに基づきCSSクラスを付与
            if (enemy.isSplitLeft) {
                unitDiv.classList.add('split-pos-left');
            } else if (enemy.isSplitRight) {
                unitDiv.classList.add('split-pos-right');
            }
            
            // DOM要素に敵データを埋め込む（クリック選択用）
            unitDiv._enemyRef = enemy;

            unitDiv.style.gridColumn = index + 1;
            unitDiv.style.gridRow = 1; 

            if (enemy.isBoss) {
                if (enemy.enemyType === 'ice_dragon') {
                    unitDiv.classList.add('dragon-size');
                } else {
                    unitDiv.classList.add('king-size');
                }
            }
            
            //  影シリーズの場合、特別なクラスを付与
            if (enemy.enemyType && enemy.enemyType.startsWith('shadow')) {
                unitDiv.classList.add('shadow-aura');
            }

            const nameDiv = document.createElement('div');
            nameDiv.className = 'enemy-label';
            nameDiv.innerText = enemy.name;

            const hpBox = document.createElement('div');
            hpBox.className = 'enemy-hp-container';
            
            const hpBar = document.createElement('div');
            hpBar.className = 'enemy-hp-bar';
            const hpPercent = (enemy.hp / enemy.max_hp) * 100;
            hpBar.style.width = `${hpPercent}%`;

            hpBox.appendChild(hpBar);

            const img = document.createElement('img');
            img.src = enemy.img || './resource/cragen.webp'; 
            img.className = 'enemy-img';
            
            unitDiv.appendChild(nameDiv);
            unitDiv.appendChild(hpBox);
            unitDiv.appendChild(img);

            this.enemyContainer.appendChild(unitDiv);
        });
    }

    updateEnemyHP(enemies) {
        enemies.forEach((enemy, index) => {
            const hpBar = document.querySelector(`#enemy-sprite-${index} .enemy-hp-bar`);
            if (hpBar) {
                const hpPercent = Math.max(0, (enemy.hp / enemy.max_hp) * 100);
                hpBar.style.width = `${hpPercent}%`;
            }
        });
    }
    
    highlightActiveMember(actorIndex) {
        for (let i = 0; i < 3; i++) { 
            const card = document.getElementById(`card-${i}`);
            if (card) {
                card.classList.remove('active-member');
            }
        }
        if (actorIndex >= 0) {
            const activeCard = document.getElementById(`card-${actorIndex}`);
            if (activeCard) {
                activeCard.classList.add('active-member');
            }
        }
    }
    
    // レリック置き場を作る
    initRelicUI() {
        const canvasArea = document.getElementById('canvas-area');
        
        // すでにあったら作らない
        if (document.getElementById('relic-container')) return;

        const container = document.createElement('div');
        container.id = 'relic-container';
        // 最初は空なので隠しておくか、そのまま表示しておく
        canvasArea.appendChild(container);
        this.relicContainer = container;
    }

    // レリックリストを受け取って描画更新
    updateRelicBar(relicIdList) {
        if (!this.relicContainer) return;
        
        this.relicContainer.innerHTML = ""; 

        if (!relicIdList || relicIdList.length === 0) {
            this.relicContainer.style.display = 'none';
            return;
        }
        this.relicContainer.style.display = 'flex';

        relicIdList.forEach(id => {
            const data = RelicData[id];
            if (!data) return;

            const icon = document.createElement('div');
            icon.className = 'relic-icon';
            // アイコン文字（なければ💎）
            icon.innerText = data.icon || "💎"; 
            icon.title = `${data.name}\n${data.desc}`;
            
            this.relicContainer.appendChild(icon);
        });
    }
}