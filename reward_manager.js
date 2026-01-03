import { ItemData } from './items.js';

export class RewardManager {
    constructor(gameManager) {
        this.game = gameManager;
        this.container = null;
        this.cardArea = null;
        this.initUI();
    }

    initUI() {
        this.container = document.createElement('div');
        this.container.id = 'reward-screen';
        
        const header = document.createElement('h2');
        header.innerText = "BATTLE WON!";
        header.className = 'reward-title';
        this.container.appendChild(header);

        const sub = document.createElement('p');
        sub.innerText = "報酬を1つ選んでください";
        sub.style.color = "#bdc3c7";
        this.container.appendChild(sub);

        this.cardArea = document.createElement('div');
        this.cardArea.className = 'reward-card-container';
        this.container.appendChild(this.cardArea);

        document.body.appendChild(this.container);
    }

    showRewards() {
        this.cardArea.innerHTML = ""; 
        this.container.style.display = 'flex'; 

        const rewards = this.generateRandomRewards();
        rewards.forEach(reward => {
            this.createCard(reward);
        });
    }

    generateRandomRewards() {
        const list = [];
        
        const itemKeys = Object.keys(ItemData);
        if (itemKeys.length > 0) {
            const randomKey = itemKeys[Math.floor(Math.random() * itemKeys.length)];
            const item = ItemData[randomKey];
            list.push({
                type: 'item',
                icon: '🎒',
                title: `アイテム: ${item.name}`,
                desc: item.desc,
                data: randomKey
            });
        }

        list.push({
            type: 'stats',
            icon: '⚔️',
            title: 'パワーアップ',
            desc: '全員の攻撃力(ATK)が +3 上昇する',
            data: { stat: 'atk', value: 3 }
        });

        list.push({
            type: 'stats',
            icon: '💖',
            title: 'バイタルアップ',
            desc: '全員の最大HPが +20 上昇し、回復する',
            data: { stat: 'max_hp', value: 20 }
        });

        return list;
    }

    createCard(reward) {
        const card = document.createElement('div');
        card.className = 'reward-card';
        
        card.innerHTML = `
            <div class="reward-icon">${reward.icon}</div>
            <div class="reward-name">${reward.title}</div>
            <div class="reward-desc">${reward.desc}</div>
        `;

        card.onclick = () => {
            try {
                this.applyReward(reward);
            } catch (e) {
                console.error("報酬適用エラー:", e);
                this.game.showMessage("報酬の受け取りに失敗しました");
            } finally {
                if (this.game && typeof this.game.onRewardSelected === 'function') {
                    this.game.onRewardSelected();
                } else {
                    this.hide();
                    if(this.game.showMap) this.game.showMap();
                }
            }
        };

        this.cardArea.appendChild(card);
    }

    applyReward(reward) {
        if (reward.type === 'item') {
            const key = reward.data;
            if (!this.game.inventory) this.game.inventory = {};
            
            if (this.game.inventory[key]) {
                this.game.inventory[key].count++;
            } else {
                this.game.inventory[key] = { ...ItemData[key], count: 1 };
            }
            // alert -> showMessage
            this.game.showMessage(`${ItemData[key].name} を手に入れた！`);
        } 
        else if (reward.type === 'stats') {
            const { stat, value } = reward.data;
            this.game.party.forEach(member => {
                if (stat === 'atk') member.atk += value;
                if (stat === 'max_hp') {
                    member.max_hp += value;
                    member.add_hp(value); 
                }
            });
            this.game.showMessage(`パーティ全員のステータスが上がった！`);
        }
    }

    hide() {
        this.container.style.display = 'none';
    }
}