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

    showRewards(enemyType = null) {
        this.cardArea.innerHTML = ""; 
        this.container.style.display = 'flex'; 

        let rewards;
        // ★追加: 中ボス（キングクラーゲン or 影のパーティ）なら専用報酬
        if (enemyType === 'king' || enemyType === 'shadow') {
            rewards = this.generateEliteRewards();
        } else {
            // それ以外（ザコ戦）はいつものランダム
            rewards = this.generateRandomRewards();
        }
        rewards.forEach(reward => {
            this.createCard(reward);
        });
    }

    hide() {
        this.container.style.display = 'none';
    }
    
    /**
     * ★追加: 中ボス撃破時の特別報酬（HPアップ確定）
     */
    generateEliteRewards() {
        const list = [];

        // 1. 【確定】最大HP超アップ
        list.push({
            type: 'stats',
            data: [
                { stat: 'max_hp', value: 80 },
                { stat: 'def',    value: 10 } // 通常の倍 (50 -> 100)
            ],
            icon: '❤️',
            name: '最大HP 超アップ',
            desc: 'パーティ全員の最大HPが +80 上昇 防御力+10',
            color: '#e74c3c' // 赤色で強調
        });

        // 2. 【魔力セット】最大MP ＆ 魔力 UP
        list.push({
            type: 'stats',
            data: [
                { stat: 'max_mp', value: 50 },
                { stat: 'matk',   value: 10 }
            ],
            icon: '🔮',
            name: '賢者の秘儀',
            desc: '全員の 最大MP+50 と 魔力+10',
            color: '#9b59b6'
        });

        // 3. 【確定】秘薬セット（エリクサー的な豪華アイテム）
        // 
        list.push({
            type: 'item',
            data: [
                { id: 'potion',  count: 1 },  
                { id: 'ether',   count: 1 },  
                { id: 'phoenix', count: 1 },
                { id: 'elixir', count: 1 } 
            ],
            icon: '🎒',
            name: '冒険者セット',
            desc: 'ポーションx1、エーテルx1、フェニックスの尾x1、エリクサーx1 を獲得！',
            color: '#f1c40f'
        });

        return list;
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
            if (!this.game.inventory) this.game.inventory = {};
            
            // ★ポイント: データが「配列」か「単体」かを判定してリスト化
            let itemsList = [];
            if (Array.isArray(reward.data)) {
                itemsList = reward.data; // 中ボス報酬（配列）の場合
            } else {
                // ランダム報酬（単体）の場合
                // dataにID文字列、countに個数が入っている
                itemsList = [{ id: reward.data, count: reward.count }];
            }
            // メッセージ表示用のリスト
            let msgParts = [];
            // リストを回して全て付与
            itemsList.forEach(itemInfo => {
                const key = itemInfo.id;
                const count = itemInfo.count;
                // インベントリへの追加処理
                if (this.game.inventory[key]) {
                    this.game.inventory[key].count += count;
                } else {
                    // 新規追加（ItemDataから基本情報をコピー）
                    if (ItemData[key]) {
                        this.game.inventory[key] = { ...ItemData[key], count: count };
                    }
                }
                
                // ログ用メッセージ作成
                if (ItemData[key]) {
                    msgParts.push(`${ItemData[key].name}x${count}`);
                }
            });
            // 「ポーションx1, エーテルx1... を手に入れた！」と表示
            this.game.showMessage(`${msgParts.join(', ')} を手に入れた！`);
        }
        // --- 2. ステータスアップ ---
        else if (reward.type === 'stats') {
            // ★ここを変更: dataが配列でなければ配列に変換して統一的に扱う
            const statsList = Array.isArray(reward.data) ? reward.data : [reward.data];

            // リストの中身を順番に適用
            statsList.forEach(item => {
                const { stat, value } = item;
                
                this.game.party.forEach(member => {
                    if (typeof member[stat] !== 'undefined') {
                        member[stat] += value;
                    }
                    // 最大値が増えたら現在値も回復
                    if (stat === 'max_hp') member.add_hp(value); 
                    if (stat === 'max_mp') member.add_mp(value);
                });
                console.log("ステータスアップ:", stat, value);
            });
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