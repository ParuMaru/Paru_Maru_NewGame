/**
 * バトル中の視覚演出（エフェクト）を管理するクラス
 */
export class EffectManager {

    /**
     * 斬撃エフェクト（勇者・敵用）
     */
    slashEffect(targetId) {
        const target = document.getElementById(targetId);
        if (!target) return;

        // 斬撃の線を出す
        const slash = document.createElement('div');
        slash.className = 'slash-line';
        target.appendChild(slash);

        const img = target.querySelector('img'); 
        const shakeTarget = img ? img : target; 

        // 振動クラスを付与
        shakeTarget.classList.add('damage-shake');

        // お片付け
        setTimeout(() => {
            if (target.contains(slash)) {
                target.removeChild(slash);
            }
            shakeTarget.classList.remove('damage-shake');
        }, 200); 
    }
    
    /**
     * 魔法攻撃エフェクト：青白い円形の光を広げる
     */
    magicExplosion(targetId) {
        let target = document.getElementById(targetId);
        if (!target) return;
        
        if (target.tagName === 'IMG') {
            target = target.parentElement;
        }
        
        target.style.position = 'relative';
        
        const circle = document.createElement('div');
        circle.className = 'magic-circle';
        target.appendChild(circle);

        setTimeout(() => circle.remove(), 500);
        this.flash("rgba(69, 34, 197, 0.3)");
    }

    shake(id) {
        const el = document.getElementById(id);
        if (el) {
            el.style.animation = 'none'; 
            void el.offsetHeight;        
            el.style.animation = 'shake 0.3s'; 
        }
    }

    flash(color = "white") {
        const f = document.createElement('div');
        f.className = 'screen-flash';
        f.style.background = color;
        document.body.appendChild(f);
        setTimeout(() => f.remove(), 100);
    }

    damagePopup(value, targetId, color = "#ff4757") {
        const target = document.getElementById(targetId);
        if (!target) return;
        const p = document.createElement('div');
        p.innerText = value;
        p.className = 'damage-popup'; 
        p.style.color = color;
        target.appendChild(p);
        setTimeout(() => p.remove(), 800);
    }

    healEffect(targetCardId) {
        const target = document.getElementById(targetCardId);
        if (!target) return;

        target.style.position = 'relative';

        const h = document.createElement('div');
        h.className = 'heal-light'; 
        target.appendChild(h);

        setTimeout(() => h.remove(), 600);
    }
    
    resurrectionEffect(targetCardId) {
        const target = document.getElementById(targetCardId);
        if (!target) return;

        target.style.animation = 'none'; 
        void target.offsetHeight; 
        target.style.animation = 'resurrectionFlash 1s ease-out';
        
        setTimeout(() => {
            if (target) target.style.animation = '';
        }, 1000);
    }

    enemyDeath(targetId) {
        const target = document.getElementById(targetId);
        if (!target) return;
        
        target.style.pointerEvents = "none";
        target.style.transition = "all 0.8s ease-out";
        target.style.filter = "brightness(5) contrast(1.2) blur(4px)";
        target.style.opacity = "0";
        target.style.transform = "scale(1.2) translateY(-20px)";
        
        this.flash("rgba(255, 255, 255, 0.5)");

        setTimeout(() => {
            if (target.parentNode) {
                target.parentNode.removeChild(target);
            }
        }, 800); 
    }

    meteorEffect(targetId) {
        const target = document.getElementById(targetId);
        if (!target) return;

        const rect = target.getBoundingClientRect();
        const targetX = rect.left + rect.width / 2;
        const targetY = rect.top + rect.height / 2;

        const rock = document.createElement('div');
        rock.className = 'meteor-rock';
        rock.style.left = `${targetX}px`;
        rock.style.top = `0px`; 
        document.body.appendChild(rock);

        document.body.classList.add('screen-shake');

        setTimeout(() => {
            rock.style.transform = `translate(-50%, ${targetY}px) scale(1.2)`;
        }, 10);

        setTimeout(() => {
            rock.style.opacity = "0";
            const explosion = document.createElement('div');
            explosion.className = 'meteor-explosion';
            target.parentElement.appendChild(explosion);

            this.flash("rgba(255, 255, 255, 0.8)");
            setTimeout(() => document.body.classList.remove('screen-shake'), 200);

            setTimeout(() => {
                if (rock.parentNode) rock.parentNode.removeChild(rock);
                if (explosion.parentNode) explosion.parentNode.removeChild(explosion);
            }, 500);
        }, 410); 
    }

    /**
     * ファイア（単体魔法）：火球が飛んでいき、敵が燃え上がる
     * ★修正: 発射元のID (sourceId) を指定可能に
     */
    fireEffect(targetId, sourceId = null) {
        const target = document.getElementById(targetId);
        if (!target) return;

        const rect = target.getBoundingClientRect();
        const targetX = rect.left + rect.width / 2;
        const targetY = rect.top + rect.height / 2;

        const ball = document.createElement('div');
        ball.className = 'fireball';

        // ★修正: 発射元の位置計算
        let startX, startY;

        if (sourceId) {
            const sourceEl = document.getElementById(sourceId);
            if (sourceEl) {
                const sRect = sourceEl.getBoundingClientRect();
                startX = sRect.left + sRect.width / 2;
                startY = sRect.top + sRect.height / 2;
            }
        }

        // 発射元が不明なら、とりあえず画面中央下（プレイヤー側）
        if (!startX) {
            startX = window.innerWidth / 2;
            startY = window.innerHeight * 0.9;
        }

        ball.style.left = `${startX}px`; 
        ball.style.top = `${startY}px`;
        document.body.appendChild(ball);

        // 敵に向かって飛ばす計算 (transform で差分移動)
        setTimeout(() => {
            const moveX = targetX - startX;
            const moveY = targetY - startY;
            ball.style.transform = `translate(${moveX}px, ${moveY}px) scale(1.2)`;
        }, 20);

        // 着弾時の燃焼演出
        setTimeout(() => {
            ball.style.opacity = "0";

            const fire = document.createElement('div');
            fire.className = 'fire-burn';
            target.appendChild(fire);

            this.flash("rgba(255, 69, 0, 0.4)");

            setTimeout(() => {
                if (ball.parentNode) ball.parentNode.removeChild(ball);
                if (fire.parentNode) fire.parentNode.removeChild(fire);
            }, 500);
        }, 320);
    }

    /**
     * ファイラ（全体魔法）：指定されたIDの対象が燃え上がる（火の玉なし・柱のみ）
     * ★修正: 敵・味方問わず、IDリストを受け取って処理するように変更
     */
    allFireEffect(targetIds) {
        targetIds.forEach((id, i) => {
            const target = document.getElementById(id);
            if (!target) return;

            // 1体につき3本の火柱を時間差で発生
            [0, 1, 2].forEach((j) => {
                setTimeout(() => {
                    const fire = document.createElement('div');
                    fire.className = 'fire-burn';
                    fire.style.marginLeft = `${(j - 1) * 15}px`;
                    target.appendChild(fire);

                    setTimeout(() => {
                        if (fire.parentNode) fire.parentNode.removeChild(fire);
                    }, 600);
                }, j * 80); 
            });
        });

        // 全体魔法の重量感を出すために画面を揺らす
        document.body.classList.add('screen-shake');
        this.flash("rgba(255, 69, 0, 0.6)");
        setTimeout(() => document.body.classList.remove('screen-shake'), 400);
    }

    /**
     * 全体氷魔法（こごえる吹雪）
     */
    allIceEffect(party) {
        party.forEach((member, i) => {
            if (!member.is_alive()) return;

            const targetId = `card-${i}`; 
            const target = document.getElementById(targetId);
            if (!target) return;

            const ice = document.createElement('div');
            ice.className = 'ice-pillar';
            target.appendChild(ice);

            setTimeout(() => {
                if (ice.parentNode) ice.parentNode.removeChild(ice);
            }, 800);
        });

        document.body.classList.add('screen-shake');
        this.flash("rgba(0, 200, 255, 0.6)");
        setTimeout(() => document.body.classList.remove('screen-shake'), 400);
    }
    
    clawEffect(targetId) {
        this.slashEffect(targetId);
        setTimeout(() => {
            const target = document.getElementById(targetId);
            if (!target) return;
            
            const slash = document.createElement('div');
            slash.className = 'slash-line';
            slash.style.transform = 'translate(-50%, -50%) rotate(45deg)'; 
            target.appendChild(slash);

            setTimeout(() => {
                if (target.contains(slash)) target.removeChild(slash);
            }, 200);
        }, 100);
    }
    
    roarEffect(actorId) {
        const actor = document.getElementById(actorId);
        if (actor) {
            const sprite = actor.querySelector('img') || actor;
            sprite.classList.add('roaring'); 
            
            setTimeout(() => {
                sprite.classList.remove('roaring');
            }, 800);
        }
        
        document.body.classList.add('screen-shake');
        this.flash("rgba(255, 0, 0, 0.2)"); 
        
        setTimeout(() => document.body.classList.remove('screen-shake'), 800);
    }
}