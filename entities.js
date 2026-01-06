/**
 * 全てのキャラクター（味方・敵）の基底クラス
 */
export class Entity {
    /**
     * @param {string} name - 名前
     * @param {number} hp - 最大HP
     * @param {number} mp - 最大MP
     * @param {number} atk - 物理攻撃力
     * @param {number} def - 物理防御力
     * @param {number} matk - 魔法攻撃力
     * @param {number} mdef - 魔法防御力
     * @param {number} spd - 素早さ
     * @param {number} rec - 回復力
     * @param {string} img - 画像パス
     */
    constructor(name, hp, mp, atk, def, matk, mdef, spd, rec, img) {
        this.name = name;
        this.max_hp = hp;
        this.max_mp = mp;
        this._hp = hp;
        this._mp = mp;
        
        this.atk = atk;   // 物理攻撃の基準値
        this.def = def;   // 物理防御
        this.matk = matk; // 魔法攻撃の基準値
        this.mdef = mdef; // 魔法防御
        this.spd = spd;   // 素早さ
        this.rec = rec;   // 回復力
        
        this.img = img;   //画像パス用

        // --- 状態フラグ ---
        this.is_covering = false; // かばう状態
        this.buffs = {};   // 有利な効果 { "atk_up": 3, "regen": 5 }
        this.debuffs = {}; // 不利な効果 { "poison": 4, "def_down": 3 }
        this.is_dead = false;
        this.skills = []; // skills.js の ID文字列を格納
    }
    
    hasBuff(id) {
        return this.buffs[id] && this.buffs[id] > 0;
    }
    hasDebuff(id) {
        return this.debuffs[id] && this.debuffs[id] > 0;
    }

    // --- 状態取得 (ゲッター) ---
    get hp() { return this._hp; }
    get mp() { return this._mp; }

    /**
     * HPを増減させる一元管理メソッド
     * @param {number} amount - 正の値で回復、負の値でダメージ
     */
    add_hp(amount) {
        // 死亡している場合は、正の回復（add_hpによるもの）を受け付けない
        if (this.is_dead && amount > 0) return;

        this._hp = Math.max(0, Math.min(this.max_hp, this._hp + amount));
        
        // 判定は厳密に行う
        if (this._hp <= 0) {
            this._hp = 0;
            this.is_dead = true;
        } else {
            this.is_dead = false;
        }
    }

    /**
     * MPを増減させる一元管理メソッド
     * @param {number} amount - 正の値で回復、負の値で消費
     */
    add_mp(amount) {
        if (this.is_dead) return;
        this._mp = Math.max(0, Math.min(this.max_mp, this._mp + amount));
    }

    /**
     * 蘇生：死亡状態を強制解除してHPを戻す
     * ※命の代償やフェニックスの尾で使用
     */
    revive(hp_amount) {
        this._hp = Math.max(0, Math.min(this.max_hp, hp_amount));
        if (this._hp > 0) {
            this.is_dead = false;
            this.clear_all_buffs();
        }
    }

    is_alive() {
        return !this.is_dead;
    }
    
    clear_all_buffs() {
        this.buffs = {};
        this.debuffs = {};
        this.is_covering = false;
        this.regen_value = 0;
    }

    /**
     * 自分自身の画像とステータスを含んだ「動的なコンテナ」を生成する
     */
    render(index) {
        const hpRatio = (this._hp / this.max_hp) * 100;
        
        // 敵の種類（キング等）に応じたクラスを動的に付与
        const extraClass = this.isKing ? 'king-size' : '';
        
        // コンテナ（div.enemy-unit）ごと文字列で作成
        return `
            <div class="enemy-unit ${extraClass}" id="enemy-unit-${index}">
                <div class="enemy-label">${this.name}</div>
                <div class="enemy-hp-container">
                    <div class="enemy-hp-bar" style="width:${hpRatio}%"></div>
                </div>
                <img src="${this.image}" id="enemy-sprite-${index}" class="enemy-img">
            </div>
        `;
    }
}

/**
 * 勇者（Hero）
 */
export class Hero extends Entity {
    constructor(name = "勇者") {
       　　 // 名称, HP, MP, ATK, DEF, MATK, MDEF, SPD, REC
        super(name, 280, 80, 75, 70, 20, 30, 35, 30);
        this.job = "hero";
        this.skills = ["cover", "encourage"]; 
    }
}

/**
 * 魔法使い（Wizard）
 */
export class Wizard extends Entity {
    constructor(name = "魔法使い") {
        super(name, 200, 150, 20, 20, 70, 50, 12, 40);
        this.job = "wizard";
        this.skills = ["fire", "fira", "meteor", "meditation"];
    }
}

/**
 * 癒し手（Healer）
 */
export class Healer extends Entity {
    constructor(name = "癒し手") {
        super(name, 220, 150, 25, 25, 30, 60, 10, 80);
        this.job = "healer";
        this.skills = ["heal", "medica", "prayer", "raise"];
    }
}

/**
 * スライム（Enemy）
 */
export class Slime extends Entity {
    /**
     * コンストラクタを柔軟にする
     * @param {boolean} isKing - 王様かどうか
     * @param {string} name - 名前（省略可）
     */
    constructor(isKing = false, name = 'スライム') {
        console.log(`スライム生成ログ: 名前=${name}, 王様フラグ=${isKing}`);
        if (isKing) {
            // キングスライムの設定
            super(name, 1000, 0, 70, 40, 40, 35, 20, 40, './resource/slime.webp');
            this.isKing = true;
        } else {
            // 通常スライムの設定
            super(name, 300, 0, 45, 25, 30, 20, 40, 20, './resource/splited_slime.webp');
            this.isKing = false;
        }
    }
}

// 初期配置用に KingSlime クラスも用意しておくと便利
export class KingSlime extends Slime {
    constructor() {
        super(true, "キングスライム");
    }
}

// ゴブリン
export class Goblin extends Entity {
    constructor(name = "ゴブリン") {
        // HP:450, ATK:65 (スライムより攻撃的)
        super(name, 450, 0, 65, 30, 10, 20, 35, 10, './resource/goblin.webp'); 
        this.enemyType = "goblin";
    }
}

// ★追加：影の勇者
export class ShadowHero extends Entity {
    constructor() {
        // HP:400, ATK:75
        super("影の勇者", 400, 100, 75, 40, 20, 30, 40, 0, './resource/shadow_hero.webp');
        this.enemyType = "shadow_hero"; 
        this.skills = ["encourage"];
    }
}

// ★追加：影の魔法使い
export class ShadowWizard extends Entity {
    constructor() {
        // HP:300, MATK:50
        super("影の魔導師", 300, 500, 20, 20, 50, 50, 35, 0, './resource/shadow_wizard.webp');
        this.enemyType = "shadow_wizard"; 
        this.skills = ["fire", "fira"];
    }
}

// ★追加：影のヒーラー
export class ShadowHealer extends Entity {
    constructor() {
        // HP:350
        super("影の僧侶", 350, 500, 30, 30, 40, 40, 30, 60, './resource/shadow_healer.webp');
        this.enemyType = "shadow_healer";
        this.skills = ["heal", "medica"];
    }
}

// ドラゴン（強敵）
export class IceDragon extends Entity {
    constructor(name = "アイスドラゴン") {
        // HP:2000, ATK:90, MATK:90,SPD:30 (ボス級)
        super(name, 2000, 0, 90, 50, 80, 50, 30, 50, './resource/ice_dragon.webp');
        this.enemyType = "ice_dragon";
    }
}