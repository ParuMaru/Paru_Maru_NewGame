export class MapManager {
    constructor(gameManager) {
        this.game = gameManager;
        this.container = null;
        this.mapData = []; 
        this.currentFloor = -1; 
        this.currentNodeIndex = -1;
        this.FLOOR_COUNT = 10; 
        this.NODES_PER_FLOOR = [3, 4, 4, 3, 2, 3, 4, 3, 2, 1]; 
        
        this.initUI();
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

    generateMap() {
        this.mapData = [];
        this.currentFloor = -1;
        this.currentNodeIndex = -1;

        for (let f = 0; f < this.FLOOR_COUNT; f++) {
            const floorNodes = [];
            const count = (f === this.FLOOR_COUNT - 1) ? 1 : this.NODES_PER_FLOOR[f] || 3;
            
            for (let i = 0; i < count; i++) {
                let type = 'battle';
                let icon = '⚔️';
                
                if (f === this.FLOOR_COUNT - 1) {
                    type = 'boss'; icon = '👿';
                } 
                else if (f > 0) {
                    const rand = Math.random();
                    if (rand < 0.15) { type = 'rest'; icon = '⛺'; }
                    else if (rand < 0.3) { type = 'elite'; icon = '🔥'; }
                    else if (rand < 0.45) { type = 'event'; icon = '❓'; }
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

        this.mapData.forEach((floorNodes, fIndex) => {
            const floorDiv = document.createElement('div');
            floorDiv.className = 'map-floor';
            floorDiv.id = `floor-${fIndex}`;

            floorNodes.forEach((node, nIndex) => {
                const nodeDiv = document.createElement('div');
                nodeDiv.className = 'map-node';
                nodeDiv.id = `node-${fIndex}-${nIndex}`;
                nodeDiv.innerText = node.icon;
                
                const status = this.getNodeStatus(fIndex, nIndex);
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
        });

        setTimeout(() => this.drawLines(), 50);
        setTimeout(() => {
            const currentEl = document.getElementById(`floor-${Math.max(0, this.currentFloor)}`);
            if (currentEl) currentEl.scrollIntoView({ behavior: "smooth", block: "center" });
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
            this.game.startBattle('slime');
        } else if (node.type === 'elite') {
            this.game.startBattle('king'); 
        } else if (node.type === 'boss') {
            this.game.startBattle('king'); 
        } else if (node.type === 'rest') {
            // ★変更：alert -> showMessage
            this.game.showMessage("焚き火で休憩した。HPが50回復！");
            this.game.party.forEach(p => p.add_hp(50));
            this.render(); 
        } else {
            // ★変更
            this.game.showMessage("何もなかった...");
            this.render();
        }
    }

    drawLines() {
        const svg = this.svgLayer;
        const rect = this.scrollArea.getBoundingClientRect();
        
        svg.setAttribute('width', this.scrollArea.scrollWidth);
        svg.setAttribute('height', this.scrollArea.scrollHeight);

        this.mapData.forEach(floorNodes => {
            floorNodes.forEach(node => {
                node.parents.forEach(parentIndex => {
                    const startEl = document.getElementById(`node-${node.floor}-${node.index}`);
                    const endEl = document.getElementById(`node-${node.floor + 1}-${parentIndex}`);
                    
                    if (startEl && endEl) {
                        const startRect = startEl.getBoundingClientRect();
                        const endRect = endEl.getBoundingClientRect();

                        const x1 = startRect.left - rect.left + startRect.width / 2;
                        const y1 = startRect.top - rect.top + startRect.height / 2 + this.scrollArea.scrollTop;
                        const x2 = endRect.left - rect.left + endRect.width / 2;
                        const y2 = endRect.top - rect.top + endRect.height / 2 + this.scrollArea.scrollTop;

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