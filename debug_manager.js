// debug_manager.js

export class DebugManager {
    constructor(battleManager) {
        this.game = battleManager;
        this.isVisible = false; // パネルの表示状態
        this.initUI();
    }

    initUI() {
        // 1. 開閉スイッチ（画面左下のアイコン）
        const toggleBtn = document.createElement('div');
        toggleBtn.innerText = '🛠️';
        Object.assign(toggleBtn.style, {
            position: 'fixed',
            bottom: '10px',
            left: '10px',
            width: '40px',
            height: '40px',
            background: '#333',
            color: 'white',
            borderRadius: '50%',
            cursor: 'pointer',
            zIndex: '100000',
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            fontSize: '20px',
            boxShadow: '2px 2px 5px rgba(0,0,0,0.5)',
            userSelect: 'none',
            transition: 'transform 0.2s'
        });

        // クリックでパネルの表示/非表示を切り替え
        toggleBtn.onclick = () => {
            this.isVisible = !this.isVisible;
            this.panel.style.display = this.isVisible ? 'flex' : 'none';
            toggleBtn.style.transform = this.isVisible ? 'rotate(90deg)' : 'rotate(0deg)';
            toggleBtn.style.background = this.isVisible ? '#f1c40f' : '#333';
            toggleBtn.style.color = this.isVisible ? 'black' : 'white';
        };
        document.body.appendChild(toggleBtn);

        // 2. メインパネル（最初は非表示）
        this.panel = document.createElement('div');
        Object.assign(this.panel.style, {
            position: 'fixed',
            bottom: '60px', // ボタンの上に表示
            left: '10px',
            background: 'rgba(0, 0, 0, 0.9)',
            padding: '10px',
            borderRadius: '8px',
            zIndex: '99999',
            display: 'none', // ★デフォルトは隠す
            flexDirection: 'column',
            gap: '8px',
            color: 'white',
            fontSize: '12px',
            fontFamily: 'monospace',
            boxShadow: '0 0 10px rgba(0,0,0,0.5)',
            minWidth: '160px'
        });
        
        const title = document.createElement('div');
        title.innerText = '- DEBUG MENU -';
        title.style.textAlign = 'center';
        title.style.color = '#ccc';
        title.style.marginBottom = '5px';
        this.panel.appendChild(title);

        // ボタンの追加
        this.createBtn(this.panel, "❤️ 味方全回復", () => this.fullHeal());
        this.createBtn(this.panel, "💀 敵即死 (勝利)", () => this.killEnemies());
        this.createBtn(this.panel, "🤏 敵HP半減 (分裂)", () => this.halfEnemyHP());
        this.createBtn(this.panel, "☠️ 自爆 (敗北)", () => this.suicide());
        this.createBtn(this.panel, "⏭️ ターン経過", () => this.skipTurn());

        document.body.appendChild(this.panel);
    }

    createBtn(parent, text, onClick) {
        const btn = document.createElement('button');
        btn.innerText = text;
        Object.assign(btn.style, {
            cursor: 'pointer',
            fontSize: '11px',
            padding: '6px 10px',
            background: '#444',
            color: 'white',
            border: '1px solid #666',
            borderRadius: '4px',
            textAlign: 'left'
        });

        btn.onclick = () => {
            console.log(`[DEBUG] Execute: ${text}`);
            onClick();
            this.game.updateUI();
            if (this.game.ui.updateEnemyHP) {
                this.game.ui.updateEnemyHP(this.game.state.enemies);
            } else {
                this.game.ui.refreshEnemyGraphics(this.game.state.enemies);
            }
        };
        
        btn.onmouseover = () => btn.style.background = '#666';
        btn.onmouseout = () => btn.style.background = '#444';

        parent.appendChild(btn);
    }

    // --- デバッグロジック (HP直接代入エラー修正済み) ---

    fullHeal() {
        this.game.state.party.forEach(p => {
            if (!p.is_alive()) p.revive(p.max_hp);
            else p.add_hp(p.max_hp - p.hp);
            p.add_mp(p.max_mp - p.mp);
        });
        this.game.ui.addLog("[DEBUG] 全回復", "#2ecc71");
    }

    killEnemies() {
        this.game.state.enemies.forEach((e, i) => {
            e.add_hp(-e.hp); // 現在HP分のダメージを与えて0にする
            if(this.game.effects && this.game.effects.enemyDeath) {
                this.game.effects.enemyDeath(`enemy-sprite-${i}`);
            }
        });
        this.game.ui.addLog("[DEBUG] 敵全滅", "#e74c3c");
        setTimeout(() => this.skipTurn(), 500);
    }

    halfEnemyHP() {
        this.game.state.enemies.forEach(e => {
            if (e.is_alive()) {
                const target = Math.floor(e.max_hp / 2);
                e.add_hp(target - e.hp); // 差分でHP調整
            }
        });
        this.game.ui.addLog("[DEBUG] 敵HP半減", "#f1c40f");
        setTimeout(() => this.skipTurn(), 500);
    }

    suicide() {
        this.game.state.party.forEach(p => p.add_hp(-p.hp));
        this.game.ui.addLog("[DEBUG] 味方全滅", "#888");
        setTimeout(() => this.skipTurn(), 500);
    }
    
    skipTurn() {
        this.game.ui.addLog("[DEBUG] ターン強制経過", "#bdc3c7");
        this.game.isProcessing = false;
        this.game.nextTurn();
    }
}