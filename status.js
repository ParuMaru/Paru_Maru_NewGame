///
/// 役割: ステータス/スキル/アイテム画面の表示と選択処理を担当する。
/// 入出力: GameManagerからパーティ/所持品を参照し、DOM操作で表示を更新する。
/// 関連: game_manager.js, items.js, skills.js
///
import { ItemData } from './items.js';
import { SkillData } from './skills.js';
import { GameConfig } from './game_config.js';

/**
 * ステータス画面のUIと入力を管理する。
 * @class
 */
export class StatusScreen {
    /**
     * 参照するゲーム状態を保持する。
     * @param {GameManager} game - ゲーム全体マネージャー。
     */
    constructor(game) {
        this.game = game;
        this.selectedIndex = 0;
        this.activeTab = 'status';
        this.pendingAction = null;
        this.selectedSkillId = null;

        this._overlay = null;
        this._partyEl = null;
        this._detailEl = null;
        this._msgEl = null;

        this._onKeyDown = (e) => {
            if (!this.isOpen()) return;
            if (e.key === 'Escape') this.close();
        };
    }

    /**
     * ステータス画面のDOMを初期化する。
     * 副作用: DOMイベントを登録する。
     */
    init() {
        // 描画: UI要素の生成と初期化
        const existing = document.getElementById('status-overlay');
        if (existing) {
            this._overlay = existing;
            this._partyEl = existing.querySelector('.status-party');
            this._detailEl = existing.querySelector('.status-content');
            this._msgEl = existing.querySelector('.status-message');
            return;
        }

        const overlay = document.createElement('div');
        overlay.id = 'status-overlay';
        overlay.className = 'status-overlay';
        overlay.innerHTML = `
            <div class="status-window" role="dialog" aria-modal="true" aria-labelledby="status-title">
                <div class="status-header">
                    <div class="status-title" id="status-title">ステータス</div>
                    <button class="status-close" type="button" aria-label="閉じる">✕</button>
                </div>
                <div class="status-body">
                    <div class="status-party"></div>
                    <div class="status-panel">
                        <div class="status-tabs">
                            <button class="status-tab is-active" type="button" data-tab="status">ステータス</button>
                            <button class="status-tab" type="button" data-tab="skills">スキル</button>
                            <button class="status-tab" type="button" data-tab="items">どうぐ</button>
                        </div>
                        <div class="status-message" aria-live="polite"></div>
                        <div class="status-content"></div>
                    </div>
                </div>
            </div>
        `;
        document.body.appendChild(overlay);

        this._overlay = overlay;
        this._partyEl = overlay.querySelector('.status-party');
        this._detailEl = overlay.querySelector('.status-content');
        this._msgEl = overlay.querySelector('.status-message');

        // クリック処理: タブ/行/キャンセルなどのイベントを集約
        overlay.addEventListener('click', (e) => {
            if (e.target === overlay) this.close();
        });

        overlay.addEventListener('click', (e) => {
            const closeBtn = e.target.closest('.status-close');
            if (closeBtn) {
                this.close();
                return;
            }

            const tabBtn = e.target.closest('.status-tab');
            if (tabBtn) {
                this.setTab(tabBtn.dataset.tab);
                return;
            }

            const memberBtn = e.target.closest('.status-member');
            if (memberBtn) {
                const idx = Number(memberBtn.dataset.index);
                if (!Number.isFinite(idx)) return;
                if (this.pendingAction?.targetType === 'single') {
                    this._executePending(idx);
                    return;
                }
                this.setMember(idx);
                return;
            }

            const skillRow = e.target.closest('[data-action="select-skill"]');
            if (skillRow) {
                const skillId = skillRow.dataset.skillId;
                if (!skillId) return;
                this._handleSkillSelect(skillId);
                return;
            }

            const useItemBtn = e.target.closest('[data-action="use-item"]');
            if (useItemBtn) {
                const itemId = useItemBtn.dataset.itemId;
                if (!itemId) return;
                this._handleItemSelect(itemId);
                return;
            }

            const cancelBtn = e.target.closest('.status-cancel-target');
            if (cancelBtn) {
                this.pendingAction = null;
                this._setMessage('');
                this._render();
            }
        });

        this._render();
    }

    // 描画: 表示状態
    /**
     * ステータス画面が開いているかを判定する。
     * @returns {boolean}
     */
    isOpen() {
        return !!(this._overlay && this._overlay.classList.contains('is-open'));
    }

    // 描画: 開閉
    /**
     * ステータス画面を開く。
     * 副作用: DOMの表示状態とイベントを更新する。
     */
    open() {
        if (!this._overlay) this.init();
        this._overlay.classList.add('is-open');
        document.addEventListener('keydown', this._onKeyDown);
        this._setMessage('');
        this._render();
    }

    /**
     * ステータス画面を閉じる。
     * 副作用: DOMの表示状態とイベントを更新する。
     */
    close() {
        if (!this._overlay) return;
        this._overlay.classList.remove('is-open');
        document.removeEventListener('keydown', this._onKeyDown);
        this.pendingAction = null;
        this._setMessage('');
    }

    /**
     * 表示内容を最新状態へ再描画する。
     * 副作用: UI表示を更新する。
     */
    refresh() {
        this._render();
    }

    // 描画: タブ切替
    /**
     * 表示タブを切り替える。
     * @param {string} tab - タブID。
     * 副作用: UI表示を更新する。
     */
    setTab(tab) {
        // タブ切替とUI再描画（UI更新のみ）
        const next = ['status', 'skills', 'items'].includes(tab) ? tab : 'status';
        this.activeTab = next;
        this.pendingAction = null;
        if (next !== 'skills') this.selectedSkillId = null;
        this._setMessage('');
        this._render();
    }

    // 描画: メンバー切替
    /**
     * 対象メンバーを切り替える。
     * @param {number} index - パーティインデックス。
     * 副作用: UI表示を更新する。
     */
    setMember(index) {
        // キャラ選択変更とUI再描画（UI更新のみ）
        this.selectedIndex = index;
        this.pendingAction = null;
        this.selectedSkillId = null;
        this._setMessage('');
        this._render();
    }

    // ユーティリティ
    _setMessage(text) {
        if (!this._msgEl) return;
        this._msgEl.textContent = text || '';
    }

    _safeNum(v, fallback = 0) {
        return Number.isFinite(Number(v)) ? Number(v) : fallback;
    }

    _getHP(m) { return this._safeNum(m?.hp ?? m?._hp, 0); }
    _getMP(m) { return this._safeNum(m?.mp ?? m?._mp, 0); }
    _getMaxHP(m) { return this._safeNum(m?.max_hp ?? m?.maxHp ?? m?.hp ?? m?._hp, this._getHP(m)); }
    _getMaxMP(m) { return this._safeNum(m?.max_mp ?? m?.maxMp ?? m?.mp ?? m?._mp, this._getMP(m)); }

    _pct(cur, max) {
        const c = this._safeNum(cur, 0);
        const m = Math.max(1, this._safeNum(max, 1));
        return Math.max(0, Math.min(100, (c / m) * 100));
    }

    _getSkills(member) {
        const candidates = [
            member?.skills,
            member?.skill_list,
            member?.skillList,
            member?.magics,
            member?.magic,
            member?.spells
        ].filter(Boolean);

        const arr = candidates.find(v => Array.isArray(v));
        return Array.isArray(arr) ? arr : [];
    }

    _isUniqueSkill(skill) {
        const menu = skill?.menu;
        return menu === GameConfig.SKILL_MENUS.MAIN || menu === 'main';
    }

    _isMapExecutableSkill(skill) {
        const skillId = skill?.id ?? skill;
        const recoveryIds = new Set(['heal', 'medica', 'raise']);
        if (recoveryIds.has(skillId)) return !this._isUniqueSkill(skill);
        return false;
    }

    _getSkillTags(skill) {
        const tags = [];
        const targetType = skill?.target ?? 'single';
        const targetLabel = targetType === 'all' ? '全体' : '単体';
        tags.push(targetLabel);

        const isAttackSkill = ['physical', 'magic'].includes(skill?.type);
        if (isAttackSkill) {
            const elementTag = skill?.attackTag ?? skill?.elementTag ?? '';
            const elementLabelMap = {
                fire: '炎',
                ice: '氷',
                holy: '聖',
                slash: '斬'
            };
            const elementLabel = elementLabelMap[elementTag];
            if (elementLabel) tags.push(elementLabel);
        }

        return tags;
    }

    _getMemberFace(member) {
        const job = member?.job;
        if (job === GameConfig.JOBS.HERO) return GameConfig.ASSETS.IMAGES.HERO_ICON;
        if (job === GameConfig.JOBS.WIZARD) return GameConfig.ASSETS.IMAGES.WIZARD_ICON;
        if (job === GameConfig.JOBS.HEALER) return GameConfig.ASSETS.IMAGES.HEALER_ICON;
        return member?.img || GameConfig.ASSETS.IMAGES.ENEMY_FALLBACK;
    }

    // 描画: ステータス画面全体
    _render() {
        // ステータス画面全体を描画（UI更新のみ）
        if (!this._partyEl || !this._detailEl) return;

        const party = Array.isArray(this.game?.party) ? this.game.party : [];
        if (!party.length) {
            this._partyEl.innerHTML = `<div class="status-empty">パーティが見つかりません</div>`;
            this._detailEl.innerHTML = ``;
            return;
        }
        const JOB_NAMES = {
            'hero': '勇者',
            'wizard': '魔法使い',
            'healer': '癒し手',
        };

        if (this.selectedIndex < 0) this.selectedIndex = 0;
        if (this.selectedIndex >= party.length) this.selectedIndex = party.length - 1;

        const tabs = this._overlay.querySelectorAll('.status-tab');
        tabs.forEach(btn => {
            const isActive = btn.dataset.tab === this.activeTab;
            btn.classList.toggle('is-active', isActive);
        });

        const pendingInfo = this._getPendingInfo();
        const pendingTargets = pendingInfo?.targets || [];
        const pendingTargetSet = new Set(pendingTargets.map(m => party.indexOf(m)).filter(i => i >= 0));

        this._partyEl.innerHTML = party.map((m, i) => {
            const hp = this._getHP(m);
            const mp = this._getMP(m);
            const maxHp = this._getMaxHP(m);
            const maxMp = this._getMaxMP(m);
            const hpPct = this._pct(hp, maxHp);
            const mpPct = this._pct(mp, maxMp);

            const isSelected = i === this.selectedIndex;
            const isTargeting = this.pendingAction?.targetType === 'single';
            const isTargetable = isTargeting ? pendingTargetSet.has(i) : false;
            const isUntargetable = isTargeting && !isTargetable;

            const dead = (typeof m?.is_alive === 'function') ? !m.is_alive() : (!!m?.is_dead || hp <= 0);
            const face = this._getMemberFace(m);
            
            const jobDisplayName = JOB_NAMES[m?.job] || m?.job || '';

            return `
                <button type="button"
                    class="status-member ${isSelected ? 'is-selected' : ''} ${isTargetable ? 'is-targetable' : ''} ${isUntargetable ? 'is-untargetable' : ''} ${dead ? 'is-dead' : ''}"
                    data-index="${i}" ${isUntargetable ? 'disabled' : ''}>
                    <div class="status-member-face">
                        <img src="${face}" alt="${m?.name ?? `Member ${i + 1}`}">
                    </div>
                    <div class="status-member-info">
                        <div class="status-member-top">
                            <div class="status-member-name">${m?.name ?? `Member ${i + 1}`}</div>
                            <div class="status-member-job">${jobDisplayName}</div>
                        </div>

                        <div class="status-bar">
                            <div class="status-bar-label">HP</div>
                            <div class="status-bar-track"><div class="status-bar-fill" style="width:${hpPct}%"></div></div>
                            <div class="status-bar-num">${hp}/${maxHp}</div>
                        </div>

                        <div class="status-bar">
                            <div class="status-bar-label">MP</div>
                            <div class="status-bar-track"><div class="status-bar-fill mp" style="width:${mpPct}%"></div></div>
                            <div class="status-bar-num">${mp}/${maxMp}</div>
                        </div>
                    </div>
                </button>
            `;
        }).join('');

        this._renderTabContent(party[this.selectedIndex]);
    }

    _renderTabContent(member) {
        if (!member) return;

        switch (this.activeTab) {
            case 'skills':
                this._renderSkills(member);
                break;
            case 'items':
                this._renderItems();
                break;
            case 'status':
            default:
                this._renderStatus(member);
                break;
        }
    }

    _renderStatus(member) {
        const stats = [
            { label: 'ATK', value: this._safeNum(member?.atk, 0) },
            { label: 'DEF', value: this._safeNum(member?.def, 0) },
            { label: 'MATK', value: this._safeNum(member?.matk, 0) },
            { label: 'MDEF', value: this._safeNum(member?.mdef, 0) },
            { label: 'SPD', value: this._safeNum(member?.spd, 0) },
            { label: 'REC', value: this._safeNum(member?.rec, 0) }
        ];
        const JOB_NAMES = {
            'hero': '勇者',
            'wizard': '魔法使い',
            'healer': '癒し手',
        };
        const jobDisplayName = JOB_NAMES[member?.job] || member?.job || '';
        

        const statRows = stats.map(stat => `
            <div class="status-row">
                <div class="status-row-top">
                    <div class="status-row-title">${stat.label}</div>
                    <div class="status-row-right">${stat.value}</div>
                </div>
            </div>
        `).join('');

        this._detailEl.innerHTML = `
            <div class="status-section">
                <div class="status-section-title">${member?.name ?? ''}</div>
                <div class="status-row">
                    <div class="status-row-top">
                        <div class="status-row-title">職業</div>
                        <div class="status-row-right">${jobDisplayName}</div>
                    </div>
                </div>
            </div>
            <div class="status-section">
                <div class="status-section-title">基礎能力</div>
                <div class="status-list">${statRows}</div>
            </div>
        `;
    }

    _renderSkills(member) {
        const skills = this._getSkills(member);
        const entries = skills.map((s) => {
            const skillObj = typeof s === 'string' ? (SkillData?.[s] || { id: s }) : s;
            const skillId = skillObj?.id ?? s;
            const name = skillObj?.name ?? skillId ?? 'skill';
            const mpCost = this._safeNum(skillObj?.cost ?? skillObj?.mp_cost ?? skillObj?.mpCost, 0);
            const desc = skillObj?.desc ?? skillObj?.desc ?? '';
            const tags = this._getSkillTags(skillObj);
            const isUnique = this._isUniqueSkill(skillObj);
            return { id: skillId, skill: skillObj, name, mpCost, desc, tags, isUnique };
        }).filter(entry => entry.id);

        if (!entries.length) {
            this._detailEl.innerHTML = `
                ${this._renderPendingBanner()}
                <div class="status-section">
                    <div class="status-section-title">スキル一覧</div>
                    <div class="status-empty">スキルが見つかりません</div>
                </div>
            `;
            return;
        }

        if (!entries.find(entry => entry.id === this.selectedSkillId)) {
            this.selectedSkillId = entries[0].id;
        }

        const uniqueRows = entries
            .filter(entry => entry.isUnique)
            .map(entry => this._buildSkillRow(entry))
            .join('');
        const normalRows = entries
            .filter(entry => !entry.isUnique)
            .map(entry => this._buildSkillRow(entry))
            .join('');

        this._detailEl.innerHTML = `
            ${this._renderPendingBanner()}
            <div class="status-section">
                <div class="status-section-title">固有スキル</div>
                <div class="status-list">
                    ${uniqueRows || `<div class="status-empty">固有スキルがありません</div>`}
                </div>
            </div>
            <div class="status-section">
                <div class="status-section-title">スキル一覧</div>
                <div class="status-list">
                    ${normalRows || `<div class="status-empty">通常スキルがありません</div>`}
                </div>
            </div>
        `;
    }

    _renderItems() {
        const inv = this.game?.inventory && typeof this.game.inventory === 'object'
            ? this.game.inventory
            : {};

        const entries = Object.entries(inv)
            .map(([id, data]) => ({ id, data }));

        const listHtml = entries.length
            ? entries.map(({ id, data }) => {
                const base = ItemData?.[id] || {};
                const item = { id, ...base, ...data };
                const name = item?.name ?? id;
                const desc = item?.desc ?? item?.desc ?? '';
                const count = this._safeNum(data?.count, 0);
                const { targets } = this.game.getItemMapInfo(id);
                const isDisabled = targets.length === 0 || count <= 0;
                return this._buildItemRow({
                    id,
                    name,
                    desc,
                    count,
                    isDisabled
                });
            }).join('')
            : `<div class="status-empty">どうぐがありません</div>`;

        this._detailEl.innerHTML = `
            ${this._renderPendingBanner()}
            <div class="status-section">
                <div class="status-section-title">どうぐ</div>
                <div class="status-list">${listHtml}</div>
            </div>
        `;
    }

    _buildRow({ title, right, tags = [], desc = '', action = '', rowClass = '' }) {
        const tagHtml = tags.length
            ? `<div class="status-row-tags">${tags.map(t => `<span class="status-tag">${t}</span>`).join('')}</div>`
            : '';
        const descHtml = desc ? `<div class="status-row-desc">${desc}</div>` : '';
        const actionHtml = action ? `<div class="status-row-actions">${action}</div>` : '';

        return `
            <div class="status-row ${rowClass}">
                <div class="status-row-top">
                    <div class="status-row-title">${title}</div>
                    <div class="status-row-right">${right}</div>
                </div>
                ${tagHtml}
                ${descHtml}
                ${actionHtml}
            </div>
        `;
    }

    _buildSkillRow(entry) {
        const tagHtml = entry.tags.length
            ? `<div class="status-row-tags">${entry.tags.map(t => `<span class="status-tag">${t}</span>`).join('')}</div>`
            : '';
        const descHtml = entry.desc ? `<div class="status-row-desc">${entry.desc}</div>` : '';
        const isSelected = entry.id === this.selectedSkillId;

        return `
            <button type="button"
                class="status-row status-row--clickable ${isSelected ? 'is-selected' : ''}"
                data-action="select-skill" data-skill-id="${entry.id}">
                <div class="status-row-top">
                    <div class="status-row-title">${entry.name}</div>
                    <div class="status-row-right">MP ${entry.mpCost}</div>
                </div>
                ${tagHtml}
                ${descHtml}
            </button>
        `;
    }

    _buildItemRow(entry) {
        // どうぐは「名前 + 説明 + 所持数」を1枚のカードにまとめる
        // 使用できない場合はクリック不可＆薄く表示
        const right = `×${entry.count}`;
        const descHtml = entry.desc ? `<div class="status-row-desc">${entry.desc}</div>` : '';

        if (entry.isDisabled) {
            return `
                <div class="status-row is-disabled">
                    <div class="status-row-top">
                        <div class="status-row-title">${entry.name}</div>
                        <div class="status-row-right">${right}</div>
                    </div>
                    ${descHtml}
                </div>
            `;
        }

        return `
            <button type="button"
                class="status-row status-row--clickable"
                data-action="use-item" data-item-id="${entry.id}">
                <div class="status-row-top">
                    <div class="status-row-title">${entry.name}</div>
                    <div class="status-row-right">${right}</div>
                </div>
                ${descHtml}
            </button>
        `;
    }

    _renderPendingBanner() {
        if (!this.pendingAction) return '';
        return `
            <div class="status-targeting">
                <div class="status-targeting-text">対象を選択中</div>
                <button type="button" class="status-cancel-target">キャンセル</button>
            </div>
        `;
    }

    // ターゲット選択: どうぐ
    _handleItemSelect(itemId) {
        // どうぐ使用の対象選択や即時実行（HP/MP・所持数変更あり）
        const info = this.game.getItemMapInfo(itemId);
        if (!info.item) {
            this._setMessage('使用できません');
            this._render();
            return;
        }

        if (info.targets.length === 0) {
            this._setMessage('使用できる相手がいません');
            this._render();
            return;
        }

        if (info.targetType === 'self') {
            this._executeItem(itemId, this.selectedIndex);
            return;
        }

        if (info.targetType === 'all') {
            this._executeItem(itemId, null);
            return;
        }

        this.pendingAction = { type: 'item', id: itemId, targetType: 'single' };
        this._setMessage('使う相手を選んでください');
        this._render();
    }

    // ターゲット選択: スキル
    _handleSkillSelect(skillId) {
        // スキル選択と実行判定（回復スキルのみ実行）
        const skillObj = SkillData?.[skillId] || { id: skillId };
        this.selectedSkillId = skillObj?.id ?? skillId;
        this.pendingAction = null;
        this._setMessage('');

        if (!this._isMapExecutableSkill(skillObj)) {
            this._render();
            return;
        }

        const info = this.game.getSkillMapInfo(this.selectedIndex, skillId);
        if (!info.skill) {
            this._render();
            return;
        }

        if (!info.usable) {
            this._setMessage(info.reason);
            this._render();
            return;
        }

        if (info.targetType === 'self') {
            this._executeSkill(skillId, this.selectedIndex);
            return;
        }

        if (info.targetType === 'all') {
            this._executeSkill(skillId, null);
            return;
        }

        this.pendingAction = { type: 'skill', id: skillId, actorIndex: this.selectedIndex, targetType: 'single' };
        this._setMessage('対象を選んでください');
        this._render();
    }

    // ターゲット選択: 実行
    _executePending(targetIndex) {
        const pending = this.pendingAction;
        if (!pending) return;

        if (pending.type === 'item') {
            this._executeItem(pending.id, targetIndex);
            return;
        }

        if (pending.type === 'skill') {
            this._executeSkill(pending.id, targetIndex, pending.actorIndex ?? this.selectedIndex);
        }
    }

    // 実行: どうぐ
    _executeItem(itemId, targetIndex) {
        // どうぐ効果を適用してUIを更新（HP/MP・所持数変更あり）
        const result = this.game.useItemOnMap(itemId, targetIndex);
        if (!result.success) {
            this._setMessage(result.message || '使用できません');
        } else {
            this._setMessage(result.message || '');
        }
        this.pendingAction = null;
        this._render();
    }

    // 実行: スキル
    _executeSkill(skillId, targetIndex, actorIndex = this.selectedIndex) {
        // スキル効果を適用してUIを更新（HP/MP変更あり）
        const result = this.game.useSkillOnMap(actorIndex, skillId, targetIndex);
        if (!result.success) {
            this._setMessage(result.message || '使用できません');
        } else {
            this._setMessage(result.message || '');
        }
        this.pendingAction = null;
        this._render();
    }

    // ユーティリティ: 対象候補
    _getPendingInfo() {
        const pending = this.pendingAction;
        if (!pending) return null;

        if (pending.type === 'item') {
            return this.game.getItemMapInfo(pending.id);
        }

        if (pending.type === 'skill') {
            return this.game.getSkillMapInfo(pending.actorIndex ?? this.selectedIndex, pending.id);
        }

        return null;
    }
}
