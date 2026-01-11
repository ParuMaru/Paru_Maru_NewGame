export class TimingGauge {
    constructor() {
        this.overlay = null;
        this.resolvePromise = null; 
        this.animationId = null;
        this.running = false;
        this.startTime = 0;
        this.period = 1000; // 往復にかかる時間（ミリ秒） 1秒
    }

    // 画面にゲージを表示する
    createUI() {
        this.overlay = document.createElement('div');
        Object.assign(this.overlay.style, {
            position: 'fixed', top: '0', left: '0', width: '100%', height: '100%',
            background: 'rgba(0,0,0,0.3)', zIndex: '9999', // 一番手前に表示
            display: 'flex', flexDirection: 'column', 
            justifyContent: 'center', alignItems: 'center'
        });

        this.overlay.innerHTML = `
            <div style="
                background: linear-gradient(135deg, #2c3e50, #000);
                padding: 20px; 
                border-radius: 15px; 
                border: 3px solid #fff; 
                width: 320px; 
                text-align: center;
                box-shadow: 0 0 20px rgba(0,0,0,0.8);
            ">
                <div style="
                    color: #f1c40f; margin-bottom: 15px; 
                    font-weight: bold; font-size: 20px;
                    text-shadow: 2px 2px 0 #000;
                ">⚔️ TIMING ATTACK!</div>
                
                <div id="gauge-meter" style="
                    position: relative; height: 30px; 
                    background: #34495e; border-radius: 15px; 
                    overflow: hidden; border: 2px solid #95a5a6;
                ">
                    <div style="
                        position: absolute; left: 40%; width: 20%; height: 100%; 
                        background: rgba(46, 204, 113, 0.6);
                        box-shadow: 0 0 10px #2ecc71;
                    "></div>
                    
                    <div style="
                        position: absolute; left: 48%; width: 4%; height: 100%; 
                        background: rgba(241, 196, 15, 0.9);
                    "></div>

                    <div id="gauge-cursor" style="
                        position: absolute; top: 0; bottom: 0; width: 6px; 
                        background: #fff; left: 0;
                        box-shadow: 0 0 5px white;
                    "></div>
                </div>

                <div style="
                    color: #bdc3c7; font-size: 14px; margin-top: 15px;
                ">クリック または SPACEキー で決定！</div>
            </div>
        `;

        document.body.appendChild(this.overlay);

       // 【修正後】ポインターダウン（触れた瞬間に即反応！）
        this.overlay.addEventListener('pointerdown', (e) => {
            e.preventDefault(); // タッチした時の画面スクロールや拡大などの誤動作をブロック
            e.stopPropagation();
            this.stop();
        }, { once: true }); // 一回押したら終わり
        
        // スペースキー対応
        const keyHandler = (e) => {
            if(this.running && e.code === 'Space') {
                e.preventDefault(); // スクロール防止
                this.stop();
            }
        };
        document.addEventListener('keydown', keyHandler, { once: true });
        this.keyHandler = keyHandler; // 後で解除できるように保存
    }

    // ゲージ開始（ここをawaitで呼ぶ）
    start() {
        this.createUI();
        this.running = true;
        this.startTime = performance.now();
        
        // アニメーションループ
        const loop = (time) => {
            if (!this.running) return;
            
            const elapsed = (time - this.startTime) % this.period;
            const progress = elapsed / this.period;
            
            // サイン波で滑らかに往復 (0 -> 1 -> 0)
            const pos = 0.5 - Math.cos(Math.PI * progress) / 2;
            
            const cursor = this.overlay.querySelector('#gauge-cursor');
            const meter = this.overlay.querySelector('#gauge-meter');
            
            if(cursor && meter) {
                // カーソルの位置計算
                const max = meter.clientWidth - cursor.clientWidth;
                cursor.style.transform = `translateX(${pos * max}px)`;
                this.currentPos = pos; // 0.0 〜 1.0 の値を保存
            }
            
            this.animationId = requestAnimationFrame(loop);
        };
        requestAnimationFrame(loop);

        // 終わるまで待っててね、という約束(Promise)を返す
        return new Promise((resolve) => {
            this.resolvePromise = resolve;
        });
    }

    stop() {
        if (!this.running) return;
        this.running = false;
        cancelAnimationFrame(this.animationId);

        // キーイベント削除
        document.removeEventListener('keydown', this.keyHandler);

        // （成功±15%、パーフェクト±4%）
        const isSuccess = (this.currentPos >= 0.35 && this.currentPos <= 0.65);
        const isPerfect = (this.currentPos >= 0.46 && this.currentPos <= 0.54);

        let result = { multiplier: 0.8, type: 'miss' }; // 基本は失敗（威力ダウン）

        const cursor = this.overlay.querySelector('#gauge-cursor');

        if (isPerfect) {
            result = { multiplier: 1.5, type: 'perfect' }; // 1.5倍
            cursor.style.background = '#f1c40f'; // 金色
        } else if (isSuccess) {
            result = { multiplier: 1.2, type: 'good' };    // 1.2倍
            cursor.style.background = '#2ecc71'; // 緑色
        } else {
            cursor.style.background = '#e74c3c'; // 赤色（失敗）
        }

        // 0.5秒だけ結果を見せてから消す
        setTimeout(() => {
            if(this.overlay.parentNode) {
                document.body.removeChild(this.overlay);
            }
            this.resolvePromise(result); // 結果を呼び出し元に返す
        }, 500);
    }
}