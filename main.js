// main.js
import { BattleManager } from './battle_manager.js';

// ページ読み込み完了時のエントリーポイント
window.onload = () => {
    // 新しいモジュール版のバトルマネージャーを起動
    const game = new BattleManager();
    const startBtn = document.getElementById('start-button');
    const overlay = document.getElementById('start-overlay');

    startBtn.addEventListener("click", () => {
        game.init(); // battle_manager.js の init() を呼ぶ
        overlay.style.display = 'none';
    }, { once: true });
};