import { ItemData } from './items.js';
import { RelicData } from './relics.js'; 
import { GameConfig } from './game_config.js';

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

    /**
     * 報酬画面を表示するエントリポイント
     */
    showRewards(enemyType = null) {
        this.container.style.display = 'flex'; 
        this.cardArea.innerHTML = ""; 

        // タイトルなどのリセット
        const title = this.container.querySelector('.reward-title');
        const sub = this.container.querySelector('p');
        if(title) title.innerText = "BATTLE WON!";
        if(sub) sub.style.display = "block";

        // ★分岐: 中ボスなら「2段階選択」、ザコなら「通常ランダム」
        if (enemyType === 'king' || enemyType === 'shadow') {
            this.showElitePhase1(); // フェーズ1へ
        } else {
            // 通常戦闘
            const rewards = this.generateRandomRewards();
            rewards.forEach(r => this.createCard(r));
        }
    }

    hide() {
        this.container.style.display = 'none';
    }

    // ====================================================
    //  ★中ボス用：連続報酬システム
    // ====================================================

    /**
     * フェーズ1: 基本の3択（HP / 魔力 / アイテム）
     */
    showElitePhase1() {
        this.cardArea.innerHTML = "";
        const title = this.container.querySelector('.reward-title');
        if(title) title.innerText = "BOSS BONUS (1/2)";

        const rewards = this.getEliteFixedRewards();
        
        rewards.forEach(r => {
            // ★ポイント: 選択後の動作として「フェーズ2へ進む」を指定
            this.createCard(r, () => this.showElitePhase2());
        });
    }

    /**
     * フェーズ2: レリックの選択
     */
    showElitePhase2() {
        // 画面を一度クリア
        this.cardArea.innerHTML = "";
        
        const title = this.container.querySelector('.reward-title');
        if(title) title.innerText = "CHOOSE RELIC (2/2)";
        
        // レリックの選択肢を生成（3つランダム）
        const rewards = this.generateRelicChoices();

        rewards.forEach(r => {
            // ★ポイント: 選択後の動作は「終了（null）」
            this.createCard(r, null);
        });
    }

    /**
     * フェーズ1用の固定3択データを生成
     */
    getEliteFixedRewards() {
        const list = [];

        // 1. 【耐久】最大HP超アップ
        list.push({
            type: 'stats',
            data: [
                { stat: 'max_hp', value: GameConfig.REWARD.HP_LARGE }, // 80 -> Config
                { stat: 'def',    value: GameConfig.REWARD.STAT_SMALL } // 10 -> Config
            ],
            icon: '❤️',
            name: '最大HP 超アップ',
            desc: 'パーティ全員の最大HP+80、防御+10',
            color: '#c0392b' 
        });

        // 2. 【魔法】魔力＆MPアップ
        list.push({
            type: 'stats',
            data: [
                { stat: 'max_mp', value: GameConfig.REWARD.MP_LARGE }, // 50 -> Config
                { stat: 'matk',   value: GameConfig.REWARD.STAT_SMALL } // 10 -> Config
            ],
            icon: '🔮',
            name: '賢者の秘儀',
            desc: '全員の 最大MP+50 と 魔力+10',
            color: '#8e44ad'
        });

        // 3. 【アイテム】秘薬セット
        list.push({
            type: 'item',
            data: [
                { id: 'potion',  count: 2 },  
                { id: 'ether',   count: 1 },  
                { id: 'phoenix', count: 1 } 
            ],
            icon: '🎒',
            name: '冒険者セット',
            desc: 'ポーションx2、エーテルx1、フェニックスの尾x1',
            color: '#2ecc71'
        });

        return list;
    }

    /**
     * フェーズ2用のレリック選択肢を生成（ランダム3つ）
     */
    generateRelicChoices() {
        const list = [];
        const allRelicIds = Object.keys(RelicData);
        // まだ持っていないレリックを抽出
        const obtainableRelics = allRelicIds.filter(id => !this.game.hasRelic(id));

        // シャッフルして先頭3つを取得
        for (let i = obtainableRelics.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [obtainableRelics[i], obtainableRelics[j]] = [obtainableRelics[j], obtainableRelics[i]];
        }
        const choices = obtainableRelics.slice(0, 3);

        if (choices.length > 0) {
            choices.forEach(relicId => {
                const relic = RelicData[relicId];
                list.push({
                    type: 'relic',
                    data: relicId,
                    icon: relic.icon || '💎',
                    name: relic.name,
                    desc: relic.desc,
                    color: '#e67e22' 
                });
            });
        } else {
            // コンプリート済みの場合の代替報酬
            list.push({
                type: 'stats',
                data: [{ stat: 'max_hp', value: 100 }],
                icon: '👑',
                name: '覇者の証',
                desc: 'レリックコンプリートボーナス！ HP+100',
                color: '#f1c40f'
            });
        }
        return list;
    }

    // ====================================================
    //  通常戦闘用
    // ====================================================

    generateRandomRewards() {
        const list = [];
        for(let i=0; i<3; i++) {
            const rand = Math.random();
            if (rand < 0.20) {
                list.push({
                    type: 'rest',
                    icon: '⛺',
                    name: '野営する',
                    desc: 'パーティ全員のHP・MPを全回復し、戦闘不能も復活させる。',
                    color: '#2ecc71'
                });
            } else if (rand < 0.60) {
                const itemKeys = Object.keys(ItemData);
                const key = itemKeys[Math.floor(Math.random() * itemKeys.length)];
                const item = ItemData[key];
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
            } else {
                const statsTypes = [
                    { id: 'atk', name: '攻撃力', val: 5, icon: '⚔️' },
                    { id: 'def', name: '防御力', val: 5, icon: '🛡️' },
                    { id: 'matk', name: '魔力', val: 5, icon: '🔮' },
                    { id: 'max_hp', name: '最大HP', val: 50, icon: '❤️' },
                    { id: 'max_mp', name: '最大MP', val: 30, icon: '💧' },
                    { id: 'spd', name: '素早さ', val: 3, icon: '👟' }
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

    // ====================================================
    //  カード生成と処理
    // ====================================================

    /**
     * カードUIを作成
     * @param {object} reward - 報酬データ
     * @param {function} onSelectCallback - 選択後の追加処理（nullなら終了）
     */
    createCard(reward, onSelectCallback = null) {
        const card = document.createElement('div');
        card.className = 'reward-card';
        card.style.borderColor = reward.color || '#fff';
        
        const icon = document.createElement('div');
        icon.className = 'reward-icon';
        icon.innerText = reward.icon;
        card.appendChild(icon);

        const name = document.createElement('div');
        name.className = 'reward-name';
        name.innerText = reward.name;
        name.style.color = reward.color || '#fff';
        card.appendChild(name);

        const desc = document.createElement('div');
        desc.className = 'reward-desc';
        desc.innerText = reward.desc;
        card.appendChild(desc);

        card.onclick = () => {
            try {
                this.applyReward(reward);
            } catch(e) {
                console.error("報酬適用エラー:", e);
                this.game.showMessage("報酬の受け取りに失敗しました");
            } 
            
            // ★ポイント: 次の処理があればそれを実行、なければ終了処理
            if (onSelectCallback) {
                onSelectCallback();
            } else {
                this.finish();
            }
        };

        this.cardArea.appendChild(card);
    }

    finish() {
        if (this.game && typeof this.game.onRewardSelected === 'function') {
            this.game.onRewardSelected();
        } else {
            this.hide();
            if(this.game.showMap) this.game.showMap();
        }
    }

    applyReward(reward) {
        if (reward.type === 'item') {
            if (!this.game.inventory) this.game.inventory = {};
            let itemsList = [];
            if (Array.isArray(reward.data)) {
                itemsList = reward.data; 
            } else {
                itemsList = [{ id: reward.data, count: reward.count }];
            }
            let msgParts = [];
            itemsList.forEach(itemInfo => {
                const key = itemInfo.id;
                const count = itemInfo.count;
                if (this.game.inventory[key]) {
                    this.game.inventory[key].count += count;
                } else {
                    if (ItemData[key]) {
                        this.game.inventory[key] = { ...ItemData[key], count: count };
                    }
                }
                if (ItemData[key]) {
                    msgParts.push(`${ItemData[key].name}x${count}`);
                }
            });
            this.game.showMessage(`${msgParts.join(', ')} を手に入れた！`);
        }
        else if (reward.type === 'stats') {
            const statsList = Array.isArray(reward.data) ? reward.data : [reward.data];
            statsList.forEach(item => {
                const { stat, value } = item;
                this.game.party.forEach(member => {
                    if (typeof member[stat] !== 'undefined') {
                        member[stat] += value;
                    }
                    if (stat === 'max_hp') member.add_hp(value); 
                    if (stat === 'max_mp') member.add_mp(value);
                });
            });
            this.game.showMessage("パーティの能力が上がった！");
        }
        else if (reward.type === 'rest') {
            this.game.party.forEach(member => {
                member.revive(member.max_hp); 
                member.add_hp(member.max_hp); 
                member.add_mp(member.max_mp); 
                member.clear_all_buffs();     
            });
            this.game.showMessage("全回復した！");
        }
        // ★追加: レリック
        else if (reward.type === 'relic') {
            this.game.addRelic(reward.data);
            this.game.showMessage(`${reward.name} を手に入れた！`);
        }
    }
}