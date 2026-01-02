import { SkillData } from './skills.js';
import { ItemData } from './items.js';

export class UIManager {
    constructor() {
        this.logElement = document.getElementById('log');
        this.commandContainer = document.getElementById('command-container');
        this.turnLabel = document.getElementById('turn-label');
        this.enemyContainer = document.getElementById('enemy-target');
        this.currentActor = null; 
    }

    // ログ出力
    addLog(message, color = "white",isBold = false) {
        const div = document.createElement('div');
        div.style.color = color;
        div.innerHTML = message;
        
        if (isBold) {
            div.style.fontWeight = "bold";
            div.style.fontSize = "15px"; // 太字のときは少し大きく
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
                const canUse = this.currentActor.mp >= skill.cost;
                this._createButton(
                    `${skill.name} (${skill.cost})`,
                    skill.color,
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

        Object.values(ItemData).forEach(item => {
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
    
    showTargetMenu(targets, onSelect, onBack) {
        this.commandContainer.innerHTML = "";
        this.turnLabel.innerText = "対象を選択してください";

        targets.forEach((target, i) => {
            if (target.is_alive()) {
                this._createButton(
                    target.name,
                    target.job ? "#2ecc71" : "#c0392b", 
                    () => onSelect(target)
                );
            }
        });

        this._createButton("戻る", "#222", onBack);
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

    /**
     * 敵のグラフィックを完全に作り直す（初期化や分裂時用）
     */
    refreshEnemyGraphics(enemies) {
        this.enemyContainer.innerHTML = ''; 

        enemies.forEach((enemy, index) => {
            if (!enemy.is_alive()) return; 

            const unitDiv = document.createElement('div');
            unitDiv.className = 'enemy-unit';
            unitDiv.id = `enemy-sprite-${index}`; 

            if (enemy.isKing) {
                unitDiv.classList.add('king-size');
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

    /**
     * 敵のHPバーの長さだけを更新する（エフェクトを消さないため）
     */
    updateEnemyHP(enemies) {
        enemies.forEach((enemy, index) => {
            // 既存の要素を探す
            const hpBar = document.querySelector(`#enemy-sprite-${index} .enemy-hp-bar`);
            if (hpBar) {
                // HP更新
                const hpPercent = Math.max(0, (enemy.hp / enemy.max_hp) * 100);
                hpBar.style.width = `${hpPercent}%`;
                
                // もし死んでいたら、フェードアウト等の処理はEffectManagerに任せるが
                // ここで少し透明度を下げておくなどの処理を入れても良い
                if (!enemy.is_alive()) {
                    // ActionExecutorのenemyDeathで処理されるのでここでは何もしなくてOK
                }
            }
        });
    }
    
    /**
     * 現在の行動者を強調表示する
     * @param {number} actorIndex - 行動者のパーティ内インデックス（0~2）
     * 敵のターンの場合は -1 などを渡して解除する
     */
    highlightActiveMember(actorIndex) {
        // 全員のハイライトを一旦消す
        for (let i = 0; i < 3; i++) { // パーティは最大3人と仮定
            const card = document.getElementById(`card-${i}`);
            if (card) {
                card.classList.remove('active-member');
            }
        }

        // 指定されたインデックスのキャラだけ光らせる
        if (actorIndex >= 0) {
            const activeCard = document.getElementById(`card-${actorIndex}`);
            if (activeCard) {
                activeCard.classList.add('active-member');
            }
        }
    }
}