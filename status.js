import { ItemData } from './items.js';

export class StatusScreen {
  constructor(game) {
    this.game = game;
    this.selectedIndex = 0;
    this.activeTab = 'status'; // 'status' | 'items'
    this.pendingItemId = null;

    this._overlay = null;
    this._panel = null;
    this._partyEl = null;
    this._detailEl = null;
    this._msgEl = null;

    this._onKeyDown = (e) => {
      if (!this.isOpen()) return;
      if (e.key === 'Escape') this.close();
    };
  }

  init() {
    if (document.getElementById('status-overlay')) {
      this._overlay = document.getElementById('status-overlay');
      this._panel = this._overlay.querySelector('.status-panel');
      this._partyEl = this._overlay.querySelector('.status-party');
      this._detailEl = this._overlay.querySelector('.status-detail');
      this._msgEl = this._overlay.querySelector('.status-message');
      return;
    }

    const overlay = document.createElement('div');
    overlay.id = 'status-overlay';
    overlay.innerHTML = `
      <div class="status-panel" role="dialog" aria-modal="true">
        <div class="status-panel-header">
          <div class="status-panel-title">ステータス</div>
          <button class="status-close" type="button" aria-label="閉じる">✕</button>
        </div>

        <div class="status-tabs">
          <button class="status-tab is-active" type="button" data-tab="status">ステータス</button>
          <button class="status-tab" type="button" data-tab="items">どうぐ</button>
        </div>

        <div class="status-message" aria-live="polite"></div>

        <div class="status-body">
          <div class="status-party"></div>
          <div class="status-detail"></div>
        </div>
      </div>
    `;
    document.body.appendChild(overlay);

    this._overlay = overlay;
    this._panel = overlay.querySelector('.status-panel');
    this._partyEl = overlay.querySelector('.status-party');
    this._detailEl = overlay.querySelector('.status-detail');
    this._msgEl = overlay.querySelector('.status-message');

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
        const tab = tabBtn.dataset.tab;
        this.activeTab = tab;
        this.pendingItemId = null;
        this._setMessage('');
        this._render();
        return;
      }

      const memberBtn = e.target.closest('.status-member');
      if (memberBtn) {
        const idx = Number(memberBtn.dataset.index);
        if (!Number.isFinite(idx)) return;

        if (this.pendingItemId) {
          this._tryUseItem(this.pendingItemId, idx);
          return;
        }

        this.selectedIndex = idx;
        this._setMessage('');
        this._render();
        return;
      }

      const itemBtn = e.target.closest('.status-item');
      if (itemBtn) {
        const itemId = itemBtn.dataset.itemId;
        if (!itemId) return;
        this.pendingItemId = itemId;
        this._setMessage('使う相手を選んでください');
        this._render();
        return;
      }

      const cancelTargetBtn = e.target.closest('.status-cancel-target');
      if (cancelTargetBtn) {
        this.pendingItemId = null;
        this._setMessage('');
        this._render();
        return;
      }
    });

    this._render();
  }

  isOpen() {
    return !!(this._overlay && this._overlay.classList.contains('is-active'));
  }

  open() {
    if (!this._overlay) this.init();
    this._overlay.classList.add('is-active');
    document.addEventListener('keydown', this._onKeyDown);
    this._setMessage('');
    this._render();
  }

  close() {
    if (!this._overlay) return;
    this._overlay.classList.remove('is-active');
    document.removeEventListener('keydown', this._onKeyDown);
    this.pendingItemId = null;
    this._setMessage('');
  }

  toggle() {
    if (this.isOpen()) this.close();
    else this.open();
  }

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

  _render() {
    if (!this._partyEl || !this._detailEl) return;

    const party = Array.isArray(this.game?.party) ? this.game.party : [];
    if (party.length === 0) {
      this._partyEl.innerHTML = `<div class="status-empty">パーティが見つかりません</div>`;
      this._detailEl.innerHTML = ``;
      return;
    }

    if (this.selectedIndex < 0) this.selectedIndex = 0;
    if (this.selectedIndex >= party.length) this.selectedIndex = party.length - 1;

    // tabs active
    const tabs = this._overlay.querySelectorAll('.status-tab');
    tabs.forEach(btn => {
      const isActive = btn.dataset.tab === this.activeTab;
      btn.classList.toggle('is-active', isActive);
    });

    // party list
    this._partyEl.innerHTML = party.map((m, i) => {
      const hp = this._getHP(m);
      const mp = this._getMP(m);
      const maxHp = this._getMaxHP(m);
      const maxMp = this._getMaxMP(m);

      const hpPct = this._pct(hp, maxHp);
      const mpPct = this._pct(mp, maxMp);

      const isSelected = i === this.selectedIndex;
      const isTargetable = !!this.pendingItemId;

      const dead = (typeof m?.is_alive === 'function') ? !m.is_alive() : (!!m?.is_dead || hp <= 0);

      return `
        <button type="button"
          class="status-member ${isSelected ? 'is-selected' : ''} ${isTargetable ? 'is-targetable' : ''} ${dead ? 'is-dead' : ''}"
          data-index="${i}">
          <div class="status-member-top">
            <div class="status-member-name">${m?.name ?? `Member ${i+1}`}</div>
            <div class="status-member-job">${m?.job ?? ''}</div>
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

          <div class="status-substats">
            <span>ATK ${this._safeNum(m?.atk, 0)}</span>
            <span>DEF ${this._safeNum(m?.def, 0)}</span>
            <span>MATK ${this._safeNum(m?.matk, 0)}</span>
          </div>
        </button>
      `;
    }).join('');

    // detail
    if (this.activeTab === 'items') {
      this._renderItems();
      return;
    }

    const member = party[this.selectedIndex];
    const skills = this._getSkills(member);

    const skillHtml = skills.length
      ? skills.map(s => {
          if (typeof s === 'string') {
            return `<div class="status-skill"><div class="status-skill-name">${s}</div></div>`;
          }
          const name = s?.name ?? s?.id ?? 'skill';
          const mp = (s?.mp_cost ?? s?.mpCost ?? s?.cost);
          const mpTxt = Number.isFinite(Number(mp)) ? `MP ${Number(mp)}` : '';
          const desc = s?.desc ?? s?.description ?? '';
          return `
            <div class="status-skill">
              <div class="status-skill-row">
                <div class="status-skill-name">${name}</div>
                <div class="status-skill-mp">${mpTxt}</div>
              </div>
              ${desc ? `<div class="status-skill-desc">${desc}</div>` : ``}
            </div>
          `;
        }).join('')
      : `<div class="status-empty">スキルが見つかりません</div>`;

    this._detailEl.innerHTML = `
      <div class="status-detail-head">
        <div class="status-detail-title">${member?.name ?? ''}</div>
        <div class="status-detail-hint">キャラを押すと切り替え</div>
      </div>

      <div class="status-detail-section">
        <div class="status-section-title">スキル</div>
        <div class="status-skill-list">${skillHtml}</div>
      </div>

      <div class="status-detail-section">
        <div class="status-section-title">拡張枠</div>
        <div class="status-empty">装備／付け替えはここに追加</div>
      </div>
    `;
  }

  _renderItems() {
    const inv = this.game?.inventory && typeof this.game.inventory === 'object'
      ? this.game.inventory
      : {};

    const entries = Object.entries(inv)
      .map(([id, data]) => ({ id, data }))
      .filter(x => this._safeNum(x.data?.count, 0) > 0);

    const listHtml = entries.length
      ? entries.map(({ id, data }) => {
          const name = data?.name ?? ItemData?.[id]?.name ?? id;
          const desc = data?.desc ?? data?.description ?? ItemData?.[id]?.desc ?? '';
          const count = this._safeNum(data?.count, 0);
          return `
            <button type="button" class="status-item" data-item-id="${id}">
              <div class="status-item-row">
                <div class="status-item-name">${name}</div>
                <div class="status-item-count">×${count}</div>
              </div>
              ${desc ? `<div class="status-item-desc">${desc}</div>` : ``}
            </button>
          `;
        }).join('')
      : `<div class="status-empty">どうぐがありません</div>`;

    const pending = this.pendingItemId
      ? `
        <div class="status-targeting">
          <div class="status-targeting-text">対象を選択中</div>
          <button type="button" class="status-cancel-target">キャンセル</button>
        </div>
      `
      : ``;

    this._detailEl.innerHTML = `
      <div class="status-detail-head">
        <div class="status-detail-title">どうぐ</div>
        <div class="status-detail-hint">どうぐ→相手</div>
      </div>
      ${pending}
      <div class="status-item-list">${listHtml}</div>
    `;
  }

  _tryUseItem(itemId, targetIndex) {
    const party = Array.isArray(this.game?.party) ? this.game.party : [];
    const target = party[targetIndex];
    if (!target) return;

    const inv = this.game?.inventory && typeof this.game.inventory === 'object'
      ? this.game.inventory
      : {};
    const invData = inv[itemId];

    const count = this._safeNum(invData?.count, 0);
    if (count <= 0) {
      this.pendingItemId = null;
      this._setMessage('在庫がありません');
      this._render();
      return;
    }

    const base = (ItemData && ItemData[itemId]) ? ItemData[itemId] : {};
    const item = { id: itemId, ...base, ...(invData || {}) };

    const applied = this._applyItemEffect(item, target);
    if (!applied) {
      this.pendingItemId = null;
      this._setMessage('このどうぐは未対応');
      this._render();
      return;
    }

    // 消費
    invData.count = count - 1;
    if (invData.count <= 0) delete inv[itemId];

    this.pendingItemId = null;
    this._setMessage('');
    this._render();
  }

  _applyItemEffect(item, target) {
    // 1) 関数があればそれを優先
    if (typeof item?.use === 'function') {
      try {
        const r = item.use(target, this.game);
        return r !== false;
      } catch (_) {
        return false;
      }
    }

    // 2) よくあるキーだけ最小対応（存在する時だけ動く）
    const hpAdd = item?.hp ?? item?.heal ?? item?.healHp ?? item?.hpRestore;
    const mpAdd = item?.mp ?? item?.healMp ?? item?.mpRestore;
    const full = !!(item?.fullHeal ?? item?.isFullHeal);

    const reviveFlag = !!(item?.revive ?? item?.isRevive);

    let did = false;

    if (full) {
      if (typeof target?.revive === 'function') target.revive(this._getMaxHP(target));
      if (typeof target?.add_hp === 'function') target.add_hp(this._getMaxHP(target));
      if (typeof target?.add_mp === 'function') target.add_mp(this._getMaxMP(target));
      did = true;
    }

    if (!did && reviveFlag) {
      const hp = this._getHP(target);
      const dead = (typeof target?.is_alive === 'function') ? !target.is_alive() : (target?.is_dead || hp <= 0);
      if (dead && typeof target?.revive === 'function') {
        target.revive(Math.max(1, Math.floor(this._getMaxHP(target) * 0.5)));
        did = true;
      }
    }

    if (Number.isFinite(Number(hpAdd)) && typeof target?.add_hp === 'function') {
      target.add_hp(Number(hpAdd));
      did = true;
    }

    if (Number.isFinite(Number(mpAdd)) && typeof target?.add_mp === 'function') {
      target.add_mp(Number(mpAdd));
      did = true;
    }

    return did;
  }
}
