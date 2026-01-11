import { ItemData } from './items.js';

export class MapManager {
    constructor(gameManager) {
        this.game = gameManager;
        this.container = null;
        this.eventOverlay = null; 
        this.mapData = []; 
        this.currentFloor = -1; 
        this.currentNodeIndex = -1;
        
        this.pathHistory = {}; 
        this.isMoving = false;
        
        // 全11階層
        this.FLOOR_COUNT = 11; 
        this.NODES_PER_FLOOR = [1, 3, 4, 3, 2, 3, 4, 3, 1, 1, 1]; 
        
        this.initUI();
        this.initEventUI(); // 汎用イベント画面の初期化
    }

    initUI() {
        this.container = document.createElement('div');
        this.container.id = 'map-screen';
        
        const header = document.createElement('div');
        header.id = 'map-header';
        
        Object.assign(header.style, {
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            padding: '10px 20px'
        });
        
        const title = document.createElement('div');
        title.innerText = "🗺️ 冒険の地図";
        header.appendChild(title);

        // セーブボタン
        const saveBtn = document.createElement('button');
        saveBtn.innerText = "セーブ";
        Object.assign(saveBtn.style, {
            fontSize: '12px', padding: '5px 10px', background: '#27ae60',
            border: 'none', borderRadius: '4px', color: 'white', cursor: 'pointer',
            width: 'auto', height: 'auto'
        });
        saveBtn.onclick = (e) => {
            e.stopPropagation();
            this.game.saveGame();
        };
        header.appendChild(saveBtn);
        
        this.container.appendChild(header);

        this.scrollArea = document.createElement('div');
        this.scrollArea.id = 'map-scroll-area';
        this.container.appendChild(this.scrollArea);

        this.svgLayer = document.createElementNS("http://www.w3.org/2000/svg", "svg");
        this.svgLayer.id = 'map-lines-svg';
        this.scrollArea.appendChild(this.svgLayer);

        document.body.appendChild(this.container);
    }

    // ★汎用イベントモーダルを作成（泉・宝箱・キャンプ共通）
    initEventUI() {
        if (document.getElementById('event-overlay')) return;

        const overlay = document.createElement('div');
        overlay.id = 'event-overlay';
        
        // オーバーレイのスタイル（画面全体を覆う）
        Object.assign(overlay.style, {
            position: 'fixed', top: 0, left: 0, width: '100%', height: '100%',
            backgroundColor: 'rgba(0, 0, 0, 0.85)',
            display: 'none', flexDirection: 'column',
            justifyContent: 'center', alignItems: 'center',
            zIndex: 2000, color: 'white', backdropFilter: 'blur(2px)'
        });

        // コンテンツボックス
        const content = document.createElement('div');
        content.className = 'fountain-box'; // 既存のCSSクラス(map.css)を流用
        // スタイル微調整（map.cssがない場合用）
        Object.assign(content.style, {
            width: '90%', maxWidth: '400px', padding: '30px',
            background: 'linear-gradient(135deg, #2c3e50, #1a252f)',
            border: '3px solid #3498db', borderRadius: '15px',
            textAlign: 'center', boxShadow: '0 0 30px rgba(52, 152, 219, 0.3)'
        });
        
        this.eventContent = content; // 中身を書き換えるために保存
        overlay.appendChild(content);
        document.body.appendChild(overlay);
        this.eventOverlay = overlay;
    }

    // --- イベント表示用ヘルパー ---
    showEvent({ title, icon, desc, mainBtnText, onMainAction, closeBtnText = "立ち去る" }) {
        this.eventContent.innerHTML = "";

        // アイコン
        const iconDiv = document.createElement('div');
        iconDiv.innerText = icon;
        iconDiv.style.fontSize = "60px";
        iconDiv.style.marginBottom = "20px";
        this.eventContent.appendChild(iconDiv);

        // タイトル
        const titleDiv = document.createElement('div');
        titleDiv.innerText = title;
        titleDiv.style.fontSize = "24px";
        titleDiv.style.fontWeight = "bold";
        titleDiv.style.color = "#3498db";
        titleDiv.style.marginBottom = "15px";
        this.eventContent.appendChild(titleDiv);

        // 説明文
        const descDiv = document.createElement('div');
        descDiv.innerHTML = desc;
        descDiv.style.fontSize = "14px";
        descDiv.style.lineHeight = "1.6";
        descDiv.style.marginBottom = "30px";
        descDiv.style.color = "#ecf0f1";
        this.eventContent.appendChild(descDiv);

        // 結果表示エリア（最初は空）
        const resultDiv = document.createElement('div');
        resultDiv.id = 'event-result';
        resultDiv.style.marginBottom = "20px";
        resultDiv.style.minHeight = "24px";
        resultDiv.style.fontWeight = "bold";
        this.eventContent.appendChild(resultDiv);

        // ボタンエリア
        const btnArea = document.createElement('div');
        btnArea.style.display = "flex";
        btnArea.style.justifyContent = "center";
        btnArea.style.gap = "15px";

        // メインボタン（飲む、開ける、休む）
        if (onMainAction) {
            const mainBtn = document.createElement('button');
            mainBtn.innerText = mainBtnText;
            mainBtn.className = "fountain-btn btn-drink"; // map.css流用
            mainBtn.onclick = () => {
                // ボタンを隠してアクション実行
                mainBtn.style.display = 'none';
                closeBtn.innerText = "戻る";
                onMainAction(resultDiv); // 結果表示エリアを渡す
            };
            btnArea.appendChild(mainBtn);
        }

        // 閉じるボタン
        const closeBtn = document.createElement('button');
        closeBtn.innerText = closeBtnText;
        closeBtn.className = "fountain-btn btn-leave"; // map.css流用
        closeBtn.onclick = () => {
            this.eventOverlay.style.display = 'none';
            this.render(); // マップ再描画
        };
        btnArea.appendChild(closeBtn);

        this.eventContent.appendChild(btnArea);
        this.eventOverlay.style.display = 'flex';
    }

    // ====================================================
    //  各マス選択時の処理
    // ====================================================

    onNodeSelect(node) {
        // ★追加: 移動処理中なら何もしない（連打防止）
        if (this.isMoving) return;
        this.isMoving = true;
        
        this.currentFloor = node.floor;
        this.currentNodeIndex = node.index;
        this.pathHistory[node.floor] = node.index;
        this.render();

        // 300ms待ってからイベント開始（移動アニメーション用）
        setTimeout(() => {
            if (node.type === 'battle') {
                const type = Math.random() < 0.6 ? 'cragen' : 'goblin';
                this.game.startBattle(type, 'normal');
            } 
            else if (node.type === 'elite') {
                if (node.floor === 8) this.game.startBattle('shadow', 'elite'); 
                else this.game.startBattle('king', 'elite');
            } 
            else if (node.type === 'boss') {
                this.game.startBattle('dragon', 'boss'); 
            }
            // ★変更: 宝箱イベント
            else if (node.type === 'treasure') {
                this.showChestEvent();
            }
            // ★変更: 休憩イベント
            else if (node.type === 'rest') {
                if (node.floor === 9) {
                    // 9階の特別会話イベント
                    this.game.startCampfireEvent(() => {
                        this._processRest("決戦に備え、魂まで安らぐ休息をとった。\n全員完全回復！");
                    });
                } else {
                    // 通常の休憩所（汎用UI使用）
                    this.showCampEvent();
                }
            }
            // ★変更: 泉イベント（ロジックは維持）
            else if (node.type === 'fountain') {
                this.showFountainEvent();
            }
            else {
                this.game.showMessage("何もなかった...");
            }
            // ★追加: 処理が終わったら（画面遷移したりイベントが出たりしたら）ロック解除
            this.isMoving = false;
        }, 300);
    }

    // --- 宝箱イベント（強化版） ---
    showChestEvent() {
        this.showEvent({
            title: "宝箱を発見！",
            icon: "🎁",
            desc: "ダンジョンの隅に古びた宝箱が置かれている。<br>中身は何だろうか？",
            mainBtnText: "開ける",
            onMainAction: (resultDiv) => {
                // ★報酬強化ロジック
                // 1. ポーション (2~3個)
                const potionCount = Math.floor(Math.random() * 2) + 2;
                // 2. エーテル (1~2個)
                const etherCount = Math.floor(Math.random() * 2) + 1;
                
                const items = [
                    { id: 'potion', count: potionCount },
                    { id: 'ether', count: etherCount }
                ];

                // 3. レア枠 (10%でフェニックスの尾)
                if (Math.random() < 0.1) {
                    items.push({ id: 'phoenix', count: 1 });
                }

                // インベントリに追加
                let msg = "";
                items.forEach(item => {
                    if (this.game.inventory[item.id]) {
                        this.game.inventory[item.id].count += item.count;
                    } else if (ItemData[item.id]) {
                        this.game.inventory[item.id] = { ...ItemData[item.id], count: item.count };
                    }
                    
                    if (ItemData[item.id]) {
                        msg += `<div>${ItemData[item.id].name} x${item.count}</div>`;
                    }
                });

                resultDiv.innerHTML = `<span style="color:#f1c40f;">${msg}</span> を手に入れた！`;
                this.game.showMessage("アイテムを獲得しました！");
            }
        });
    }

    // --- 休憩イベント（演出強化） ---
    showCampEvent() {
        this.showEvent({
            title: "安らぎの焚き火",
            icon: "🔥",
            desc: "安全な場所を見つけた。<br>焚き火を囲んで休息すれば、<br>体力と魔力を全回復できそうだ。",
            mainBtnText: "休息する",
            onMainAction: (resultDiv) => {
                // 全回復処理
                this.game.party.forEach(p => {
                    p.revive(p.max_hp);
                    p.add_hp(p.max_hp);
                    p.add_mp(p.max_mp);
                    if(p.clear_all_buffs) p.clear_all_buffs();
                });

                resultDiv.innerHTML = `<span style="color:#2ecc71;">パーティ全員が全回復しました！</span>`;
                this.game.showMessage("体力が全回復した！");
            }
        });
    }

    // --- 泉イベント（ロジックは元のまま移植） ---
    showFountainEvent() {
        this.showEvent({
            title: "不思議な泉",
            icon: "⛲",
            desc: "神秘的なオーラを放つ泉がある...<br>一口飲んでみますか？<br><span style='font-size:12px; color:#bdc3c7;'>良いことが起こるかも！？</span>",
            mainBtnText: "飲む",
            onMainAction: (resultDiv) => {
                
                // ★ここです！元のロジックをそのまま適用しています
                if (Math.random() < 0.8) {
                    // 80%でステータスアップ
                    const stats = [
                        { key: 'max_hp', name: '最大HP', val: 50 },
                        { key: 'max_mp', name: '最大MP', val: 50 },
                        { key: 'atk',    name: '攻撃力', val: 5 },
                        { key: 'def',    name: '防御力', val: 5 },
                        { key: 'matk',   name: '魔力',   val: 5 },
                    ];
                    const boost = stats[Math.floor(Math.random() * stats.length)];

                    this.game.showMessage(`泉の力で、全員の${boost.name}が ${boost.val} 上がった！`);
                    
                    this.game.party.forEach(p => {
                        if(p.is_alive()) { 
                            if(typeof p[boost.key] !== 'undefined') {
                                p[boost.key] += boost.val;
                                // 最大値が増えたら現在値も回復
                                if(boost.key === 'max_hp') p.add_hp(boost.val);
                                if(boost.key === 'max_mp') p.add_mp(boost.val);
                            }
                        }
                    });
                    resultDiv.innerHTML = `✨ 不思議な力が宿る... <br>(${boost.name} +${boost.val})`;
                    resultDiv.className = "result-good"; // map.cssのスタイル適用
                } else {
                    // 20%で毒（ダメージ）
                    this.game.showMessage("うっ...！ 毒の水だった！(HP30%ダメージ)");
                    this.game.party.forEach(p => {
                        if(p.is_alive()) {
                            const dmg = Math.floor(p.max_hp * 0.3);
                            p.add_hp(-dmg);
                        }
                    });
                    resultDiv.innerHTML = "☠️ ぐはっ... 毒だ！ <br>(HP3割減少)";
                    resultDiv.className = "result-bad";
                }
            }
        });
    }

    // 9階の特別イベントなどからの復帰用
    _processRest(message) {
        this.game.showMessage(message);
        this.game.party.forEach(p => {
            p.revive(p.max_hp);
            p.add_hp(p.max_hp);
            p.add_mp(p.max_mp);
            if(p.clear_all_buffs) p.clear_all_buffs();
        });
        this.game.showMap(); 
        this.render(); 
    }

    // --- マップ生成・描画（変更なし） ---
    
    generateMap() {
        this.mapData = [];
        this.currentFloor = -1;
        this.currentNodeIndex = -1;
        this.pathHistory = {}; 

        for (let f = 0; f < this.FLOOR_COUNT; f++) {
            const floorNodes = [];
            const count = this.NODES_PER_FLOOR[f] || 3;
            
            for (let i = 0; i < count; i++) {
                let type = 'battle';
                let icon = '⚔️';
                
                if (f === 10) { type = 'boss'; icon = '🏰'; }
                else if (f === 9) { type = 'rest'; icon = '⛺'; }
                else if (f === 4) { type = 'elite'; icon = '💀'; }
                else if (f === 8) { type = 'elite'; icon = '💀'; }
                else if (f === 0) { type = 'battle'; icon = '⚔️'; }
                else {
                    const rand = Math.random();
                    if (rand < 0.1) { type = 'rest'; icon = '⛺'; }
                    else if (rand < 0.2) { type = 'treasure'; icon = '🎁'; } // icon変更
                    else if (rand < 0.3) { type = 'fountain'; icon = '⛲'; }
                    else { type = 'battle'; icon = '⚔️'; }
                }

                floorNodes.push({
                    floor: f, index: i, type: type, icon: icon, parents: [], children: []
                });
            }
            this.mapData.push(floorNodes);
        }
        this.connectNodes();
    }
    
    // 距離判定ヘルパー
    isNatural(nodeIndex, nodeCount, targetIndex, targetCount) {
        if (nodeCount <= 1 || targetCount <= 1) return true;
        const posA = nodeIndex / (nodeCount - 1);
        const posB = targetIndex / (targetCount - 1);
        return Math.abs(posA - posB) <= 0.35;
    }

    connectNodes() {
        for (let f = 0; f < this.FLOOR_COUNT - 1; f++) {
            const currentFloor = this.mapData[f];
            const nextFloor = this.mapData[f + 1];

            currentFloor.forEach(node => {
                let candidates = nextFloor.filter(nextNode => {
                    return this.isNatural(
                        node.index, currentFloor.length, 
                        nextNode.index, nextFloor.length
                    );
                });

                if (candidates.length === 0) {
                    const myPos = node.index / (currentFloor.length - 1 || 1);
                    const closest = nextFloor.reduce((prev, curr) => {
                        const prevPos = prev.index / (nextFloor.length - 1 || 1);
                        const currPos = curr.index / (nextFloor.length - 1 || 1);
                        return (Math.abs(myPos - currPos) < Math.abs(myPos - prevPos)) ? curr : prev;
                    });
                    candidates = [closest];
                }

                const target1 = candidates[Math.floor(Math.random() * candidates.length)];
                this._link(node, target1);
                
                if (candidates.length > 1 && Math.random() < 0.3) {
                    const remaining = candidates.filter(c => c !== target1);
                    if (remaining.length > 0) {
                        const target2 = remaining[Math.floor(Math.random() * remaining.length)];
                        this._link(node, target2);
                    }
                }
            });

            nextFloor.forEach(nextNode => {
                if (nextNode.children.length === 0) {
                    const myPos = nextNode.index / (nextFloor.length - 1 || 1);
                    const closestParent = currentFloor.reduce((prev, curr) => {
                        const prevPos = prev.index / (currentFloor.length - 1 || 1);
                        const currPos = curr.index / (currentFloor.length - 1 || 1);
                        return (Math.abs(myPos - currPos) < Math.abs(myPos - prevPos)) ? curr : prev;
                    });
                    this._link(closestParent, nextNode);
                }
            });
        }
    }

    _link(lowerNode, upperNode) {
        if (!lowerNode.parents.includes(upperNode.index)) {
            lowerNode.parents.push(upperNode.index);
            upperNode.children.push(lowerNode.index);
        }
    }
    
    // ★メソッド名は render() のまま（GameManagerからの呼び出しに対応）
    render() {
        if (this.mapData.length === 0) this.generateMap();

        this.scrollArea.innerHTML = '';
        this.scrollArea.appendChild(this.svgLayer);
        this.svgLayer.innerHTML = ''; 

        for (let f = this.mapData.length - 1; f >= 0; f--) {
            const floorNodes = this.mapData[f];
            const floorDiv = document.createElement('div');
            floorDiv.className = 'map-floor';
            floorDiv.id = `floor-${f}`;

            floorNodes.forEach((node) => {
                const nodeDiv = document.createElement('div');
                nodeDiv.className = 'map-node';
                nodeDiv.id = `node-${node.floor}-${node.index}`;
                nodeDiv.innerText = node.icon;
                
                const status = this.getNodeStatus(node.floor, node.index);
                if (status === 'selectable') {
                    nodeDiv.classList.add('node-selectable');
                    nodeDiv.onclick = () => this.onNodeSelect(node);
                } else if (status === 'cleared') {
                    nodeDiv.classList.add('node-cleared');
                } else {
                    nodeDiv.classList.add('node-locked');
                }

                if (node.type === 'boss') nodeDiv.classList.add('node-boss');
                floorDiv.appendChild(nodeDiv);
            });
            this.scrollArea.appendChild(floorDiv);
        }

        setTimeout(() => this.drawLines(), 50);
        
        setTimeout(() => {
            const currentEl = document.getElementById(`floor-${Math.max(0, this.currentFloor)}`);
            if (currentEl && this.currentFloor > 0) {
                currentEl.scrollIntoView({ behavior: "smooth", block: "center" });
            } else {
                this.scrollArea.scrollTop = this.scrollArea.scrollHeight;
            }
        }, 100);
    }

    getNodeStatus(floor, index) {
        if (floor < this.currentFloor) {
            if (this.pathHistory[floor] === index) return 'cleared';
            return 'locked'; 
        }
        if (floor === this.currentFloor && index === this.currentNodeIndex) return 'cleared'; 
        if (floor === this.currentFloor + 1) {
            if (this.currentFloor === -1) return 'selectable';
            const currentNode = this.mapData[this.currentFloor][this.currentNodeIndex];
            if (currentNode.parents.includes(index)) return 'selectable';
        }
        return 'locked';
    }

    drawLines() {
        const svg = this.svgLayer;
        svg.setAttribute('width', this.scrollArea.scrollWidth);
        svg.setAttribute('height', this.scrollArea.scrollHeight);
        
        while (svg.lastChild) svg.removeChild(svg.lastChild);

        const currentRect = this.container.getBoundingClientRect();
        const scale = currentRect.width ? (currentRect.width / this.container.offsetWidth) : 1.0;
        const containerRect = this.scrollArea.getBoundingClientRect();
        const scrollTop = this.scrollArea.scrollTop;

        this.mapData.forEach(floorNodes => {
            floorNodes.forEach(node => {
                node.parents.forEach(parentIndex => {
                    const startEl = document.getElementById(`node-${node.floor}-${node.index}`);
                    const endEl = document.getElementById(`node-${node.floor + 1}-${parentIndex}`);
                    
                    if (startEl && endEl) {
                        const startRect = startEl.getBoundingClientRect();
                        const endRect = endEl.getBoundingClientRect();
                        
                        const x1 = (startRect.left - containerRect.left) / scale + (startRect.width / scale) / 2;
                        const y1 = (startRect.top - containerRect.top) / scale + (startRect.height / scale) / 2 + scrollTop;
                        const x2 = (endRect.left - containerRect.left) / scale + (endRect.width / scale) / 2;
                        const y2 = (endRect.top - containerRect.top) / scale + (endRect.height / scale) / 2 + scrollTop;

                        const line = document.createElementNS("http://www.w3.org/2000/svg", "line");
                        line.setAttribute("x1", x1); 
                        line.setAttribute("y1", y1);
                        line.setAttribute("x2", x2); 
                        line.setAttribute("y2", y2);
                        
                        const isHistoryPath = (this.pathHistory[node.floor] === node.index) && 
                                              (this.pathHistory[node.floor + 1] === parentIndex);

                        if (isHistoryPath) {
                            line.setAttribute("stroke", "#f1c40f"); 
                            line.setAttribute("stroke-width", "5"); 
                        } else {
                            line.setAttribute("stroke", "rgba(255, 255, 255, 0.8)");
                            line.setAttribute("stroke-width", "3");
                            line.setAttribute("stroke-dasharray", "10,5"); 
                        }
                        svg.appendChild(line);
                    }
                });
            });
        });
    }
}