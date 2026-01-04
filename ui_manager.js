import { SkillData } from './skills.js';
import { ItemData } from './items.js';

export class UIManager {
    constructor() {
        this.logElement = document.getElementById('log');
        this.commandContainer = document.getElementById('command-container');
        this.turnLabel = document.getElementById('turn-label');
        this.enemyContainer = document.getElementById('enemy-target');
        this.currentActor = null; 
        this.inventory = null;
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

        this._createButton("戻る", "#222", () => this.showCommands(this.currentActor, onSelect));
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

        this._createButton("戻る", "#222", () => this.showCommands(this.currentActor, onSelect));
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

        // --- ボタン生成（従来の方法） ---
        
        targets.forEach((target, i) => {
            this._createButton(
                target.name,
                target.job ? "#2ecc71" : "#c0392b", 
                () => wrappedOnSelect(target)
            );
        });

        this._createButton("戻る", "#222", wrappedOnBack);
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
            
            // DOM要素に敵データを埋め込む（クリック選択用）
            unitDiv._enemyRef = enemy;

            unitDiv.style.gridColumn = index + 1;
            unitDiv.style.gridRow = 1; 

            if (enemy.enemyType === 'ice_dragon') {
                unitDiv.classList.add('dragon-size');
            }
            // それ以外で王様ならキングサイズ
            else if (enemy.isKing) {
                unitDiv.classList.add('king-size');
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
            img.src = enemy.img || './resource/slime.png'; 
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
}