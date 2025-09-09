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
		this._installFinderHotkey();
		this._installNavKeys();
		// Make the helper a bound method so `this.app` works inside it
		this._getHotkeysWcas = (pid) => _getPluginHotkeysWcasLines.call(this, pid);

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
		this._raf = requestAnimationFrame(() => { this._raf = 0; try { fn(); } catch (_) { } });
	}

	_injectStyle() {
		if (this._styleEl && document.head.contains(this._styleEl)) return;
		const css = `
			/* Disable-from-sidebar */
			.${this.BTN_CLASS}{
				display:inline-flex;
				align-items:center;
				justify-content:center;
				width:18px;
				height:18px;
				margin-right:6px;
				border-radius:4px;
				cursor:pointer;
				user-select:none;
				color: var(--text-error, #ff4d4d);
				border: 1px solid color-mix(in oklab, var(--text-error, #ff4d4d) 70%, transparent);
				font-weight: 700;
				line-height: 1;
				opacity: .85;
			}
			.${this.BTN_CLASS}:hover{
				opacity:1;
				background: color-mix(in oklab, var(--text-error, #ff4d4d) 12%, transparent);
			}
			/* Hotkey indicator */
			.dcps-hot{
				display:inline-flex;
				align-items:center;
				justify-content:center;
				width:18px;
				height:18px;
				margin-right:6px;
				border-radius:4px;
				user-select:none;
				font-size:12px;
				line-height:1;
				color: var(--text-muted); border:1px solid var(--background-modifier-border);
				opacity:.85;
				margin-bottom: -3px;
			}
			.dcps-hot.has-hotkeys{
				cursor: pointer;
				color: var(--text-success);
				border-color: color-mix(in oklab, var(--text-success, #2ecc71) 60%, transparent);
			}
			.dcps-hot:hover{
				opacity:1;
				background: var(--background-modifier-hover);
			}

			/* Group title badges */
			.vertical-tab-header-group-title{
				position:relative;
			}
			.vertical-tab-header-group-title::before{
				display:inline-block;
				content:'';
				margin-right:6px;
			}
			.vertical-tab-header-group-title[data-dcps-title="options"]::before{
				content:"⚙️";
			}
			.vertical-tab-header-group-title[data-dcps-title="core plugins"]::before{
				content:"🔌";
				filter: grayscale(1) brightness(.9);
			}
			.vertical-tab-header-group-title[data-dcps-title="community plugins"]::before{
				content:"🔌";
			}
			/* Sidebar Finder Overlay */
			#dcps-finder-overlay{
				position: fixed;
				inset: 0;
				background: color-mix(in oklab, var(--background-primary) 30%, #000 70%);
				backdrop-filter: blur(2px);
				display:none;
				z-index: 9999;
			}
			#dcps-finder{
				position: absolute;
				left: 50%;
				top: 15%;
				transform: translateX(-50%);
				width: min(720px, 92vw);
				background: var(--background-primary);
				border: 1px solid var(--background-modifier-border);
				border-radius: 12px;
				box-shadow: var(--shadow-l);
				overflow: hidden;
			}
			#dcps-finder .dcps-f-head{
				display:flex;
				align-items:center;
				gap:8px;
				padding:10px 12px;
				border-bottom: 1px solid var(--background-modifier-border);
			}
			#dcps-finder .dcps-f-head input{
				width:100%;
				border:none;
				outline:none;
				background:transparent;
				font-size: 16px;
				padding: 6px;
			}
			#dcps-finder .dcps-f-list{
				max-height: 60vh;
				overflow:auto;
			}
			#dcps-finder .dcps-f-item{
				display:flex;
				align-items:center;
				gap:10px;
				padding:8px 12px;
				cursor:pointer;
			}
			#dcps-finder .dcps-f-item .ico{
				width: 1.4em;
				text-align:center;
			}
			#dcps-finder .dcps-f-item .name{
				flex:1 1 auto;
			}
			#dcps-finder .dcps-f-item .cat{
				color: var(--text-muted);
				font-size: 12px;
			}
			#dcps-finder .dcps-f-item:hover, #dcps-finder .dcps-f-item.active{
				background: var(--background-modifier-hover);
			}
		`.trim();
		const el = document.createElement('style');
		el.textContent = css;
		document.head.appendChild(el);
		this._styleEl = el;
	}

	// -------- attach into Settings → Community plugins sidebar --------
	_tagHeaderTitles(modal) {
		try {
			const root = modal || document.querySelector('.modal.mod-settings');
			if (!root) return;
			const titles = root.querySelectorAll('.vertical-tab-header-group-title');
			for (const t of titles) {
				const txt = (t.textContent || '').trim().toLowerCase();
				if (txt === 'options' || txt === 'core plugins' || txt === 'community plugins') {
					t.setAttribute('data-dcps-title', txt);
				} else {
					t.removeAttribute('data-dcps-title');
				}
			}
		} catch (_) { }
	}

	_attachIfReady() {
		const modal = document.querySelector('.modal.mod-settings');
		if (!modal) return;


		this._tagHeaderTitles(modal);
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
		this._tagHeaderTitles(modal);

		// Watch this group only (childList sufficient; class/attrs not needed)
		this._groupObs?.disconnect();
		this._groupObs = new MutationObserver(() => this._schedule(() => { this._decorateItems(itemsWrap); this._tagHeaderTitles(modal); }));
		this._groupObs.observe(itemsWrap, { childList: true, subtree: true });
	}

	async _decorateItems(container) {
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
			const lines = await this._getHotkeysWcas(id);
			const hottitle = 'Click to Copy\n' + lines.join('\n');
			console.debug(`[disable-sidebar] Found plugin item: name="${name}", id="${id}", hotkeys=${lines.length}`);
			if (lines && lines.length) item.title = lines.join('\n');

			// close (×) button (only if not already there)
			let btn = item.querySelector('.' + this.BTN_CLASS);
			if (!btn) {
				btn = document.createElement('span');
				btn.className = this.BTN_CLASS;
				btn.textContent = '❌'; //
				if (id) btn.setAttribute(this.BTN_ATTR, id);
				btn.title = id ? `Disable "${name}"` : `Plugin ID not found for "${name}"`;
				btn.addEventListener('click', (ev) => this._onClickDisable(ev, item, name, id));
				insertBeforeLabelText(item, btn);
			}

			// hotkey span (only if not already there)
			let hot = item.querySelector('.dcps-hot');
			if (!hot) {
				hot = document.createElement('span');
				hot.className = 'dcps-hot' + (lines && lines.length ? ' has-hotkeys' : '');
				hot.textContent = ' ';
				if (lines && lines.length) {
					hot.title = hottitle;
					hot.addEventListener('click', async (ev) => await this._onClickCopy(ev, lines, item, name, id));
				} else {
					hot.title = `No hotkeys found for "${name}"`;
					hot.classList.remove('has-hotkeys');
					hot.removeAttribute('title');
				}
				insertBeforeLabelText(item, hot);
			}
		}
	}
	async _onClickCopy(ev, lines, item, name, id) {
		console.debug(`[disable-sidebar] Copying hotkeys for plugin: name="${name}", id="${id}", lines=${lines.length}`);
		if (!lines || !lines.length) return;
		if (!navigator.clipboard) {
			new Notice('Clipboard API not available', 2000);
			return;
		}
		if (!lines || !lines.length) {
			new Notice(`No hotkeys found for "${name}"`, 2000);
			return;
		}
		ev.preventDefault();
		ev.stopPropagation();
		if (!lines || !lines.length) {
			new Notice(`No hotkeys found for "${name}"`, 2000);
			return;
		}
		navigator.clipboard.writeText(lines.join('\n')).then(() => {
			new Notice(`Copied hotkeys for "${name}"`, 1500);
		}).catch(() => {
			new Notice('Failed to copy hotkeys', 2000);
		});
	}
	async _onClickDisable(ev, item, name, id) {
		ev.preventDefault();
		ev.stopPropagation();
		navigator.clipboard.writeText(item.title).then(() => {
			new Notice(`Copied plugin name: "${name}"`, 1500);
		}).catch(() => {
			new Notice('Failed to copy plugin name', 2000);
		});
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
			this._schedule(() => this._attachIfReady());
		} catch (e) {
			console.error('[disable-sidebar] Failed to disable', id, e);
			new Notice(`Failed to disable "${name}"`, 3000);
		}
	}

	// --- Sidebar navigation hotkeys: Ctrl+PageUp / Ctrl+PageDown ---
	_installNavKeys() {
		// Only active while Settings modal is open
		this.registerDomEvent(window, 'keydown', (e) => {
			if (!e || !e.ctrlKey || e.altKey || e.shiftKey || e.metaKey) return;
			const key = (e.key || '').toLowerCase();
			if (key !== 'pageup' && key !== 'pagedown') return;
			// Don't hijack when typing in inputs or editors
			//if (this._isEditableTarget(e.target)) return;
			const dir = key === 'pageup' ? -1 : 1;
			if (this._moveSidebarSelection(dir)) {
				e.preventDefault(); e.stopPropagation();
			}
		});
	}

	_isEditableTarget(t) {
		if (!t) return false;
		if (t.isContentEditable) return true;
		const tag = (t.tagName || '').toUpperCase();
		return tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT';
	}

	_moveSidebarSelection(dir) {
		try {
			const modal = document.querySelector('.modal.mod-settings');
			if (!modal) return false;
			const header = modal.querySelector('.vertical-tab-header');
			if (!header) return false;

			// Only nav items; skip group titles
			const items = Array.from(header.querySelectorAll('.vertical-tab-nav-item'));
			if (!items.length) return false;

			let i = items.findIndex(el => el.classList.contains('is-active'));
			if (i === -1) return false;

			const n = items.length;
			let j = i + (dir < 0 ? -1 : 1);
			// wrap
			j = (j % n + n) % n;

			const target = items[j];
			if (!target) return false;
			target.click();
			return true;
		} catch (_) {
			return false;
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

// Insert `btn` right before the visible text node in `.vertical-tab-nav-item`
function insertBeforeLabelText(item, el) {
	// 1) Try first non-empty TEXT_NODE directly under the item
	for (const n of item.childNodes) {
		if (n.nodeType === Node.TEXT_NODE && n.textContent.trim() !== '') {
			item.insertBefore(el, n);
			return;
		}
	}

	// 2) If theme wraps the name, insert before that label element
	const label = item.querySelector(':scope > .nav-label, :scope > .setting-item-name');
	if (label) { item.insertBefore(el, label); return; }

	// 3) Insert before the chevron if present
	const chev = item.querySelector(':scope > .vertical-tab-nav-item-chevron');
	if (chev) { item.insertBefore(el, chev); return; }

	// 4) Fallback: beginning of the item
	item.insertAdjacentElement('afterbegin', el);
}
// Returns lines like: "enter.cs  Do the Thing"
async function _getPluginHotkeysWcasLines(pluginId) {
	console.debug(`[disable-sidebar] Gathering hotkeys for plugin ID: ${pluginId}`, this.app);
	const cmds = this.app?.commands;
	if (!cmds) return [];
	console.debug(`[disable-sidebar] Gathering hotkeys for plugin ID: ${pluginId}`);
	// Gather this plugin's commands
	const all = (cmds.listCommands?.() || Object.values(cmds.commands || {}))
		.filter(c => typeof c?.id === 'string' && c.id.startsWith(pluginId + ':'));

	const hkMgr = this.app?.hotkeyManager;
	const isMac = /Mac|iPhone|iPad|iPod/i.test(navigator.platform || '');

	const lines = [];
	for (const c of all) {
		const id = c.id;
		// Prefer resolved hotkeys from the manager (includes defaults + overrides)
		let combos = [];
		try {
			if (hkMgr?.getHotkeys) combos = hkMgr.getHotkeys(id) || [];
			else if (hkMgr?.hotkeys) combos = hkMgr.hotkeys[id] || []; // fallback (older builds)
		} catch (_) { }

		// As a last resort, read from .obsidian/hotkeys.json (custom only)
		if (!combos.length) {
			try {
				const adapter = this.app.vault.adapter;
				const cfg = this.app.vault.configDir || '.obsidian';
				const path = (window.require?.('obsidian')?.normalizePath?.(`${cfg}/hotkeys.json`)) || `${cfg}/hotkeys.json`;
				if (await adapter.exists(path)) {
					const raw = await adapter.read(path);
					const data = JSON.parse(raw);
					// data is usually { "hotkeys": [ { "command": "...", "hotkeys": [ { key, modifiers[] } ] } ] }
					const entry = (data?.hotkeys || []).find(x => x?.command === id);
					if (entry?.hotkeys?.length) combos = entry.hotkeys;
				}
			} catch (_) { }
		}

		for (const hk of combos) {
			const str = _formatHotkeyToWcas(hk, isMac);
			if (str) lines.push(`${str}\t\t${c.name || id}`);
		}
	}
	return lines;
}

// --- helpers ---

// hk: { key: string, modifiers?: string[] }  (Obsidian hotkey shape)
function _formatHotkeyToWcas(hk, isMac) {
	if (!hk) return '';
	const key = (hk.key || '').toString().trim();
	if (!key) return '';

	// Normalize modifiers array: e.g. ["Mod","Shift"] or ["Ctrl","Alt","Shift","Meta"]
	const mods = Array.isArray(hk.modifiers) ? hk.modifiers.slice() : [];

	// Expand "Mod" into platform-specific (Cmd on macOS, Ctrl elsewhere)
	const idx = mods.indexOf('Mod');
	if (idx !== -1) {
		mods.splice(idx, 1, isMac ? 'Meta' : 'Ctrl');
	}

	// Build suffix in strict W C A S order (omit missing)
	const want = ['Meta', 'Ctrl', 'Alt', 'Shift'];
	const letter = { Meta: 'w', Ctrl: 'c', Alt: 'a', Shift: 's' };
	let suffix = '';
	for (const m of want) {
		if (mods.includes(m)) suffix += letter[m];
	}

	// Key name normalized (lowercase, friendly)
	const k = key.toLowerCase();
	return suffix ? `${k}.${suffix}` : k;
}


module.exports = DisableFromSidebar;