// Visual Scraper Pro - Popup

const TEMPLATES = {
  ecommerce: ['name', 'price', 'description', 'image', 'link'],
  blog: ['title', 'author', 'date', 'summary', 'link'],
  jobs: ['position', 'company', 'location', 'salary', 'link'],
  contacts: ['name', 'email', 'phone', 'company', 'role'],
  realestate: ['title', 'price', 'location', 'sqft', 'link']
};

let state = {
  fields: [],
  sessionActive: false,
  scraped: [],
  currentTab: null
};

// ---- Init ----

document.addEventListener('DOMContentLoaded', async () => {
  const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
  state.currentTab = tabs[0];

  await loadState();
  renderFields();
  bindEvents();
  updateUI();

  chrome.runtime.onMessage.addListener((msg) => {
    if (msg.action === 'fieldSaved') {
      state.fields = msg.fields;
      saveState();
      renderFields();
      updateUI();
    }
    if (msg.action === 'scrapeDone') {
      state.scraped = msg.data;
      saveState();
      showResults();
      toast(`✓ ${msg.count} records extracted`);
    }
    if (msg.action === 'sessionStopped') {
      state.sessionActive = false;
      saveState();
      updateUI();
    }
  });
});

// ---- State persistence ----

async function loadState() {
  const stored = await chrome.storage.local.get(['vsp_fields', 'vsp_scraped', 'vsp_active']);
  state.fields = stored.vsp_fields || [];
  state.scraped = stored.vsp_scraped || [];
  state.sessionActive = stored.vsp_active || false;
}

async function saveState() {
  await chrome.storage.local.set({
    vsp_fields: state.fields,
    vsp_scraped: state.scraped,
    vsp_active: state.sessionActive
  });
}

// ---- Events ----

function bindEvents() {
  document.getElementById('btn-add-field').addEventListener('click', addField);
  document.getElementById('field-input').addEventListener('keydown', (e) => {
    if (e.key === 'Enter') addField();
  });

  document.querySelectorAll('.template-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const tpl = TEMPLATES[btn.dataset.tpl];
      if (!tpl) return;
      state.fields = tpl.map(name => ({ name, selector: null, type: 'text', attrName: '' }));
      saveState();
      renderFields();
      updateUI();
      toast(`Template loaded: ${btn.dataset.tpl}`);
    });
  });

  document.getElementById('btn-start').addEventListener('click', startSession);
  document.getElementById('btn-stop').addEventListener('click', stopSession);
  document.getElementById('btn-scrape-all').addEventListener('click', scrapeAll);
  document.getElementById('btn-export-csv').addEventListener('click', exportCSV);
  document.getElementById('btn-export-json').addEventListener('click', exportJSON);
  document.getElementById('btn-clear').addEventListener('click', clearAll);
}

function addField() {
  const input = document.getElementById('field-input');
  const name = input.value.trim().toLowerCase().replace(/\s+/g, '_');
  if (!name) return;
  if (state.fields.find(f => f.name === name)) {
    toast('A field with that name already exists');
    return;
  }
  state.fields.push({ name, selector: null, type: 'text', attrName: '' });
  input.value = '';
  saveState();
  renderFields();
  updateUI();
}

function removeField(name) {
  state.fields = state.fields.filter(f => f.name !== name);
  saveState();
  renderFields();
  updateUI();
}

// ---- Session control ----

async function startSession() {
  if (!state.fields.length) return;
  state.sessionActive = true;
  await saveState();
  updateUI();

  try {
    await chrome.scripting.executeScript({
      target: { tabId: state.currentTab.id },
      files: ['content.js']
    });
  } catch (_) {}

  chrome.tabs.sendMessage(state.currentTab.id, {
    action: 'startScraping',
    fields: state.fields
  });

  window.close();
}

async function stopSession() {
  state.sessionActive = false;
  await saveState();
  updateUI();
  chrome.tabs.sendMessage(state.currentTab.id, { action: 'stopScraping' });
}

async function scrapeAll() {
  const btn = document.getElementById('btn-scrape-all');
  btn.disabled = true;
  btn.innerHTML = '⏳ Extracting...';

  chrome.tabs.sendMessage(
    state.currentTab.id,
    { action: 'scrapeAll', fields: state.fields },
    (response) => {
      btn.disabled = false;
      btn.innerHTML = '⚡ Extract all data';

      if (!response || !response.data) {
        toast('No data found — make sure fields are mapped');
        return;
      }

      state.scraped = response.data;
      saveState();
      showResults();

      // Switch to default view so results are visible
      state.sessionActive = false;
      saveState();
      document.getElementById('view-active').classList.add('hidden');
      document.getElementById('view-default').classList.remove('hidden');

      toast(`✓ ${response.count} records extracted`);
    }
  );
}

async function clearAll() {
  state.fields = [];
  state.scraped = [];
  state.sessionActive = false;
  await saveState();
  chrome.tabs.sendMessage(state.currentTab.id, { action: 'stopScraping' });
  chrome.tabs.sendMessage(state.currentTab.id, { action: 'clearScraped' });
  chrome.action.setBadgeText({ text: '' });
  renderFields();
  updateUI();
  document.getElementById('results-section').classList.add('hidden');
}

// ---- Render ----

function renderFields() {
  const list = document.getElementById('fields-list');
  if (!state.fields.length) {
    list.innerHTML = `
      <div class="empty-state">
        <strong>No fields yet</strong>
        Add fields manually or pick a template
      </div>
    `;
    return;
  }

  list.innerHTML = state.fields.map(f => `
    <div class="field-item">
      <div class="field-status ${f.selector ? 'mapped' : ''}"></div>
      <span class="field-name">${f.name}</span>
      <span class="field-type">${f.type || 'text'}</span>
      <button class="field-remove" data-name="${f.name}" title="Remove">×</button>
    </div>
  `).join('');

  list.querySelectorAll('.field-remove').forEach(btn => {
    btn.addEventListener('click', () => removeField(btn.dataset.name));
  });
}

function updateUI() {
  const hasMapped = state.fields.some(f => f.selector);
  const hasFields = state.fields.length > 0;

  document.getElementById('btn-start').disabled = !hasFields;

  const dot = document.getElementById('status-dot');
  const txt = document.getElementById('status-text');

  if (state.sessionActive) {
    dot.className = 'status-dot active';
    txt.textContent = 'Selection active on page';
  } else if (hasMapped) {
    dot.className = 'status-dot ready';
    const mappedCount = state.fields.filter(f => f.selector).length;
    txt.textContent = `${mappedCount}/${state.fields.length} fields mapped`;
  } else {
    dot.className = 'status-dot';
    txt.textContent = 'Ready to start';
  }

  if (state.sessionActive) {
    document.getElementById('view-active').classList.remove('hidden');
    document.getElementById('view-default').classList.add('hidden');
    renderActiveFields();
  } else {
    document.getElementById('view-active').classList.add('hidden');
    document.getElementById('view-default').classList.remove('hidden');
  }

  if (state.scraped.length > 0) {
    showResults();
  }
}

function renderActiveFields() {
  const list = document.getElementById('active-fields-list');
  list.innerHTML = state.fields.map(f => `
    <div class="field-item">
      <div class="field-status ${f.selector ? 'mapped' : ''}"></div>
      <span class="field-name">${f.name}</span>
      <span class="field-type">${f.selector ? '✓ mapped' : '⏳ pending'}</span>
    </div>
  `).join('');
}

function showResults() {
  const section = document.getElementById('results-section');
  section.classList.remove('hidden');

  document.getElementById('results-count').textContent = state.scraped.length;

  if (state.scraped[0]) {
    try {
      const url = state.scraped[0]._url || '';
      document.getElementById('results-url').textContent = new URL(url).hostname;
    } catch (_) {}
  }

  const fieldsEl = document.getElementById('results-fields');
  const fieldNames = Object.keys(state.scraped[0] || {}).filter(k => !k.startsWith('_'));
  fieldsEl.innerHTML = fieldNames.map(name =>
    `<span class="result-field-tag">${name}</span>`
  ).join('');
}

// ---- Export ----

function exportCSV() {
  fetchAndExport('csv');
}

function exportJSON() {
  fetchAndExport('json');
}

function fetchAndExport(format) {
  chrome.tabs.sendMessage(state.currentTab.id, { action: 'getScraped' }, (response) => {
    const data = (response && response.data && response.data.length)
      ? response.data
      : state.scraped;

    if (!data || !data.length) {
      toast('No data yet — extract first');
      return;
    }

    const cols = Object.keys(data[0]).filter(k => !k.startsWith('_'));

    if (format === 'csv') {
      const rows = [
        cols.join(','),
        ...data.map(row => cols.map(c => `"${(row[c] || '').replace(/"/g, '""')}"`).join(','))
      ];
      downloadFile(rows.join('\n'), 'scraped_data.csv', 'text/csv');
      toast('✓ CSV exported');
    } else {
      const clean = data.map(row => {
        const obj = {};
        cols.forEach(k => obj[k] = row[k]);
        return obj;
      });
      downloadFile(JSON.stringify(clean, null, 2), 'scraped_data.json', 'application/json');
      toast('✓ JSON exported');
    }
  });
}

function downloadFile(content, filename, type) {
  const blob = new Blob([content], { type });
  const reader = new FileReader();
  reader.onload = () => {
    chrome.downloads.download({
      url: reader.result,
      filename: filename,
      saveAs: false
    });
  };
  reader.readAsDataURL(blob);
}

// ---- Toast ----

function toast(msg) {
  const el = document.getElementById('toast');
  el.textContent = msg;
  el.classList.add('show');
  setTimeout(() => el.classList.remove('show'), 2500);
}
