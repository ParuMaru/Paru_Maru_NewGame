export class BattleDirector {
    constructor(ui, music, effects, party, enemies) {
        this.ui = ui;
        this.music = music;
        this.effects = effects;
        this.party = party;
        this.enemies = enemies;
    }

    /**
     * キャラクターに対応するDOM IDを取得する（演出用）
     */
    _getTargetId(target) {
        if (target.job) {
            return `card-${this.party.indexOf(target)}`;
        } else {
            const index = this.enemies.indexOf(target);
            return index >= 0 ? `enemy-sprite-${index}` : 'enemy-target';
        }
    }

    // --- 攻撃系の演出 ---

    showAttackStart(actor) {
        const logColor = actor.job ? "#3498db" : "#f1c40f";
        this.ui.addLog(`${actor.name}の攻撃！`, logColor, true);
        const isMagicUser = (actor.job === 'wizard' || actor.job === 'healer');
        
        if (isMagicUser) this.music.playMagic();
        else this.music.playAttack();

        return isMagicUser; // 魔法職かどうかを返す（ヒット演出の分岐用）
    }

    showPhysicalHit(target, damage, isCritical, isMagicHit) {
        const targetId = this._getTargetId(target);

        // エフェクト分岐
        if (isMagicHit) this.effects.magicExplosion(targetId);
        else this.effects.slashEffect(targetId);

        // ポップアップ色
        const popupColor = "#ff4757";
        this.effects.damagePopup(damage, targetId, popupColor);

        // ログ
        if (isCritical) this.ui.addLog("クリティカルヒット！", "#f1c40f", true);
        this.ui.addLog(`> ${target.name}に ${damage} のダメージ！`);

        this._checkDeath(target, targetId);
    }

    // --- スキル・魔法系の演出 ---

    showSkillStart(actor, skill) {
        const logColor = actor.job ? "#3498db" : "#f1c40f";
        this.ui.addLog(`${actor.name}は ${skill.name} を使った！`, logColor, true);
    }

    // ★修正: actor 引数を追加して、誰が撃ったかを判別可能に
    showMagicEffect(actor, skill, targets) {
        const actorId = this._getTargetId(actor);

        if (skill.id === 'fire') {
            this.music.playMagicFire();
            // ★修正: 発射元(actorId)を渡して、正しい位置から火の玉を飛ばす
            targets.forEach(t => this.effects.fireEffect(this._getTargetId(t), actorId));
        } 
        else if (skill.id === 'fira') {
            this.music.playMagicFire();
            // ★修正: ファイラは火の玉を飛ばさず、ターゲット全員の足元から火柱を上げる(allFireEffect)
            // 対象のIDリストを作成して渡す
            const targetIds = targets.map(t => this._getTargetId(t));
            this.effects.allFireEffect(targetIds);
        } 
        else if (skill.id === 'meteor' || skill.id === 'dark_meteor') {
            this.music.playMagicMeteor();
            targets.forEach(t => this.effects.meteorEffect(this._getTargetId(t)));
        }
        else if (skill.id === 'ice_breath') {
            this.music.playBreath(); 
            this.effects.allIceEffect(targets); 
        }
        // ★追加: カースは汎用魔法エフェクト
        else if (skill.id === 'curse') {
            this.music.playPoison(); 
            targets.forEach(t => this.effects.magicExplosion(this._getTargetId(t)));
        }
        else if (skill.id === 'chaos_wave') {
            this.music.playMagicMeteor(); // 音はメテオなどを流用
            
            // 画面全体を揺らすだけにする（ボス自体を変形させない）
            document.body.classList.add('screen-shake');
            this.effects.flash("rgba(0, 0, 0, 0.8)"); // 暗黒のフラッシュ
            
            // ターゲット（味方）の上に爆発エフェクト
            targets.forEach(t => {
                this.effects.magicExplosion(this._getTargetId(t));
            });

            setTimeout(() => document.body.classList.remove('screen-shake'), 800);
        }
        else {
            // 汎用魔法
            this.music.playMagic();
            targets.forEach(t => this.effects.magicExplosion(this._getTargetId(t)));
        }
    }

    showMagicHit(target, damage) {
        const targetId = this._getTargetId(target);
        this.effects.damagePopup(damage, targetId, "#ff4757");
        this.ui.addLog(`> ${target.name}に ${damage} のダメージ！`);
        this._checkDeath(target, targetId);
    }

    // --- 回復・支援系の演出 ---

    showHeal(target, amount, isMp = false, playSound = true) {
        if (playSound) {
            if (!isMp) this.music.playHeal();
            else this.music.playMeditation();
        }

        const targetId = this._getTargetId(target);
        this.effects.healEffect(targetId);
        
        const color = isMp ? "#3498db" : "#2ecc71";
        const unit = isMp ? "MP" : "";
        this.effects.damagePopup(`+${amount}${unit}`, targetId, color);

        const typeStr = isMp ? "MP" : "HP";
        this.ui.addLog(`> ${target.name}の${typeStr}が ${amount} 回復した`);
    }
    //　エリクサー用全回復演出
    showFullHeal(target) {
        this.music.playHeal();
        
        const targetId = this._getTargetId(target);
        this.effects.healEffect(targetId);

        this.effects.damagePopup("FULL", targetId, "#f1c40f");

        // ログもここで制御する（二重に出ないように）
        this.ui.addLog(`> ${target.name}のHP・MPが全回復した！`, "#f1c40f");
    }

    showResurrection(target, isFullRevive = false) {
        const targetId = this._getTargetId(target);
        this.effects.resurrectionEffect(targetId);
        this.music.playHeal();
        
        if (isFullRevive) {
            this.ui.addLog(`${target.name}が完全な状態で蘇生した！`, "#ffff00", true);
        } else {
            this.ui.addLog(`> ${target.name}が蘇った！`, "#f1c40f");
        }
    }

    showCover(actor) {
        this.music.playCover();
        this.ui.addLog(`${actor.name}は身構えた！`, "#3498db", true);
        this.ui.addLog(` > 仲間への攻撃を身代わりする！`);
    }

    showCoverAction(protector, target) {
         this.ui.addLog(` > ${protector.name}が${target.name}をかばった！`, "#3498db");
    }

    showBuff(targets, skillName) {
        if (skillName === "竜の咆哮") {
            this.music.playBreath(); 
            const actorId = this._getTargetId(targets[0]);
            this.effects.roarEffect(actorId);
            this.ui.addLog(` > ドラゴンの攻撃力が激増した！`, "#e74c3c");
        } else {
            this.music.playKobu();
            this.ui.addLog(` > 味方の攻撃力が上がった！`); 
        }

        targets.forEach(t => {
            if(t.is_alive()) this.effects.healEffect(this._getTargetId(t));
        });
    }

    showRegen(actor) {
        this.music.playHeal();
        this.ui.addLog(`${actor.name}は天に祈りを捧げた！`, "#8e44ad", true);
        this.ui.addLog(` > 味方全員に祝福が宿る！`, "#8e44ad");
    }
    
    // --- 分裂イベント演出 ---

    async showSplittingTrigger(enemy) {
        this.ui.addLog(`${enemy.name}の体が震えだした...！`, "#ff00ff");
        
        const targetId = this._getTargetId(enemy);
        const el = document.getElementById(targetId);
        if (el) {
            const img = el.querySelector('img');
            if (img) img.classList.add('splitting'); 
        }

        this.music.playBukubuku();
    }

    showSplittingTransform(oldName) {
        this.ui.addLog(`${oldName}は三皿に取り分けられた！`, "#ff00ff");
        this.music.playSplited(); 
    }

    showSplittingAppear(startIndex) {
        const spriteA = document.getElementById(`enemy-sprite-${startIndex}`);
        const spriteC = document.getElementById(`enemy-sprite-${startIndex+2}`);

        if (spriteA) spriteA.classList.add('appear-right'); 
        if (spriteC) spriteC.classList.add('appear-left');
    }
    
    // ★修正: 派手な合体開始演出
    async showShadowFusionStart() {
        this.ui.addLog("影たちが一点に凝縮していく...！", "#8e44ad", true);
        this.music.playMeditation(); // 溜めの音（怪しい音）

        // 1. 敵の表示領域（コンテナ）を相対配置にしておく（中央配置のため）
        const container = document.getElementById('enemy-target');
        if (container) container.style.position = 'relative';

        // 2. 闇のコア（ブラックホール）を生成
        const core = document.createElement('div');
        core.className = 'fusion-core';
        if (container) container.appendChild(core);

        // 3. 倒れている敵たちをコアに吸い込ませる
        const deadShadows = document.querySelectorAll('.enemy-unit');
        
        // 少し待ってから吸い込み開始
        setTimeout(() => {
            deadShadows.forEach(el => {
                el.style.opacity = '1'; // 一瞬表示
                // 強制的に吸い込みクラスを付与
                // ※ requestAnimationFrameでタイミングをずらさないとtransitionが効かないことがある
                requestAnimationFrame(() => {
                    el.classList.add('being-absorbed');
                    // 中央寄せのCSS調整（gridの影響を無視して中央へ寄せたい場合）
                    el.style.transformOrigin = "center center";
                    // ここは簡易的に scale(0) で「消滅」を表現
                });
            });
        }, 200);

        // 4. コアのアニメーション時間分待つ (CSSで2.5sに設定)
        await new Promise(r => setTimeout(r, 2200));
        
        // 5. 爆発フラッシュ
        const flash = document.createElement('div');
        flash.className = 'dark-flash';
        document.body.appendChild(flash);
        
        // フラッシュと同時にコアを消す
        if (core.parentNode) core.parentNode.removeChild(core);
        
        await new Promise(r => setTimeout(r, 500)); // フラッシュの余韻
        if (flash.parentNode) flash.parentNode.removeChild(flash);
    }

    // ★修正: 登場演出（微調整）
    async showShadowFusionEnd() {
        this.ui.addLog("「影の支配者」が現れた！！！", "#e74c3c", true);
        this.music.playMagicMeteor(); // ドーン！
        
        // ボス
        const bossEl = document.getElementById('enemy-sprite-0');
        if (bossEl) {
            bossEl.classList.add('shadow-aura'); 
            bossEl.classList.add('king-size'); 
            
            // 出現アニメーション
            bossEl.style.animation = 'none';
            void bossEl.offsetHeight; // リフロー
            bossEl.style.animation = 'resurrectionFlash 1.5s ease-out';
        }
        
        // 画面を激しく揺らす
        document.body.classList.add('screen-shake');
        setTimeout(() => document.body.classList.remove('screen-shake'), 1200);
        
        await new Promise(r => setTimeout(r, 1200));
    }
    
    
    /**
     * ドラゴン覚醒演出
     */
    async playDragonTransformation(enemy, allEnemies) {
        // ... (ここまではさきほどと同じ：揺れ → 発光 → フラッシュ) ...
        
        const enemyIndex = allEnemies.indexOf(enemy);
        const enemyEl = document.getElementById(`enemy-sprite-${enemyIndex}`);

        // 1. 予兆（横揺れ）
        this.ui.addLog("『我ガ眠リヲ妨ゲル者ハ...消エ去レ...！！』", "#e74c3c");
        if (enemyEl) enemyEl.classList.add('sway-slow');
        await new Promise(r => setTimeout(r, 2000));

        // 2. 発光（点滅）
        if (enemyEl) {
            enemyEl.classList.remove('sway-slow');
            enemyEl.classList.add('flash-rapid');
        }
        await new Promise(r => setTimeout(r, 1000));

        // 3. 目潰し（ホワイトアウト）
        const flashOverlay = document.createElement('div');
        flashOverlay.id = 'flash-overlay';
        document.body.appendChild(flashOverlay);
        await new Promise(r => requestAnimationFrame(r));
        flashOverlay.style.opacity = '1';
        await new Promise(r => setTimeout(r, 300));

        // 4. 変身完了 ＆ 吹雪開始！
        this.ui.refreshEnemyGraphics(allEnemies);
        
        // フラッシュを消す（先に消し始める）
        flashOverlay.style.opacity = '0';
        setTimeout(() => flashOverlay.remove(), 500);

        // ★ここを修正：画面全体ではなく「敵エリア」に吹雪を入れる
        // 【重要】ご自身のゲームで敵キャラが格納されている親要素のIDを指定してください
        const enemyArea = document.getElementById('canvas-area'); 

        if (enemyArea) {
            // 敵エリアのスタイルを調整（吹雪をはみ出させないため）
            enemyArea.style.position = 'relative'; 
            enemyArea.style.overflow = 'hidden';

            // 吹雪のコンテナを作成
            const blizzardContainer = document.createElement('div');
            blizzardContainer.className = 'blizzard-container'; // CSSで定義したクラス
            blizzardContainer.id = 'active-blizzard'; // 後で消す目印用ID

            // 3層の雪レイヤーを作成して入れる
            blizzardContainer.innerHTML = `
                <div class="snow-layer back"></div>
                <div class="snow-layer middle"></div>
                <div class="snow-layer front"></div>
            `;
            
            // 敵エリアに追加
            enemyArea.appendChild(blizzardContainer);

            // フェードイン
            await new Promise(r => requestAnimationFrame(r));
            blizzardContainer.style.opacity = '1';
        }

        this.ui.addLog("猛吹雪が吹き荒れる！", "#00d2ff");
        await new Promise(r => setTimeout(r, 1000));
    }

    // --- アイテム演出 ---

    showItemUse(actor, item) {
        this.ui.addLog(`${actor.name}は ${item.name} を使った！`, "#e67e22", true);
    }
    
    // --- 共通処理 ---

    _checkDeath(target, targetId) {
        if (!target.is_alive()) {
            if (!target.job) {
                this.effects.enemyDeath(targetId);
            }
        }
    }

    refreshStatus() {
        this.ui.updateEnemyHP(this.enemies);
    }
}