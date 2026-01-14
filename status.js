import { ItemData } from './items.js';
import { SkillData } from './skills.js';
import { GameConfig } from './game_config.js';

export class StatusScreen {
  constructor(game) {
    this.game = game;
    this.selectedIndex = 0;
    this.activeTab = 'status'; // 'status' | 'skills' | 'items'
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

        <div class="status-body">
          <div class="status-party"></div>
          <div class="status-main">
            <div class="status-tabs">
              <button class="status-tab is-active" type="button" data-tab="status">ステータス</button>
              <button class="status-tab" type="button" data-tab="skills">スキル</button>
              <button class="status-tab" type="button" data-tab="items">どうぐ</button>
            </div>
            <div class="status-message" aria-live="polite"></div>
            <div class="status-detail"></div>
          </div>
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
        this.setTab(tab);
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

        this.setMember(idx);
        return;
      }

      const itemBtn = e.target.closest('.status-item');
      if (itemBtn) {
        const itemId = itemBtn.dataset.itemId;
        if (!itemId) return;
        this._handleItemSelect(itemId);
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

  refresh() {
    this._render();
  }

  setTab(tab) {
    const next = ['status', 'skills', 'items'].includes(tab) ? tab : 'status';
    this.activeTab = next;
    this.pendingItemId = null;
    this._setMessage('');
    this._render();
  }

  setMember(index) {
    this.selectedIndex = index;
    this.pendingItemId = null;
    this._setMessage('');
    this._render();
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

  _getMemberFace(member) {
    const job = member?.job;
    if (job === GameConfig.JOBS.HERO) return GameConfig.ASSETS.IMAGES.HERO_ICON;
    if (job === GameConfig.JOBS.WIZARD) return GameConfig.ASSETS.IMAGES.WIZARD_ICON;
    if (job === GameConfig.JOBS.HEALER) return GameConfig.ASSETS.IMAGES.HEALER_ICON;
    return member?.img || GameConfig.ASSETS.IMAGES.ENEMY_FALLBACK;
  }

  _getStatusEntries(member) {
    return [
      { label: 'ATK', value: this._safeNum(member?.atk, 0) },
      { label: 'DEF', value: this._safeNum(member?.def, 0) },
      { label: 'MATK', value: this._safeNum(member?.matk, 0) },
      { label: 'MDEF', value: this._safeNum(member?.mdef, 0) },
      { label: 'SPD', value: this._safeNum(member?.spd, 0) },
      { label: 'REC', value: this._safeNum(member?.rec, 0) }
    ];
  }

  _getInventory() {
    return this.game?.inventory && typeof this.game.inventory === 'object'
      ? this.game.inventory
      : {};
  }

  _getItemData(itemId) {
    const inv = this._getInventory();
    const invData = inv[itemId] || {};
    const base = (ItemData && ItemData[itemId]) ? ItemData[itemId] : {};
    return { id: itemId, ...base, ...invData };
  }

  _isReviveItem(item) {
    return item?.id === 'phoenix' || item?.type === 'revive' || item?.effect === 'revive';
  }

  _getItemTargetType(item) {
    if (item?.target === 'all' || item?.scope === 'all' || item?.targetType === 'all') return 'all';
    if (item?.target === 'self') return 'self';
    return 'single';
  }

  _getValidItemTargets(item, party) {
    const alive = party.filter(m => (typeof m?.is_alive === 'function') ? m.is_alive() : !(m?.is_dead) && this._getHP(m) > 0);
    const dead = party.filter(m => (typeof m?.is_alive === 'function') ? !m.is_alive() : (m?.is_dead || this._getHP(m) <= 0));

    if (this._isReviveItem(item)) return dead;
    if (this._getItemTargetType(item) === 'self') return [party[this.selectedIndex]].filter(Boolean);
    return alive;
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

    const pendingItem = this.pendingItemId ? this._getItemData(this.pendingItemId) : null;
    const pendingTargets = pendingItem ? this._getValidItemTargets(pendingItem, party) : [];
    const pendingTargetSet = new Set(pendingTargets.map(m => party.indexOf(m)).filter(i => i >= 0));

    // party list
    this._partyEl.innerHTML = party.map((m, i) => {
      const hp = this._getHP(m);
      const mp = this._getMP(m);
      const maxHp = this._getMaxHP(m);
      const maxMp = this._getMaxMP(m);

      const hpPct = this._pct(hp, maxHp);
      const mpPct = this._pct(mp, maxMp);

      const isSelected = i === this.selectedIndex;
      const isTargeting = !!this.pendingItemId;
      const isTargetable = isTargeting ? pendingTargetSet.has(i) : false;
      const isUntargetable = isTargeting && !isTargetable;

      const dead = (typeof m?.is_alive === 'function') ? !m.is_alive() : (!!m?.is_dead || hp <= 0);
      const face = this._getMemberFace(m);

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
    const stats = this._getStatusEntries(member);

    const statHtml = stats.map(stat => `
      <div class="status-stat">
        <div class="status-stat-label">${stat.label}</div>
        <div class="status-stat-value">${stat.value}</div>
      </div>
    `).join('');

    this._detailEl.innerHTML = `
      <div class="status-detail-head">
        <div class="status-detail-title">${member?.name ?? ''}</div>
        <div class="status-detail-hint">キャラを押すと切り替え</div>
      </div>

      <div class="status-detail-section">
        <div class="status-section-title">基礎能力</div>
        <div class="status-stat-list">${statHtml}</div>
      </div>
    `;
  }

  _renderSkills(member) {
    const skills = this._getSkills(member);
    const currentMp = this._getMP(member);

    const skillHtml = skills.length
      ? skills.map(s => this._renderSkillCard(s, currentMp)).join('')
      : `<div class="status-empty">スキルが見つかりません</div>`;

    this._detailEl.innerHTML = `
      <div class="status-detail-head">
        <div class="status-detail-title">${member?.name ?? ''}</div>
        <div class="status-detail-hint">スキル一覧</div>
      </div>

      <div class="status-detail-section">
        <div class="status-section-title">スキル</div>
        <div class="status-skill-list">${skillHtml}</div>
      </div>
    `;
  }

  _renderSkillCard(skill, currentMp) {
    const skillObj = typeof skill === 'string' ? (SkillData?.[skill] || { id: skill }) : skill;
    const name = skillObj?.name ?? skillObj?.id ?? 'skill';
    const mpCost = this._safeNum(skillObj?.cost ?? skillObj?.mp_cost ?? skillObj?.mpCost, 0);
    const target = skillObj?.target ?? '';

    const mpTxt = mpCost > 0 ? `MP ${mpCost}` : 'MP 0';
    const targetTxt = target === 'all' ? '全体' : target === 'self' ? '自分' : target ? '単体' : '';
    const desc = skillObj?.desc ?? skillObj?.description ?? '';
    const isDisabled = mpCost > 0 && currentMp < mpCost;

    return `
      <div class="status-skill ${isDisabled ? 'is-disabled' : ''}">
        <div class="status-skill-row">
          <div class="status-skill-name">${name}</div>
          <div class="status-skill-meta">
            <span class="status-skill-mp">${mpTxt}</span>
            ${targetTxt ? `<span class="status-skill-target">${targetTxt}</span>` : ''}
          </div>
        </div>
        ${desc ? `<div class="status-skill-desc">${desc}</div>` : ''}
        ${isDisabled ? `<div class="status-skill-reason">MP不足</div>` : ''}
      </div>
    `;
  }

  _renderItems() {
    const inv = this._getInventory();

    const entries = Object.entries(inv)
      .map(([id, data]) => ({ id, data }))
      .filter(x => this._safeNum(x.data?.count, 0) > 0);

    const listHtml = entries.length
      ? entries.map(({ id, data }) => {
          const item = this._getItemData(id);
          const name = data?.name ?? ItemData?.[id]?.name ?? id;
          const desc = data?.desc ?? data?.description ?? ItemData?.[id]?.desc ?? '';
          const count = this._safeNum(data?.count, 0);
          const targets = this._getValidItemTargets(item, Array.isArray(this.game?.party) ? this.game.party : []);
          const isDisabled = targets.length === 0;
          const targetType = this._getItemTargetType(item);
          const targetLabel = targetType === 'all' ? '全体' : targetType === 'self' ? '自分' : '単体';
          return `
            <button type="button" class="status-item ${isDisabled ? 'is-disabled' : ''}" data-item-id="${id}" ${isDisabled ? 'disabled' : ''}>
              <div class="status-item-row">
                <div class="status-item-name">${name}</div>
                <div class="status-item-count">×${count}</div>
              </div>
              <div class="status-item-meta">${targetLabel}</div>
              ${desc ? `<div class="status-item-desc">${desc}</div>` : ``}
              ${isDisabled ? `<div class="status-item-reason">使用不可</div>` : ``}
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

  _handleItemSelect(itemId) {
    const item = this._getItemData(itemId);
    const party = Array.isArray(this.game?.party) ? this.game.party : [];
    const targets = this._getValidItemTargets(item, party);
    if (targets.length === 0) {
      this._setMessage('使用できる相手がいません');
      this._render();
      return;
    }

    const targetType = this._getItemTargetType(item);
    if (targetType === 'self') {
      this._useItemOnTargets(item, targets);
      return;
    }
    if (targetType === 'all') {
      this._useItemOnTargets(item, targets);
      return;
    }

    this.pendingItemId = itemId;
    this._setMessage('使う相手を選んでください');
    this._render();
  }

  _useItemOnTargets(item, targets) {
    if (!targets.length) return;

    const inv = this._getInventory();
    const invData = inv[item.id];
    const count = this._safeNum(invData?.count, 0);
    if (count <= 0) {
      this.pendingItemId = null;
      this._setMessage('在庫がありません');
      this._render();
      return;
    }

    let appliedAny = false;
    targets.forEach(target => {
      if (this._applyItemEffect(item, target)) {
        appliedAny = true;
      }
    });

    if (!appliedAny) {
      this.pendingItemId = null;
      this._setMessage('このどうぐは未対応');
      this._render();
      return;
    }

    invData.count = count - 1;
    if (invData.count <= 0) delete inv[item.id];

    this.pendingItemId = null;
    this._setMessage('');
    this._render();
  }

  _tryUseItem(itemId, targetIndex) {
    const party = Array.isArray(this.game?.party) ? this.game.party : [];
    const target = party[targetIndex];
    if (!target) return;

    const item = this._getItemData(itemId);
    const inv = this._getInventory();
    const invData = inv[itemId];

    const count = this._safeNum(invData?.count, 0);
    if (count <= 0) {
      this.pendingItemId = null;
      this._setMessage('在庫がありません');
      this._render();
      return;
    }

    const validTargets = this._getValidItemTargets(item, party);
    if (!validTargets.includes(target)) {
      this._setMessage('その相手には使えません');
      this._render();
      return;
    }

    const applied = this._applyItemEffect(item, target);
    if (!applied) {
      this.pendingItemId = null;
      this._setMessage('このどうぐは未対応');
      this._render();
      return;
    }

    invData.count = count - 1;
    if (invData.count <= 0) delete inv[itemId];

    this.pendingItemId = null;
    this._setMessage('');
    this._render();
  }

  _applyItemEffect(item, target) {
    if (typeof item?.use === 'function') {
      const r = item.use(target, this.game);
      return r !== false;
    }

    if (item.id === 'phoenix') {
      if (typeof target?.revive === 'function') {
        target.revive(Math.floor(this._getMaxHP(target) * (item.value ?? 0.5)));
        return true;
      }
      return false;
    }

    if (item.id === 'elixir') {
      if (typeof target?.add_hp === 'function') target.add_hp(this._getMaxHP(target));
      if (typeof target?.add_mp === 'function') target.add_mp(this._getMaxMP(target));
      return true;
    }

    if (item.type === 'hp_heal' && typeof target?.add_hp === 'function') {
      target.add_hp(this._safeNum(item.value, 0));
      return true;
    }

    if (item.type === 'mp_heal' && typeof target?.add_mp === 'function') {
      target.add_mp(this._safeNum(item.value, 0));
      return true;
    }

    const hpAdd = item?.hp ?? item?.heal ?? item?.healHp ?? item?.hpRestore;
    const mpAdd = item?.mp ?? item?.healMp ?? item?.mpRestore;

    let did = false;
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
