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

    hide() {
        this.container.style.display = 'none';
    }

    /**
     * ★強化版：報酬生成ロジック
     */
    generateRandomRewards() {
        const list = [];
        // 必ず3つの選択肢を提示
        for(let i=0; i<3; i++) {
            const rand = Math.random();
            
            // A. 20%で「野営（全回復）」が出る（超重要）
            if (rand < 0.20) {
                list.push({
                    type: 'rest',
                    icon: '⛺',
                    name: '野営する',
                    desc: 'パーティ全員のHP・MPを全回復し、戦闘不能も復活させる。',
                    color: '#2ecc71'
                });
            }
            // B. 40%でアイテム（個数を増やす）
            else if (rand < 0.60) {
                const itemKeys = Object.keys(ItemData);
                const key = itemKeys[Math.floor(Math.random() * itemKeys.length)];
                const item = ItemData[key];
                
                // 1〜2個ランダムで支給
                const count = Math.floor(Math.random() * 2) + 1; 

                list.push({
                    type: 'item',
                    data: key,
                    count: count,
                    icon: '🎒',
                    name: `${item.name} x${count}`,
                    desc: item.desc,
                    color: item.color
                });
            } 
            // C. 40%でステータスアップ（数値を大幅強化）
            else {
                const statsTypes = [
                    { id: 'atk', name: '攻撃力', val: 5, icon: '⚔️' },    // +1 -> +5
                    { id: 'def', name: '防御力', val: 5, icon: '🛡️' },    // +1 -> +5
                    { id: 'matk', name: '魔力', val: 5, icon: '🔮' },     // +1 -> +5
                    { id: 'max_hp', name: '最大HP', val: 50, icon: '❤️' }, // +10 -> +50
                    { id: 'max_mp', name: '最大MP', val: 30, icon: '💧' }, // 新規追加
                    { id: 'spd', name: '素早さ', val: 3, icon: '👟' }      // 新規追加
                ];
                const s = statsTypes[Math.floor(Math.random() * statsTypes.length)];
                
                list.push({
                    type: 'stats',
                    data: { stat: s.id, value: s.val },
                    icon: s.icon,
                    name: `パーティの${s.name}UP`,
                    desc: `全員の${s.name}が +${s.val} 上昇する！`,
                    color: '#f1c40f'
                });
            }
        }
        return list;
    }

    createCard(reward) {
        const card = document.createElement('div');
        card.className = 'reward-card';
        card.style.borderColor = reward.color || '#fff';
        
        // アイコン
        const icon = document.createElement('div');
        icon.className = 'reward-icon';
        icon.innerText = reward.icon;
        card.appendChild(icon);

        // 名前
        const name = document.createElement('div');
        name.className = 'reward-name';
        name.innerText = reward.name;
        name.style.color = reward.color || '#fff';
        card.appendChild(name);

        // 説明
        const desc = document.createElement('div');
        desc.className = 'reward-desc';
        desc.innerText = reward.desc;
        card.appendChild(desc);

        // クリック時
        card.onclick = () => {
            try {
                this.applyReward(reward);
            } catch(e) {
                console.error("報酬適用エラー:", e);
                this.game.showMessage("報酬の受け取りに失敗しました");
            } finally {
                // 報酬選択処理（GameManager側へ戻る）
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
        // --- 1. アイテム ---
        if (reward.type === 'item') {
            const key = reward.data;
            if (!this.game.inventory) this.game.inventory = {};
            
            if (this.game.inventory[key]) {
                this.game.inventory[key].count += reward.count;
            } else {
                this.game.inventory[key] = { ...ItemData[key], count: reward.count };
            }
            // 簡易メッセージ表示（alertではなくカスタムUI推奨ですが、一旦これで）
            // this.game.showMessage(`${ItemData[key].name} を ${reward.count}個 手に入れた！`);
            console.log("アイテム獲得:", ItemData[key].name);
        } 
        // --- 2. ステータスアップ ---
        else if (reward.type === 'stats') {
            const { stat, value } = reward.data;
            this.game.party.forEach(member => {
                // 既存パラメータへの加算
                if (typeof member[stat] !== 'undefined') {
                    member[stat] += value;
                }
                
                // 最大HP/MPが増えたら、現在値も回復させてあげる（親切設計）
                if (stat === 'max_hp') {
                    member.add_hp(value); 
                }
                if (stat === 'max_mp') {
                    member.add_mp(value);
                }
            });
            console.log("ステータスアップ:", stat, value);
        }
        // --- 3. 野営（全回復） ---
        else if (reward.type === 'rest') {
            this.game.party.forEach(member => {
                member.revive(member.max_hp); // 蘇生
                member.add_hp(member.max_hp); // HP全快
                member.add_mp(member.max_mp); // MP全快
                member.clear_all_buffs();     // 状態異常も治す
            });
            console.log("パーティ全回復！");
        }
    }
}