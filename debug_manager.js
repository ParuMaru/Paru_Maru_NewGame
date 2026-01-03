// debug_manager.js

export class DebugManager {
    constructor(gameInstance) {
        this.game = gameInstance; // 今は GameManager が入ってくる
        this.isVisible = false; 
        this.initUI();
    }

    /**
     * ★追加：現在アクティブなバトルマネージャーを取得する
     * GameManager経由なら .battleManager を、直接なら自分自身を返す
     */
    get bm() {
        return this.game.battleManager || this.game;
    }

    initUI() {
        const gameContainer = document.getElementById('canvas-area') || document.body;
        
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
            zIndex: '99999',
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
            border: '1px solid #444',
            maxHeight: 'calc(100% - 90px)', 
            overflowY: 'auto'
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
        this.createBtn(this.panel, "🩸 味方HP激減 (瀕死)", "#e74c3c", () => this.damageParty());
        this.createBtn(this.panel, "📉 味方MP枯渇 (0)", "#3498db", () => this.emptyMP());
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
            width: '100%',
            marginBottom: '4px'
        });

        btn.onclick = () => {
            console.log(`[DEBUG] Execute: ${text}`);
            btn.style.transform = 'scale(0.95)';
            setTimeout(() => btn.style.transform = 'scale(1)', 100);
            
            onClick();
            this.safeUpdateUI(); 
        };
        
        btn.onmouseover = () => { btn.style.background = color; btn.style.color = '#fff'; };
        btn.onmouseout = () => { btn.style.background = 'transparent'; btn.style.color = color; };

        parent.appendChild(btn);
    }

    safeUpdateUI() {
        // this.bm を使うことで、GameManager経由でも直接でも動くようにする
        if (typeof this.bm.updateUI === 'function') {
            this.bm.updateUI();
            if (this.bm.ui && this.bm.ui.updateEnemyHP) {
                this.bm.ui.updateEnemyHP(this.bm.state.enemies);
            }
        } 
    }

    getParty() {
        // GameManagerなら .party、BattleManagerなら .state.party
        if (this.game.party) return this.game.party;
        return this.game.state ? this.game.state.party : [];
    }
    
    getEnemies() {
        // 敵データは常に BattleState (this.bm.state) にある
        return this.bm.state ? this.bm.state.enemies : [];
    }

    // --- ロジック (this.bm を使用して実行) ---

    fullHeal() {
        this.getParty().forEach(p => {
            if (p.is_alive()) {
                p.add_hp(p.max_hp - p.hp); 
                p.add_mp(p.max_mp - p.mp);
            } else {
                p.revive(p.max_hp);
                p.add_mp(p.max_mp - p.mp);
            }
        });
        if(this.bm.ui) this.bm.ui.addLog("[DEBUG] 全回復しました", "#2ecc71", true);
    }

    damageParty() {
        this.getParty().forEach(p => {
            if (p.is_alive()) {
                const current = p.hp;
                const damage = current - 1;
                p.add_hp(-damage);
            }
        });
        if(this.bm.ui) this.bm.ui.addLog("[DEBUG] 味方が瀕死になった！", "#e74c3c", true);
    }

    emptyMP() {
        this.getParty().forEach(p => {
            if (p.is_alive()) {
                const current = p.mp;
                p.add_mp(-current);
            }
        });
        if(this.bm.ui) this.bm.ui.addLog("[DEBUG] MPが枯渇した！", "#3498db", true);
    }

    killEnemies() {
        this.getEnemies().forEach((e, i) => {
            e.add_hp(-9999);
            
            if(this.bm.effects && this.bm.effects.enemyDeath) {
                this.bm.effects.enemyDeath(`enemy-sprite-${i}`);
            }
        });
        if(this.bm.ui) this.bm.ui.addLog("[DEBUG] 敵を全滅させました", "#e74c3c", true);
        setTimeout(() => this.skipTurn(), 500);
    }

    halfEnemyHP() {
        this.getEnemies().forEach(e => {
            if (e.is_alive()) {
                const current = e.hp;
                const target = Math.floor(e.max_hp / 2);
                if (current > target) {
                    const dmg = current - target;
                    e.add_hp(-dmg);
                }
            }
        });
        if(this.bm.ui) this.bm.ui.addLog("[DEBUG] 敵HPを半分にしました", "#f39c12", true);
        setTimeout(() => this.skipTurn(), 500);
    }

    suicide() {
        this.getParty().forEach(p => {
            p.add_hp(-9999);
        });
        if(this.bm.ui) this.bm.ui.addLog("[DEBUG] 味方が全滅しました", "#95a5a6", true);
        setTimeout(() => this.skipTurn(), 500);
    }
    
    skipTurn() {
        if(this.bm.ui) this.bm.ui.addLog("[DEBUG] ターンを経過させます", "#bdc3c7");
        
        // 処理中フラグを強制解除
        if (this.bm.isProcessing !== undefined) this.bm.isProcessing = false;
        
        if (this.bm.nextTurn) this.bm.nextTurn();
    }
}