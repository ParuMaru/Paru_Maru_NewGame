import { BattleManager } from './battle_manager.js';
import { DebugManager } from './debug_manager.js';

window.onload = () => {
    const game = new BattleManager();
    const startBtn = document.getElementById('start-button');
    const overlay = document.getElementById('start-overlay');
    const zoomSlider = document.getElementById('zoom-slider');
    const gameWrapper = document.getElementById('game-wrapper');

    // ★追加：起動時にスマホの画面幅に合わせて自動リサイズする機能
    if (zoomSlider && gameWrapper) {
        // 1. 画面の幅を取得（スマホの横幅）
        const screenWidth = window.innerWidth;
        
        // 2. ゲームの基本幅（600px）に対して、どれくらい縮小すべきか計算
        // （最大でも1.0倍、画面が小さければ0.8倍...のように縮む）
        let initialScale = Math.min(screenWidth / 600, 1.0);
        
        // 少し余白を持たせるために 0.95倍くらいにする（お好みで）
        if (initialScale < 1.0) initialScale *= 0.95;

        // 3. 計算したサイズを適用
        zoomSlider.value = initialScale;
        gameWrapper.style.transform = `scale(${initialScale})`;
        
        // スライダーを動かした時の処理（前回と同じ）
        zoomSlider.addEventListener('input', (e) => {
            const scale = e.target.value;
            gameWrapper.style.transform = `scale(${scale})`;
            document.body.style.height = 'auto'; 
        });
    }

    if (startBtn) {
        startBtn.addEventListener("click", () => {
            game.init(); 
            overlay.style.display = 'none';
            new DebugManager(game);
        }, { once: true });
    }
};