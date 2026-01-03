import { GameManager } from './game_manager.js';
import { DebugManager } from './debug_manager.js';

window.onload = () => {
    // GameManagerの準備
    const gameManager = new GameManager(); 
    
    // タイトル画面の要素
    const startBtn = document.getElementById('game-start-btn'); 
    const titleScreen = document.getElementById('title-screen'); 
    
    // ズームスライダーの要素
    const zoomSlider = document.getElementById('zoom-slider');
    const gameWrapper = document.getElementById('game-wrapper');

    // ★修正：スライダー操作時の処理を拡張
    if (zoomSlider) {
        // 初期値設定
        zoomSlider.value = 1.0;
        if (gameWrapper) gameWrapper.style.transform = 'scale(1.0)';

        zoomSlider.addEventListener('input', (e) => {
            const scale = e.target.value;
            
            // 1. 戦闘画面のサイズ変更
            if (gameWrapper) {
                gameWrapper.style.transform = `scale(${scale})`;
            }
            
            // 2. マップ画面のサイズ変更（もし存在すれば）
            const mapScreen = document.getElementById('map-screen');
            if (mapScreen) {
                mapScreen.style.transform = `scale(${scale})`;
            }
            
            // 3. 報酬画面のサイズ変更（もし存在すれば）
            const rewardScreen = document.getElementById('reward-screen');
            if (rewardScreen) {
                rewardScreen.style.transform = `scale(${scale})`;
            }

            document.body.style.height = 'auto'; 
        });
    }

    // スタートボタン処理
    if (startBtn) {
        startBtn.addEventListener("click", () => {
            // タイトルをフェードアウト
            titleScreen.style.transition = "opacity 0.5s";
            titleScreen.style.opacity = "0";
            
            setTimeout(() => {
                titleScreen.style.display = 'none';
                
                // ゲーム開始
                gameManager.start(); 
                new DebugManager(gameManager);
                
                // ★追加：開始時に現在のスライダーの値をマップにも適用しておく
                const currentScale = zoomSlider ? zoomSlider.value : 1.0;
                const mapScreen = document.getElementById('map-screen');
                if (mapScreen) {
                    mapScreen.style.transform = `scale(${currentScale})`;
                }
                
            }, 500);
            
        }, { once: true });
    }
};