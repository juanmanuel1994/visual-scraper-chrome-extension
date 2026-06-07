// Visual Scraper Pro - Content Script

const VSP = {
  active: false,
  fields: [],
  currentField: null,
  hoveredEl: null,
  tooltip: null,
  badge: null,
  scraped: [],

  init() {
    chrome.runtime.onMessage.addListener((msg, _, sendResponse) => {
      if (msg.action === 'startScraping') {
        this.startSession(msg.fields);
        sendResponse({ ok: true });
      }
      if (msg.action === 'stopScraping') {
        this.stopSession();
        sendResponse({ ok: true });
      }
      if (msg.action === 'scrapeAll') {
        const results = this.scrapeAll();
        sendResponse({ ok: true, data: results, count: results.length });
        return true;
      }
      if (msg.action === 'getScraped') {
        sendResponse({ data: this.scraped });
        return true;
      }
      if (msg.action === 'clearScraped') {
        this.scraped = [];
        this.fields = [];
        this.removeResultsPanel();
        this.clearHighlights();
        sendResponse({ ok: true });
      }
      return true;
    });
  },

  startSession(fields) {
    this.active = true;
    this.fields = fields || [];
    this.currentField = this.fields.find(f => !f.selector) || null;
    this.attachListeners();
    this.showBadge();
    this.restoreSelections();
  },

  stopSession() {
    this.active = false;
    this.detachListeners();
    this.removeBadge();
    this.removeTooltip();
    // Show results panel if we have data, otherwise clear highlights
    if (this.scraped.length > 0) {
      this.showResultsPanel(this.scraped);
    } else {
      this.clearHighlights();
    }
  },

  attachListeners() {
    this._onMouseOver = this.handleMouseOver.bind(this);
    this._onMouseOut = this.handleMouseOut.bind(this);
    this._onClick = this.handleClick.bind(this);
    this._onKeyDown = this.handleKeyDown.bind(this);
    document.addEventListener('mouseover', this._onMouseOver, true);
    document.addEventListener('mouseout', this._onMouseOut, true);
    document.addEventListener('click', this._onClick, true);
    document.addEventListener('keydown', this._onKeyDown, true);
  },

  detachListeners() {
    document.removeEventListener('mouseover', this._onMouseOver, true);
    document.removeEventListener('mouseout', this._onMouseOut, true);
    document.removeEventListener('click', this._onClick, true);
    document.removeEventListener('keydown', this._onKeyDown, true);
  },

  handleMouseOver(e) {
    if (!this.active || !this.currentField) return;
    const el = e.target;
    if (el.closest('.vsp-modal-overlay') || el.closest('.vsp-badge') || el.closest('#vsp-results-panel')) return;
    if (this.hoveredEl && this.hoveredEl !== el) {
      this.hoveredEl.classList.remove('vsp-highlight');
    }
    this.hoveredEl = el;
    el.classList.add('vsp-highlight');
    this.showTooltip(e, el);
  },

  handleMouseOut(e) {
    if (!this.active) return;
    const el = e.target;
    if (!el.classList.contains('vsp-selected')) {
      el.classList.remove('vsp-highlight');
    }
    this.removeTooltip();
  },

  handleClick(e) {
    if (!this.active || !this.currentField) return;
    const el = e.target;
    if (el.closest('.vsp-modal-overlay') || el.closest('.vsp-badge') || el.closest('#vsp-results-panel')) return;
    e.preventDefault();
    e.stopPropagation();
    this.showFieldModal(el);
  },

  handleKeyDown(e) {
    if (e.key === 'Escape') {
      this.stopSession();
      chrome.runtime.sendMessage({ action: 'sessionStopped' });
    }
  },

  showTooltip(e, el) {
    this.removeTooltip();
    const tag = el.tagName.toLowerCase();
    const text = (el.textContent || '').trim().slice(0, 60);
    const attr = el.getAttribute('href') || el.getAttribute('src') || '';

    this.tooltip = document.createElement('div');
    this.tooltip.className = 'vsp-tooltip';
    this.tooltip.innerHTML = `
      <div>
        <span class="vsp-tag">&lt;${tag}&gt;</span>
        ${this.currentField ? `<span style="color:#a5b4fc;font-size:11px;margin-left:8px;">→ ${this.currentField.name}</span>` : ''}
      </div>
      ${text ? `<span class="vsp-text">${text}${attr ? ' · ' + attr : ''}</span>` : ''}
    `;
    document.body.appendChild(this.tooltip);
    this.positionTooltip(e);
  },

  positionTooltip(e) {
    if (!this.tooltip) return;
    const x = Math.min(e.clientX + 16, window.innerWidth - 300);
    const y = Math.min(e.clientY + 16, window.innerHeight - 80);
    this.tooltip.style.left = x + 'px';
    this.tooltip.style.top = y + 'px';
  },

  removeTooltip() {
    if (this.tooltip) { this.tooltip.remove(); this.tooltip = null; }
  },

  showFieldModal(el) {
    const existing = document.querySelector('.vsp-modal-overlay');
    if (existing) existing.remove();

    const selector = this.generateSelector(el);
    const matchCount = this.countMatches(selector);
    const preview = (el.textContent || el.getAttribute('href') || el.getAttribute('src') || '').trim().slice(0, 80);
    const fieldName = this.currentField ? this.currentField.name : '';

    const overlay = document.createElement('div');
    overlay.className = 'vsp-modal-overlay';
    overlay.innerHTML = `
      <div class="vsp-modal">
        <h3>Define field</h3>
        <p>Choose a name and data type for this element</p>
        <label>Field name</label>
        <input type="text" id="vsp-field-name" placeholder="e.g. title, price, link..." value="${fieldName}" />
        <label>Data type</label>
        <select id="vsp-field-type">
          <option value="text">Text content</option>
          <option value="href">Link URL (href)</option>
          <option value="src">Image URL (src)</option>
          <option value="html">Inner HTML</option>
          <option value="attr">Custom attribute</option>
        </select>
        <div id="vsp-attr-wrap" style="display:none">
          <label>Attribute name</label>
          <input type="text" id="vsp-attr-name" placeholder="e.g. data-id, title..." />
        </div>
        <label>Value preview</label>
        <div class="vsp-preview-box">
          Matches: <span style="color:#10b981;font-weight:600">${matchCount} elements</span><br>
          Value: <span id="vsp-preview-val">${preview || '(empty)'}</span>
        </div>
        <div class="vsp-btn-row">
          <button class="vsp-btn vsp-btn-cancel" id="vsp-cancel">Cancel</button>
          <button class="vsp-btn vsp-btn-confirm" id="vsp-confirm">Save field</button>
        </div>
      </div>
    `;
    document.body.appendChild(overlay);

    const typeSelect = overlay.querySelector('#vsp-field-type');
    const attrWrap = overlay.querySelector('#vsp-attr-wrap');
    const previewVal = overlay.querySelector('#vsp-preview-val');

    typeSelect.addEventListener('change', () => {
      const type = typeSelect.value;
      attrWrap.style.display = type === 'attr' ? 'block' : 'none';
      previewVal.textContent = this.extractValue(el, type, '') || '(empty)';
    });

    overlay.querySelector('#vsp-cancel').addEventListener('click', () => overlay.remove());
    overlay.querySelector('#vsp-confirm').addEventListener('click', () => {
      const name = overlay.querySelector('#vsp-field-name').value.trim();
      const type = typeSelect.value;
      const attrName = overlay.querySelector('#vsp-attr-name').value.trim();
      if (!name) { overlay.querySelector('#vsp-field-name').focus(); return; }
      this.saveField(el, selector, name, type, attrName);
      overlay.remove();
    });

    overlay.querySelector('#vsp-field-name').focus();
  },

  extractValue(el, type, attrName) {
    switch (type) {
      case 'text': return (el.textContent || '').trim();
      case 'href': return el.getAttribute('href') || el.closest('a')?.getAttribute('href') || '';
      case 'src': return el.getAttribute('src') || '';
      case 'html': return el.innerHTML.trim().slice(0, 200);
      case 'attr': return el.getAttribute(attrName) || '';
      default: return (el.textContent || '').trim();
    }
  },

  saveField(el, selector, name, type, attrName) {
    const existing = this.fields.find(f => f.name === name);
    const fieldData = { name, selector, type, attrName };

    if (existing) {
      Object.assign(existing, fieldData);
    } else {
      this.fields.push(fieldData);
    }

    // Highlight all matching elements, not just the clicked one
    try {
      document.querySelectorAll(selector).forEach(match => {
        match.classList.remove('vsp-highlight');
        match.classList.add('vsp-selected');
        match.setAttribute('data-vsp-field', name);
      });
    } catch (_) {}

    this.currentField = this.fields.find(f => !f.selector) || null;

    chrome.runtime.sendMessage({
      action: 'fieldSaved',
      field: fieldData,
      fields: this.fields
    });

    this.showBadge();
  },

  // Builds a selector that matches ALL similar elements on the page (not just the clicked one)
  generateSelector(el) {
    // Strategy: try progressively shorter selectors from the element upward.
    // Pick the shortest one that matches 2+ elements and still contains our element.
    const candidates = this.buildCandidates(el);
    for (const sel of candidates) {
      try {
        const matches = Array.from(document.querySelectorAll(sel));
        if (matches.length >= 2 && matches.includes(el)) return sel;
      } catch (_) {}
    }
    // Fallback: just the tag + classes of the element itself (no nth)
    return this.elSelector(el, false);
  },

  buildCandidates(el) {
    const candidates = [];
    // Walk up to 5 levels, at each level try tag+class combos without nth-of-type
    let current = el;
    const chain = [];
    for (let i = 0; i < 5 && current && current !== document.body; i++) {
      chain.unshift({ el: current, part: this.elSelector(current, false) });
      current = current.parentElement;
    }
    // From shortest (just the element) to longest (full path)
    for (let start = chain.length - 1; start >= 0; start--) {
      const sel = chain.slice(start).map(c => c.part).join(' ');
      candidates.push(sel);
    }
    return candidates;
  },

  elSelector(el, withNth = false) {
    let part = el.tagName.toLowerCase();
    if (el.className) {
      const classes = Array.from(el.classList)
        .filter(c => !c.startsWith('vsp-') && /^[a-zA-Z]/.test(c))
        .slice(0, 3)
        .map(c => `.${CSS.escape(c)}`)
        .join('');
      part += classes;
    }
    if (withNth && el.parentNode) {
      const siblings = Array.from(el.parentNode.children).filter(s => s.tagName === el.tagName);
      if (siblings.length > 1) part += `:nth-of-type(${siblings.indexOf(el) + 1})`;
    }
    return part;
  },

  countMatches(selector) {
    try { return document.querySelectorAll(selector).length; } catch (_) { return 0; }
  },

  scrapeAll(fields) {
    const fieldsToUse = fields || this.fields;
    const results = [];
    const mapped = fieldsToUse.filter(f => f.selector);
    if (!mapped.length) return results;

    // Find the field with the most matching elements — use it as the row driver
    let maxCount = 0;
    let driverField = mapped[0];
    mapped.forEach(f => {
      try {
        const n = document.querySelectorAll(f.selector).length;
        if (n > maxCount) { maxCount = n; driverField = f; }
      } catch (_) {}
    });

    const baseElements = Array.from(document.querySelectorAll(driverField.selector));
    if (!baseElements.length) return results;

    baseElements.forEach((_, idx) => {
      const row = { _index: idx + 1, _url: window.location.href };
      mapped.forEach(field => {
        try {
          const els = document.querySelectorAll(field.selector);
          const el = els[idx] || els[els.length - 1];
          row[field.name] = el ? this.extractValue(el, field.type, field.attrName) : '';
        } catch (_) {
          row[field.name] = '';
        }
      });
      results.push(row);
    });

    this.scraped = results;
    chrome.runtime.sendMessage({ action: 'scrapeDone', count: results.length });
    this.showResultsPanel(results);
    return results;
  },

  // ---- In-page results panel ----

  showResultsPanel(data) {
    this.removeResultsPanel();
    if (!data.length) return;

    const cols = Object.keys(data[0]).filter(k => !k.startsWith('_'));

    const panel = document.createElement('div');
    panel.id = 'vsp-results-panel';
    panel.innerHTML = `
      <div id="vsp-panel-header">
        <div style="display:flex;align-items:center;gap:10px">
          <span style="font-size:16px">🕷️</span>
          <div>
            <div style="font-weight:700;font-size:13px;color:#f1f5f9">Visual Scraper Pro</div>
            <div style="font-size:11px;color:#64748b">${data.length} records · ${cols.length} fields</div>
          </div>
        </div>
        <div style="display:flex;gap:6px">
          <button id="vsp-panel-csv" class="vsp-panel-btn vsp-panel-btn-green">CSV</button>
          <button id="vsp-panel-json" class="vsp-panel-btn vsp-panel-btn-blue">JSON</button>
          <button id="vsp-panel-close" class="vsp-panel-btn vsp-panel-btn-red">✕</button>
        </div>
      </div>
      <div id="vsp-panel-body">
        <table id="vsp-table">
          <thead>
            <tr>
              <th>#</th>
              ${cols.map(c => `<th>${c}</th>`).join('')}
            </tr>
          </thead>
          <tbody>
            ${data.map((row, i) => `
              <tr>
                <td style="color:#475569;font-size:11px">${i + 1}</td>
                ${cols.map(c => `<td title="${(row[c] || '').replace(/"/g, '&quot;')}">${this.truncate(row[c] || '', 40)}</td>`).join('')}
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
    `;

    document.body.appendChild(panel);

    panel.querySelector('#vsp-panel-close').addEventListener('click', () => {
      this.removeResultsPanel();
    });

    panel.querySelector('#vsp-panel-csv').addEventListener('click', () => {
      this.downloadFromPage(data, 'csv');
    });

    panel.querySelector('#vsp-panel-json').addEventListener('click', () => {
      this.downloadFromPage(data, 'json');
    });
  },

  removeResultsPanel() {
    const p = document.getElementById('vsp-results-panel');
    if (p) p.remove();
  },

  truncate(str, max) {
    return str.length > max ? str.slice(0, max) + '…' : str;
  },

  downloadFromPage(data, format) {
    const cols = Object.keys(data[0]).filter(k => !k.startsWith('_'));
    let content, filename, type;

    if (format === 'csv') {
      const rows = [
        cols.join(','),
        ...data.map(row => cols.map(c => `"${(row[c] || '').replace(/"/g, '""')}"`).join(','))
      ];
      content = rows.join('\n');
      filename = 'scraped_data.csv';
      type = 'text/csv';
    } else {
      const clean = data.map(row => {
        const obj = {};
        cols.forEach(k => obj[k] = row[k]);
        return obj;
      });
      content = JSON.stringify(clean, null, 2);
      filename = 'scraped_data.json';
      type = 'application/json';
    }

    const blob = new Blob([content], { type });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  },

  restoreSelections() {
    this.fields.forEach(field => {
      if (!field.selector) return;
      try {
        document.querySelectorAll(field.selector).forEach(el => {
          el.classList.add('vsp-selected');
          el.setAttribute('data-vsp-field', field.name);
        });
      } catch (_) {}
    });
  },

  clearHighlights() {
    document.querySelectorAll('.vsp-highlight, .vsp-selected').forEach(el => {
      el.classList.remove('vsp-highlight', 'vsp-selected');
      el.removeAttribute('data-vsp-field');
    });
  },

  showBadge() {
    this.removeBadge();
    const pending = this.fields.filter(f => !f.selector);
    const done = this.fields.filter(f => f.selector);
    const nextField = pending[0];

    this.badge = document.createElement('div');
    this.badge.className = 'vsp-badge';
    this.badge.innerHTML = `
      <span class="vsp-badge-dot"></span>
      ${nextField
        ? `<span>Click on: <strong style="color:#a5b4fc">${nextField.name}</strong></span>`
        : `<span style="color:#10b981">✓ ${done.length} fields mapped — open popup to extract</span>`
      }
      <span style="color:#64748b;font-size:11px">
        ${done.length}/${this.fields.length} &nbsp;
        <kbd>Esc</kbd> stop
      </span>
    `;
    document.body.appendChild(this.badge);
  },

  removeBadge() {
    if (this.badge) { this.badge.remove(); this.badge = null; }
  }
};

VSP.init();
