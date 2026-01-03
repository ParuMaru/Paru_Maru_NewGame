import { GameManager } from './game_manager.js';
import { DebugManager } from './debug_manager.js';

window.onload = () => {
    // GameManagerの準備（まだ開始はしない）
    const gameManager = new GameManager(); 
    
    const startBtn = document.getElementById('game-start-btn'); 
    const titleScreen = document.getElementById('title-screen');
    const zoomSlider = document.getElementById('zoom-slider');
    const gameWrapper = document.getElementById('game-wrapper');

    // スライダー機能
    if (zoomSlider && gameWrapper) {
        zoomSlider.value = 1.0;
        gameWrapper.style.transform = 'scale(1.0)';

        zoomSlider.addEventListener('input', (e) => {
            const scale = e.target.value;
            gameWrapper.style.transform = `scale(${scale})`;
            document.body.style.height = 'auto'; 
        });
    }

    // スタートボタン処理
    if (startBtn) {
        startBtn.addEventListener("click", () => {
            // 1. タイトル画面をフェードアウト
            titleScreen.style.transition = "opacity 0.5s";
            titleScreen.style.opacity = "0";
            
            setTimeout(() => {
                titleScreen.style.display = 'none';
                
                // 2. ゲーム開始（マップ画面を表示）
                gameManager.start(); 
                
                // 3. デバッグ機能ON
                new DebugManager(gameManager);
            }, 500);
            
        }, { once: true });
    }
};