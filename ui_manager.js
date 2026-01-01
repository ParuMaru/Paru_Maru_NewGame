import { SkillData } from './skills.js';
import { ItemData } from './items.js';

export class UIManager {
    constructor() {
        this.logElement = document.getElementById('log');
        this.commandContainer = document.getElementById('command-container');
        this.turnLabel = document.getElementById('turn-label');
        this.currentActor = null; // 戻るボタン用に保持
    }

    // ログ出力（V0.13互換）
    addLog(message, color = "white") {
        const div = document.createElement('div');
        div.style.color = color;
        div.innerHTML = message;
        this.logElement.appendChild(div);
        this.logElement.scrollTop = this.logElement.scrollHeight;
    }
    

    /**
     * メインコマンドメニューの表示
     */
    showCommands(actor, onSelect) {
        this.currentActor = actor;
        this.commandContainer.innerHTML = "";
        this.turnLabel.innerText = `▼ ${actor.name} の行動選択`; // ラベルも以前の形式に

        // 1. 攻撃ボタン (赤系: #c0392b)
        this._createButton("攻撃", "#c0392b", () => onSelect({ type: 'attack' }));

        actor.skills.forEach(id => {
            const skill = SkillData[id];
            if (!skill) return;

            // 2. 職業に応じたメインボタンの色
            let btnColor = skill.color;
            if (actor.job === "wizard") btnColor = "#2980b9"; // 魔法使いの魔法 (青)
            if (actor.job === "healer") btnColor = "#27ae60"; // 癒し手の魔法 (緑)

            if (skill.menu === "main") {
                // 瞑想(紫: #9b59b6), いのり(紫: #8e44ad)
                const mainColor = skill.id === "meditation" ? "#9b59b6" : "#8e44ad";
                this._createButton(skill.name, mainColor, () => onSelect({ type: 'skill', detail: skill }));
            } else if (skill.menu === "magic" && !this._hasButton("魔法")) {
                this._createButton("魔法", btnColor, () => this.showSubMenu("magic", onSelect));
            } else if (skill.menu === "skill" && !this._hasButton("スキル")) {
                // 勇者の鼓舞(金: #f1c40f), かばう(水色: #3498db)
                this._createButton("スキル", "#f1c40f", () => this.showSubMenu("skill", onSelect));
            }
    });

        // 3. どうぐボタン (オレンジ系: #d35400)
        this._createButton("どうぐ", "#d35400", () => this.showItemMenu(onSelect));
    }

    /**
     * 魔法・スキルの中身を表示
     */
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

    /**
     * アイテムメニューを表示
     */
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
    
    /**
     * ターゲット選択メニューを表示
     * @param {Array} targets - 選択可能な対象リスト（enemies または party）
     * @param {Function} onSelect - 対象決定時のコールバック
     * @param {Function} onBack - 戻るボタンのコールバック
     */
    showTargetMenu(targets, onSelect, onBack) {
        this.commandContainer.innerHTML = "";
        this.turnLabel.innerText = "対象を選択してください";

        targets.forEach((target, i) => {
            // 生きている対象のみボタンを表示
            if (target.is_alive()) {
                this._createButton(
                    target.name,
                    target.job ? "#2ecc71" : "#c0392b", // 味方は緑、敵は赤
                    () => onSelect(target)
                );
            }
        });

        this._createButton("戻る", "#222", onBack);
    }

    // 内部用：ボタン生成
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

    // 内部用：重複チェック
    _hasButton(text) {
        return Array.from(this.commandContainer.children).some(btn => btn.innerText === text);
    }

    refreshEnemyGraphics(enemies) {
        const stage = document.getElementById('enemy-target');
        if (!stage) return;

        // 一旦ステージを空にして、現在の敵リストに合わせてコンテナを再構築する
        stage.innerHTML = enemies
            .map((enemy, i) => {
                if (enemy.is_alive()) {
                    return enemy.render(i); // 生きている敵のコンテナを生成
                } else {
                    // 死亡時はエフェクト用に透明な場所だけ確保するか、あるいは完全に消す
                    return `<div id="enemy-sprite-${i}" style="display:none;"></div>`;
                }
            })
            .join('');
    }
}
    