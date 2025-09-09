// v0.1.1 - Disable Community Plugins from Sidebar (JS)
'use strict';

/* global document */
const { Plugin, Notice } = require('obsidian');

class DisableFromSidebar extends Plugin {
	constructor(app, manifest) {
		super(app, manifest);
		this._styleEl = null;
		this._rootObs = null;
		this._groupObs = null;
		this._raf = 0;
		this._manCache = null; // { byId: Map, byName: Map }
		this.GROUP_TITLE = 'community plugins'; // lowercased match
		this.MARKED = 'dcps-processed';
		this.BTN_CLASS = 'dcps-xbtn';
		this.BTN_ATTR = 'data-plugin-id';
	}

	async onload() {
		this._injectStyle();
		this._rootObs = new MutationObserver(() => this._schedule(() => this._attachIfReady()));
		this._rootObs.observe(document.body, { childList: true, subtree: true });
		this._attachIfReady(); // in case settings already open
	}

	onunload() {
		if (this._raf) cancelAnimationFrame(this._raf), (this._raf = 0);
		this._rootObs?.disconnect(); this._rootObs = null;
		this._groupObs?.disconnect(); this._groupObs = null;
		this._styleEl?.remove(); this._styleEl = null;
	}

	_schedule(fn) {
		if (this._raf) return;
		this._raf = requestAnimationFrame(() => { this._raf = 0; try { fn(); } catch(_){} });
	}

	_injectStyle() {
		if (this._styleEl && document.head.contains(this._styleEl)) return;
		const css = `
/* Disable-from-sidebar */
.${this.BTN_CLASS}{
  display:inline-flex; align-items:center; justify-content:center;
  width:18px; height:18px; margin-left:6px;
  border-radius:4px; cursor:pointer; user-select:none;
  color: var(--text-error, #ff4d4d);
  border: 1px solid color-mix(in oklab, var(--text-error, #ff4d4d) 70%, transparent);
  font-weight: 700; line-height: 1; opacity: .85;
}
.${this.BTN_CLASS}:hover{ opacity:1; background: color-mix(in oklab, var(--text-error, #ff4d4d) 12%, transparent); }
		`.trim();
		const el = document.createElement('style');
		el.textContent = css;
		document.head.appendChild(el);
		this._styleEl = el;
	}

	// -------- attach into Settings → Community plugins sidebar --------
	_attachIfReady() {
		const modal = document.querySelector('.modal.mod-settings');
		if (!modal) return;

		// Find the "Community plugins" header in the left nav
		const titles = modal.querySelectorAll('.vertical-tab-header-group-title');
		let group = null;
		for (const t of titles) {
			const txt = (t.textContent || '').trim().toLowerCase();
			if (txt === this.GROUP_TITLE) { group = t.closest('.vertical-tab-header-group'); break; }
		}
		if (!group) return;

		const itemsWrap = group.querySelector('.vertical-tab-header-group-items') || group;
		this._decorateItems(itemsWrap);

		// Watch this group only (childList sufficient; class/attrs not needed)
		this._groupObs?.disconnect();
		this._groupObs = new MutationObserver(() => this._schedule(() => this._decorateItems(itemsWrap)));
		this._groupObs.observe(itemsWrap, { childList: true, subtree: true });
	}

	_decorateItems(container) {
		if (!container) return;
		// Build manifest maps once
		if (!this._manCache) this._manCache = this._getManifests();

		const items = container.querySelectorAll('.vertical-tab-nav-item');
		for (const item of items) {
			if (item.classList.contains(this.MARKED)) continue;
			item.classList.add(this.MARKED);

			// Try to get ID from DOM first
			const idAttr = item.getAttribute('data-plugin-id') || item.getAttribute('data-id');
			const labelEl = item.querySelector('.nav-label, .setting-item-name') || item;
			const name = (labelEl.textContent || '').trim();
			const id = idAttr || this._nameToId(name);

			// Insert the red X button (even if id not found; we can disable it)
			const btn = document.createElement('span');
			btn.className = this.BTN_CLASS;
			btn.textContent = '×';
			if (id) btn.setAttribute(this.BTN_ATTR, id);
			btn.title = id ? `Disable "${name}"` : `Plugin ID not found for "${name}"`;
			btn.addEventListener('click', (ev) => this._onClickDisable(ev, item, name, id));
			// Place at end of the nav item row (after label)
			labelEl.after(btn);
		}
	}

	async _onClickDisable(ev, item, name, id) {
		ev.preventDefault();
		ev.stopPropagation();
		if (!id) { new Notice(`Could not resolve plugin id for "${name}"`, 2500); return; }

		try {
			if (!this._manCache?.byId.has(id)) this._manCache = this._getManifests(); // refresh
			const isEnabled = this._isEnabled(id);
			if (!isEnabled) {
				new Notice(`"${name}" is already disabled`, 2000);
				return;
			}
			await this.app.plugins.disablePlugin(id);
			new Notice(`Disabled: ${name}`, 2000);
		} catch (e) {
			console.error('[disable-sidebar] Failed to disable', id, e);
			new Notice(`Failed to disable "${name}"`, 3000);
		}
	}

	// -------- manifests & enabled state --------
	_getManifests() {
		const src = this.app?.plugins?.manifests || {};
		const byId = new Map();
		const byName = new Map();
		for (const [id, man] of Object.entries(src)) {
			byId.set(id, man);
			const n = this._norm(man.name || '');
			if (n && !byName.has(n)) byName.set(n, id);
		}
		return { byId, byName };
	}

	_isEnabled(id) {
		const s = this.app?.plugins?.enabledPlugins;
		if (s && s.has) return s.has(id);
		const inst = this.app?.plugins?.plugins;
		return !!(inst && id in inst);
	}

	_norm(s) {
		return String(s || '')
			.normalize('NFD').replace(/[\u0300-\u036f]/g, '')
			.toLowerCase()
			.replace(/\bplugin\b/g, '')
			.replace(/-plugin\b/g, '')
			.replace(/[^a-z0-9]+/g, '-')
			.replace(/^-+|-+$/g, '');
	}

	_nameToId(name) {
		if (!this._manCache) this._manCache = this._getManifests();
		const byName = this._manCache.byName;
		const key = this._norm(name);
		return byName.get(key) || null;
	}
}

module.exports = DisableFromSidebar;