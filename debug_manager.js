// debug_manager.js

export class DebugManager {
    constructor(battleManager) {
        this.game = battleManager;
        this.isVisible = false; 
        this.initUI();
    }

    initUI() {
        // ゲーム画面(canvas-area)の中に配置
        const gameContainer = document.getElementById('canvas-area') || document.body;
        
        // 基準点設定
        if (getComputedStyle(gameContainer).position === 'static') {
            gameContainer.style.position = 'relative';
        }

        // 1. 開閉スイッチ
        const toggleBtn = document.createElement('div');
        toggleBtn.innerText = '🛠️';
        Object.assign(toggleBtn.style, {
            position: 'absolute',
            top: '20px',
            right: '20px',
            width: '40px',
            height: '40px',
            background: 'rgba(0, 0, 0, 0.6)',
            color: '#f1c40f',
            borderRadius: '50%',
            cursor: 'pointer',
            zIndex: '99999', // 最前面に
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            fontSize: '20px',
            border: '2px solid rgba(255, 255, 255, 0.3)',
            boxShadow: '0 2px 5px rgba(0,0,0,0.5)',
            userSelect: 'none',
            transition: 'all 0.2s'
        });

        toggleBtn.onclick = () => {
            this.isVisible = !this.isVisible;
            this.panel.style.display = this.isVisible ? 'flex' : 'none';
            
            if (this.isVisible) {
                toggleBtn.style.background = '#f1c40f';
                toggleBtn.style.color = '#333';
                toggleBtn.style.transform = 'rotate(90deg)';
                toggleBtn.innerText = '×';
            } else {
                toggleBtn.style.background = 'rgba(0, 0, 0, 0.6)';
                toggleBtn.style.color = '#f1c40f';
                toggleBtn.style.transform = 'rotate(0deg)';
                toggleBtn.innerText = '🛠️';
            }
        };
        gameContainer.appendChild(toggleBtn);

        // 2. メインパネル
        this.panel = document.createElement('div');
        Object.assign(this.panel.style, {
            position: 'absolute',
            top: '70px',
            right: '20px',
            width: '160px',
            background: 'rgba(0, 0, 0, 0.9)',
            padding: '10px',
            borderRadius: '8px',
            zIndex: '99999',
            display: 'none',
            flexDirection: 'column',
            gap: '8px',
            color: 'white',
            fontSize: '12px',
            fontFamily: 'sans-serif',
            boxShadow: '0 4px 15px rgba(0,0,0,0.8)',
            border: '1px solid #444'
        });
        
        const title = document.createElement('div');
        title.innerText = 'DEBUG MENU';
        title.style.textAlign = 'center';
        title.style.color = '#7f8c8d';
        title.style.fontWeight = 'bold';
        title.style.borderBottom = '1px solid #555';
        title.style.paddingBottom = '5px';
        title.style.marginBottom = '5px';
        this.panel.appendChild(title);

        this.createBtn(this.panel, "❤️ 全回復", "#2ecc71", () => this.fullHeal());
        this.createBtn(this.panel, "💀 敵即死 (勝利)", "#e74c3c", () => this.killEnemies());
        this.createBtn(this.panel, "🤏 敵HP半減 (分裂)", "#f39c12", () => this.halfEnemyHP());
        this.createBtn(this.panel, "☠️ 自爆 (敗北)", "#95a5a6", () => this.suicide());
        this.createBtn(this.panel, "⏭️ ターン経過", "#34495e", () => this.skipTurn());

        gameContainer.appendChild(this.panel);
    }

    createBtn(parent, text, color, onClick) {
        const btn = document.createElement('button');
        btn.innerText = text;
        Object.assign(btn.style, {
            cursor: 'pointer',
            fontSize: '11px',
            padding: '8px',
            background: 'transparent',
            color: color,
            border: `1px solid ${color}`,
            borderRadius: '4px',
            textAlign: 'left',
            fontWeight: 'bold',
            transition: 'all 0.1s',
            width: '100%'
        });

        btn.onclick = () => {
            console.log(`[DEBUG] Execute: ${text}`);
            btn.style.transform = 'scale(0.95)';
            setTimeout(() => btn.style.transform = 'scale(1)', 100);
            
            onClick();
            this.safeUpdateUI(); // ★ここを安全な更新メソッドに変更
        };
        
        btn.onmouseover = () => { btn.style.background = color; btn.style.color = '#fff'; };
        btn.onmouseout = () => { btn.style.background = 'transparent'; btn.style.color = color; };

        parent.appendChild(btn);
    }

    // ★安全な画面更新メソッド（新旧両対応）
    safeUpdateUI() {
        // 新しい BattleManager (updateUIがある)
        if (typeof this.game.updateUI === 'function') {
            this.game.updateUI();
            if (this.game.ui && this.game.ui.updateEnemyHP) {
                this.game.ui.updateEnemyHP(this.game.state.enemies);
            }
        } 
        // 古い BattleManager (update_displayがある)
        else if (typeof this.game.update_display === 'function') {
            this.game.update_display();
        }
    }

    // --- データの取得ヘルパー ---
    getParty() {
        return this.game.state ? this.game.state.party : this.game.party;
    }
    getEnemies() {
        return this.game.state ? this.game.state.enemies : this.game.enemies;
    }

    // --- ロジック ---

    fullHeal() {
        this.getParty().forEach(p => {
            if (p.is_alive()) {
                // 新旧メソッド対応
                if (p.set_hp) { p.set_hp(p.max_hp); p.set_mp(p.max_mp); }
                else { p.add_hp(p.max_hp - p.hp); p.add_mp(p.max_mp - p.mp); }
            } else {
                p.revive(p.max_hp);
                if (p.set_mp) p.set_mp(p.max_mp);
                else p.add_mp(p.max_mp - p.mp);
            }
        });
        this.game.ui.addLog("[DEBUG] 全回復しました", "#2ecc71", true);
    }

    killEnemies() {
        this.getEnemies().forEach((e, i) => {
            if (e.set_hp) e.set_hp(-9999);
            else e.add_hp(-e.hp);
            
            if(this.game.effects && this.game.effects.enemyDeath) {
                this.game.effects.enemyDeath(`enemy-sprite-${i}`);
            }
        });
        this.game.ui.addLog("[DEBUG] 敵を全滅させました", "#e74c3c", true);
        setTimeout(() => this.skipTurn(), 500);
    }

    halfEnemyHP() {
        this.getEnemies().forEach(e => {
            if (e.is_alive()) {
                const current = e.hp !== undefined ? e.hp : e.get_hp();
                const target = Math.floor(e.max_hp / 2);
                if (current > target) {
                    const dmg = current - target;
                    if (e.set_hp) e.set_hp(-dmg);
                    else e.add_hp(-dmg);
                }
            }
        });
        this.game.ui.addLog("[DEBUG] 敵HPを半分にしました", "#f39c12", true);
        setTimeout(() => this.skipTurn(), 500);
    }

    suicide() {
        this.getParty().forEach(p => {
            if (p.set_hp) p.set_hp(-9999);
            else p.add_hp(-p.hp);
        });
        this.game.ui.addLog("[DEBUG] 味方が全滅しました", "#95a5a6", true);
        setTimeout(() => this.skipTurn(), 500);
    }
    
    skipTurn() {
        this.game.ui.addLog("[DEBUG] ターンを経過させます", "#bdc3c7");
        if (this.game.isProcessing !== undefined) this.game.isProcessing = false;
        
        if (this.game.nextTurn) this.game.nextTurn();
        else if (this.game.finish_turn) this.game.finish_turn();
    }
}