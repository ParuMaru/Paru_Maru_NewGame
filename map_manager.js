import { ItemData } from './items.js';

export class MapManager {
    constructor(gameManager) {
        this.game = gameManager;
        this.container = null;
        this.fountainOverlay = null; 
        this.mapData = []; 
        this.currentFloor = -1; 
        this.currentNodeIndex = -1;
        
        // 全11階層
        this.FLOOR_COUNT = 11; 
        this.NODES_PER_FLOOR = [3, 3, 4, 3, 2, 3, 4, 3, 1, 1, 1]; 
        
        this.initUI();
        this.initFountainUI(); 
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

        // ★追加: セーブボタン
        const saveBtn = document.createElement('button');
        saveBtn.innerText = "記録する";
        Object.assign(saveBtn.style, {
            fontSize: '12px',
            padding: '5px 10px',
            background: '#27ae60',
            border: 'none',
            borderRadius: '4px',
            color: 'white',
            cursor: 'pointer',
            width: 'auto',
            height: 'auto'
        });
        
        saveBtn.onclick = (e) => {
            e.stopPropagation(); // マップのクリック判定を防ぐ
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

    initFountainUI() {
        this.fountainOverlay = document.createElement('div');
        this.fountainOverlay.id = 'fountain-overlay';
        
        this.fountainOverlay.innerHTML = `
            <div class="fountain-box">
                <div class="fountain-icon">⛲</div>
                <div class="fountain-title">怪しい泉</div>
                <div class="fountain-desc">
                    神秘的なオーラを放つ泉がある...<br>
                    一口飲んでみますか？<br>
                    <span style="font-size:12px; color:#bdc3c7;">良いことが起こるかも！？</span>
                </div>
                <div class="fountain-buttons">
                    <button class="fountain-btn btn-drink" id="btn-drink">飲む</button>
                    <button class="fountain-btn btn-leave" id="btn-leave">立ち去る</button>
                </div>
                <div class="fountain-result" id="fountain-result"></div>
            </div>
        `;
        document.body.appendChild(this.fountainOverlay);

        document.getElementById('btn-drink').onclick = () => this.handleDrink();
        document.getElementById('btn-leave').onclick = () => this.closeFountain();
    }

    generateMap() {
        this.mapData = [];
        this.currentFloor = -1;
        this.currentNodeIndex = -1;

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
                    else if (rand < 0.2) { type = 'treasure'; icon = '🎁'; }
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
    
    connectNodes() {
        for (let f = 0; f < this.FLOOR_COUNT - 1; f++) {
            const currentFloor = this.mapData[f];
            const nextFloor = this.mapData[f + 1];

            currentFloor.forEach(node => {
                const ratio = node.index / (currentFloor.length - 1 || 1);
                const nextTargetIndex = Math.round(ratio * (nextFloor.length - 1));
                
                let targetIndex = nextTargetIndex;
                if (Math.random() < 0.4 && nextTargetIndex > 0) targetIndex--;
                else if (Math.random() < 0.4 && nextTargetIndex < nextFloor.length - 1) targetIndex++;
                
                targetIndex = Math.max(0, Math.min(targetIndex, nextFloor.length - 1));
                this._link(node, nextFloor[targetIndex]);
            });

            nextFloor.forEach(nextNode => {
                if (nextNode.children.length === 0) {
                    const ratio = nextNode.index / (nextFloor.length - 1 || 1);
                    const belowIndex = Math.round(ratio * (currentFloor.length - 1));
                    this._link(currentFloor[belowIndex], nextNode);
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
    
    //最新の状態に合わせて画面を作り直す
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
        if (floor < this.currentFloor) return 'cleared'; 
        if (floor === this.currentFloor && index === this.currentNodeIndex) return 'cleared'; 
        
        if (floor === this.currentFloor + 1) {
            if (this.currentFloor === -1) return 'selectable';
            const currentNode = this.mapData[this.currentFloor][this.currentNodeIndex];
            if (currentNode.parents.includes(index)) return 'selectable';
        }
        return 'locked';
    }

    onNodeSelect(node) {
        this.currentFloor = node.floor;
        this.currentNodeIndex = node.index;

        if (node.type === 'battle') {
            const type = Math.random() < 0.6 ? 'slime' : 'goblin';
            this.game.startBattle(type,'normal');
        } 
        else if (node.type === 'elite') {
            if (node.floor === 8) {
                this.game.startBattle('shadow', 'elite'); // 8階は影のパーティ
            } else {
                this.game.startBattle('king', 'elite');   // 4階はキングスライム
            }
        } 
        else if (node.type === 'boss') {
            this.game.startBattle('dragon','boss'); 
        } 
        else if (node.type === 'rest') {
            // ★変更: メッセージを蘇生含む内容に変更
            this.game.showMessage("焚き火で休憩した。全員蘇生＆HP・MPが大きく回復！(80%)");
            
            this.game.party.forEach(p => {
                // 回復量を計算（最大値の8割）
                const healHp = Math.floor(p.max_hp * 0.8);
                const healMp = Math.floor(p.max_mp * 0.8);

                // ★追加: 生死判定をして処理を分ける
                if (!p.is_alive()) {
                    // 死んでいる場合は、HP8割の状態で蘇生させる
                    // (reviveメソッドは entities.js で HP設定と is_dead=false を行う)
                    p.revive(healHp);
                } else {
                    // 生きている場合は、現在HPに加算する
                    p.add_hp(healHp);
                }

                // 蘇生済みなのでMP回復も通る（add_mpは死んでいると効かない仕様のため、蘇生後に呼ぶ）
                p.add_mp(healMp);
                
                // お好みで状態異常も治すならこれを入れる
                if (p.clear_all_buffs) p.clear_all_buffs();
            });
            this.render(); 
        } 
        else if (node.type === 'treasure') {
            const itemKeys = Object.keys(ItemData);
            const randomKey = itemKeys[Math.floor(Math.random() * itemKeys.length)];
            const item = ItemData[randomKey];

            if (!this.game.inventory[randomKey]) {
                this.game.inventory[randomKey] = { ...item, count: 1 };
            } else {
                this.game.inventory[randomKey].count++;
            }
            this.game.showMessage(`宝箱だ！ ${item.name} を手に入れた！`);
            this.render();
        }
        else if (node.type === 'fountain') {
            this.showFountain();
        }
        else {
            this.game.showMessage("何もなかった...");
            this.render();
        }
    }

    showFountain() {
        document.getElementById('fountain-result').innerText = "";
        document.getElementById('fountain-result').className = "fountain-result";
        document.getElementById('btn-drink').style.display = 'inline-block';
        document.getElementById('btn-leave').innerText = "立ち去る";
        
        this.fountainOverlay.style.display = 'flex';
    }

    handleDrink() {
        const resultDiv = document.getElementById('fountain-result');
        const drinkBtn = document.getElementById('btn-drink');
        const leaveBtn = document.getElementById('btn-leave');

        drinkBtn.style.display = 'none';
        leaveBtn.innerText = "戻る";

        if (Math.random() < 0.7) {
            // ★変更：成功時はランダムでステータスアップ
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
                        // 最大値が増えたら現在値も少し回復してあげる
                        if(boost.key === 'max_hp') p.add_hp(boost.val);
                        if(boost.key === 'max_mp') p.add_mp(boost.val);
                    }
                }
            });
            resultDiv.innerText = `✨ 不思議な力が宿る... (${boost.name} +${boost.val})`;
            resultDiv.className = "fountain-result result-good";
        } else {
            // ★変更：失敗時は最大HPの3割ダメージ
            this.game.showMessage("うっ...！ 毒の水だった！(HP30%ダメージ)");
            this.game.party.forEach(p => {
                if(p.is_alive()) {
                    const dmg = Math.floor(p.max_hp * 0.3);
                    p.add_hp(-dmg);
                }
            });
            resultDiv.innerText = "☠️ ぐはっ... 毒だ！ (HP3割減少)";
            resultDiv.className = "fountain-result result-bad";
        }
        
        this.render();
    }

    closeFountain() {
        this.fountainOverlay.style.display = 'none';
        this.render(); 
    }

    drawLines() {
        const svg = this.svgLayer;
        // まずSVG自体の描画領域を確保
        svg.setAttribute('width', this.scrollArea.scrollWidth);
        svg.setAttribute('height', this.scrollArea.scrollHeight);
        
        // SVGの中身をクリア（線が重複して描画されるのを防ぐ）
        while (svg.lastChild) {
            svg.removeChild(svg.lastChild);
        }

        // 見た目の幅(getBoundingClientRect) ÷ 内部的な幅(offsetWidth) = 倍率
        const currentRect = this.container.getBoundingClientRect();
        const scale = currentRect.width ? (currentRect.width / this.container.offsetWidth) : 1.0;
        
        // 基準となるコンテナの位置情報
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
                        
                        // 座標計算時に scale で割って、元の「1.0倍の世界」の座標に戻す
                        // (scrollTop は内部スクロール量なので scale の影響を受けないため、そのまま足す)

                        const x1 = (startRect.left - containerRect.left) / scale + (startRect.width / scale) / 2;
                        const y1 = (startRect.top - containerRect.top) / scale + (startRect.height / scale) / 2 + scrollTop;
                        
                        const x2 = (endRect.left - containerRect.left) / scale + (endRect.width / scale) / 2;
                        const y2 = (endRect.top - containerRect.top) / scale + (endRect.height / scale) / 2 + scrollTop;

                        const line = document.createElementNS("http://www.w3.org/2000/svg", "line");
                        line.setAttribute("x1", x1); 
                        line.setAttribute("y1", y1);
                        line.setAttribute("x2", x2); 
                        line.setAttribute("y2", y2);
                        
                        const isClearedPath = (this.getNodeStatus(node.floor, node.index) === 'cleared' && 
                                               this.getNodeStatus(node.floor + 1, parentIndex) !== 'locked');
                        
                        line.setAttribute("stroke", isClearedPath ? "#2ecc71" : "rgba(255, 255, 255, 0.3)");
                        line.setAttribute("stroke-width", "3");
                        line.setAttribute("stroke-dasharray", "5,5"); 
                        
                        svg.appendChild(line);
                    }
                });
            });
        });
    }
}