// debug_manager.js

export class DebugManager {
    constructor(gameInstance) {
        // GameManager または BattleManager を受け取る
        if (gameInstance.battleManager) {
            this.gameManager = gameInstance;
            this.battleManager = gameInstance.battleManager;
        } else {
            this.battleManager = gameInstance;
            this.gameManager = gameInstance.gameManager;
        }
        
        this.isVisible = false; 
        this.initUI();
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
            top: '20px', right: '20px',
            width: '40px', height: '40px',
            background: 'rgba(0, 0, 0, 0.6)',
            color: '#f1c40f',
            borderRadius: '50%',
            cursor: 'pointer',
            zIndex: '99999',
            display: 'flex', justifyContent: 'center', alignItems: 'center',
            fontSize: '20px',
            border: '2px solid rgba(255, 255, 255, 0.3)',
            boxShadow: '0 2px 5px rgba(0,0,0,0.5)',
            userSelect: 'none',
            transition: 'all 0.2s'
        });

        toggleBtn.onclick = () => {
            this.isVisible = !this.isVisible;
            this.panel.style.display = this.isVisible ? 'flex' : 'none';
            toggleBtn.innerText = this.isVisible ? '×' : '🛠️';
            toggleBtn.style.color = this.isVisible ? '#333' : '#f1c40f';
            toggleBtn.style.background = this.isVisible ? '#f1c40f' : 'rgba(0, 0, 0, 0.6)';
        };
        gameContainer.appendChild(toggleBtn);

        // 2. メインパネル
        this.panel = document.createElement('div');
        Object.assign(this.panel.style, {
            position: 'absolute',
            top: '70px', right: '20px',
            width: '180px', 
            background: 'rgba(0, 0, 0, 0.9)',
            padding: '10px',
            borderRadius: '8px',
            zIndex: '99999',
            display: 'none',
            flexDirection: 'column',
            gap: '5px',
            color: 'white',
            fontSize: '12px',
            fontFamily: 'sans-serif',
            boxShadow: '0 4px 15px rgba(0,0,0,0.8)',
            border: '1px solid #444',
            maxHeight: 'calc(100% - 90px)', 
            overflowY: 'auto'
        });
        
        // --- 基本機能 ---
        this.addTitle("CHEAT");
        this.createBtn("❤️ 全回復", "#2ecc71", () => this.fullHeal());
        this.createBtn("👆 最大HP↑", "#c7db34", () => this.MaxHPup());
        this.createBtn("🩸 味方瀕死", "#e74c3c", () => this.damageParty());
        this.createBtn("💀 敵即死 (勝利)", "#e74c3c", () => this.killEnemies());
        this.createBtn("⚡ 敵瀕死 (HP49%)", "#e74c3c", () => this.weakenEnemies());
        this.createBtn("☠️ 自爆 (敗北)", "#95a5a6", () => this.suicide());
        this.createBtn("⏭️ ターン経過", "#34495e", () => this.skipTurn());

        // --- 戦闘テスト ---
        this.addTitle("BATTLE TEST");
        this.createBtn("⚔️ vs 雑魚戦", "#bdc3c7", () => this.startBattle('cragen'));
        this.createBtn("👑 vs キング", "#f1c40f", () => this.startBattle('king'));
        this.createBtn("👥 vs 影のパーティ", "#8e44ad", () => this.startBattle('shadow'));
        this.createBtn("🧊 vs 氷ドラゴン", "#00d2ff", () => this.startBattle('dragon'));
        
        // --- 階層ワープ ---
        this.addTitle("FLOOR JUMP");
        this.createBtn("🏢 4階へ (キング)", "#f39c12", () => this.jumpToFloor(3));
        this.createBtn("🏢 8階へ (影)", "#8e44ad", () => this.jumpToFloor(7));
        this.createBtn("🏢 9階へ (焚火)", "#8e44ad", () => this.jumpToFloor(8));
        
        // ---システム機能 ---
        this.addTitle("SYSTEM");
        this.createBtn("💾 データ確認", "#3498db", () => this.checkSaveData());
        this.createBtn("🗑️ データ削除", "#c0392b", () => this.deleteSaveData());
        
        gameContainer.appendChild(this.panel);
    }
    
    addTitle(text) {
        const div = document.createElement('div');
        div.innerText = text;
        div.style.fontWeight = 'bold';
        div.style.color = '#bbb';
        div.style.borderBottom = '1px solid #555';
        div.style.marginTop = '10px';
        div.style.marginBottom = '5px';
        div.style.textAlign = 'center';
        this.panel.appendChild(div);
    }

    createBtn(text, color, onClick) {
        const btn = document.createElement('button');
        btn.innerText = text;
        Object.assign(btn.style, {
            cursor: 'pointer',
            fontSize: '11px',
            padding: '6px 8px',
            background: 'transparent',
            color: color,
            border: `1px solid ${color}`,
            borderRadius: '4px',
            textAlign: 'left',
            fontWeight: 'bold',
            width: '100%',
            marginBottom: '2px'
        });

        btn.onclick = () => {
            console.log(`[DEBUG] ${text}`);
            onClick();
            this.safeUpdateUI(); 
        };
        
        btn.onmouseover = () => { btn.style.background = color; btn.style.color = '#fff'; };
        btn.onmouseout = () => { btn.style.background = 'transparent'; btn.style.color = color; };

        this.panel.appendChild(btn);
    }

    safeUpdateUI() {
        if (this.battleManager && typeof this.battleManager.updateUI === 'function') {
            this.battleManager.updateUI();
            if (this.battleManager.ui && this.battleManager.ui.updateEnemyHP) {
                this.battleManager.ui.updateEnemyHP(this.battleManager.state.enemies);
            }
        } 
    }

    // --- ロジック ---

    getParty() {
        return this.battleManager.state.party;
    }
    getEnemies() {
        return this.battleManager.state.enemies;
    }

    fullHeal() {
        this.getParty().forEach(p => {
            p.revive(p.max_hp);
            p.add_mp(p.max_mp);
        });
        this.battleManager.ui.addLog("[DEBUG] 全回復", "#2ecc71", true);
    }

    damageParty() {
        this.getParty().forEach(p => {
            if(p.is_alive()) p.add_hp(1 - p.hp);
        });
        this.battleManager.ui.addLog("[DEBUG] 瀕死", "#e74c3c", true);
        
    }

    MaxHPup() {
        this.getParty().forEach(p => p.max_hp += 50);
        this.battleManager.ui.addLog("[DEBUG] 最大HP50上昇", "#3498db", true);
    }

    killEnemies() {
        this.getEnemies().forEach((e, i) => {
            e.add_hp(-9999);
            if(this.battleManager.effects) this.battleManager.effects.enemyDeath(`enemy-sprite-${i}`);
        });
        setTimeout(() => this.skipTurn(), 500);
    }
    
    weakenEnemies() {
        const enemies = this.getEnemies();
        let affected = false;
        
        enemies.forEach(enemy => {
            if (enemy.is_alive()) {
                // HPを最大値の49%（切り捨て）に設定
                enemy._hp = Math.floor(enemy.max_hp * 0.49);
                affected = true;
            }
        });

        if (affected) {
            this.battleManager.ui.addLog("[DEBUG] 敵HPを49%に設定", "#e74c3c", true);
            // 画面のHPバーなどを即座に更新させるための処理
            // (safeUpdateUIはボタンクリック時に呼ばれるので、ここではログだけでOKですが念のため)
            this.safeUpdateUI();
        }
    }

    suicide() {
        this.getParty().forEach(p => p.add_hp(-9999));
        setTimeout(() => this.skipTurn(), 500);
    }
    
    skipTurn() {
        this.battleManager.isProcessing = false;
        this.battleManager.nextTurn();
    }

    startBattle(type) {
        if (this.gameManager) {
            this.battleManager.ui.addLog(`[DEBUG] 雑魚戦を開始します`, "#fff");
            this.gameManager.startBattle(type);
        } else {
            console.error("GameManagerが見つかりません。");
        }
    }

    // ★追加：階層ワープ
    jumpToFloor(floor) {
        if (this.gameManager && this.gameManager.mapManager) {
            this.gameManager.mapManager.currentFloor = floor;
            // ★重要：強制的に部屋0番にいることにする
            this.gameManager.mapManager.currentNodeIndex = 0;
            
            this.battleManager.ui.addLog(`[DEBUG] ${floor}階へ移動しました`, "#fff");
            alert(`${floor}階へ移動しました！マップ画面に戻ると反映されます。`);
            this.gameManager.showMap();
        }
    }
    
    // ★追加: セーブデータの確認
    checkSaveData() {
        const json = localStorage.getItem('parm_rpg_save');
        if (json) {
            const data = JSON.parse(json);
            
            // コンソールに詳細を出す（開発者ツール F12 で見れます）
            console.log("=== SAVE DATA ===", data);
            
            // 簡易情報をログとアラートに出す
            const floor = data.map.currentFloor + 1; // 0始まりなので+1
            const partyNames = data.party.map(p => `${p.name}(HP${p.hp})`).join(', ');
            
            this.battleManager.ui.addLog(`[DEBUG] データあり: ${floor}階`, "#2ecc71");
            alert(`【保存データあり】\n現在地: ${floor}階\nパーティ: ${partyNames}\n\n※詳細はコンソールを確認してください`);
        } else {
            this.battleManager.ui.addLog("[DEBUG] データなし", "#7f8c8d");
            alert("セーブデータが見つかりません。");
        }
    }

    // ★追加: セーブデータの削除
    deleteSaveData() {
        if (confirm("【警告】\n本当にセーブデータを削除しますか？\nこの操作は取り消せません。")) {
            localStorage.removeItem('parm_rpg_save');
            this.battleManager.ui.addLog("[DEBUG] データを削除しました", "#e74c3c");
            alert("セーブデータを削除しました。");
        }
    }
}