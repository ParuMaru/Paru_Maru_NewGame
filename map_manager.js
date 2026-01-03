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
        this.NODES_PER_FLOOR = [3, 3, 4, 3, 2, 3, 4, 3, 2, 1, 1]; 
        
        this.initUI();
        this.initFountainUI(); 
    }

    initUI() {
        this.container = document.createElement('div');
        this.container.id = 'map-screen';
        
        const header = document.createElement('div');
        header.id = 'map-header';
        header.innerText = "🗺️ 冒険の地図";
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
                    <span style="font-size:12px; color:#bdc3c7;">(50%でステータスUP / 50%でHP減少)</span>
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
                
                if (f === 10) { type = 'boss'; icon = '👿'; }
                else if (f === 9) { type = 'rest'; icon = '⛺'; }
                else if (f === 4 || f === 8) { type = 'elite'; icon = '🔥'; }
                else if (f === 0) { type = 'battle'; icon = '⚔️'; }
                else {
                    const rand = Math.random();
                    if (rand < 0.15) { type = 'rest'; icon = '⛺'; }
                    else if (rand < 0.35) { type = 'treasure'; icon = '🎁'; }
                    else if (rand < 0.50) { type = 'fountain'; icon = '⛲'; }
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
            this.game.startBattle(type);
        } 
        else if (node.type === 'elite') {
            const type = 'king' ; 
            this.game.startBattle(type); 
        } 
        else if (node.type === 'boss') {
            this.game.startBattle('dragon'); 
        } 
        else if (node.type === 'rest') {
            // ★変更：HP・MPを8割回復
            this.game.showMessage("焚き火で休憩した。HP・MPが大きく回復！(80%)");
            this.game.party.forEach(p => {
                if(p.is_alive()) {
                    p.add_hp(Math.floor(p.max_hp * 0.8));
                    p.add_mp(Math.floor(p.max_mp * 0.8));
                }
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

        if (Math.random() < 0.5) {
            // ★変更：成功時はランダムでステータスアップ
            const stats = [
                { key: 'max_hp', name: '最大HP', val: 20 },
                { key: 'max_mp', name: '最大MP', val: 10 },
                { key: 'atk',    name: '攻撃力', val: 3 },
                { key: 'def',    name: '防御力', val: 3 },
                { key: 'matk',   name: '魔力',   val: 3 },
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
        svg.setAttribute('width', this.scrollArea.scrollWidth);
        svg.setAttribute('height', this.scrollArea.scrollHeight);

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
                        
                        const x1 = startRect.left - containerRect.left + startRect.width / 2;
                        const y1 = startRect.top - containerRect.top + startRect.height / 2 + scrollTop;
                        const x2 = endRect.left - containerRect.left + endRect.width / 2;
                        const y2 = endRect.top - containerRect.top + endRect.height / 2 + scrollTop;

                        const line = document.createElementNS("http://www.w3.org/2000/svg", "line");
                        line.setAttribute("x1", x1); line.setAttribute("y1", y1);
                        line.setAttribute("x2", x2); line.setAttribute("y2", y2);
                        
                        const isClearedPath = (this.getNodeStatus(node.floor, node.index) === 'cleared' && 
                                               this.getNodeStatus(node.floor + 1, parentIndex) !== 'locked');
                        
                        line.setAttribute("stroke", isClearedPath ? "#2ecc71" : "#555");
                        line.setAttribute("stroke-width", "3");
                        line.setAttribute("stroke-dasharray", "5,5"); 
                        svg.appendChild(line);
                    }
                });
            });
        });
    }
}