# Visual Scraper Pro

Point-and-click data extractor Chrome extension. Select elements on any webpage with your mouse, define fields, and export everything to CSV or JSON — no code required.

## Install in Chrome

1. Open Chrome and go to `chrome://extensions/`
2. Enable **Developer mode** (top-right toggle)
3. Click **Load unpacked**
4. Select the `visual-scraper` folder
5. The extension icon appears in the Chrome toolbar

## How to use

### 1. Configure your fields
Open the extension popup and add the fields you want to extract:
- Type them manually: `title`, `price`, `link`, `image`...
- Or pick a **quick template**: E-commerce, Blog, Job listings, Contacts, Real estate

### 2. Start visual selection
Click **"Start visual selection"** — the popup closes and a green indicator appears at the bottom of the page.

### 3. Map each field
- Hover over the page — elements highlight in purple with a tooltip
- Click the element that matches each field
- A modal opens to confirm the field name, data type, and value preview
- Mapped fields turn green on the page

**Available data types:**
| Type | Description |
|------|-------------|
| Text content | Visible text of the element |
| Link URL (href) | The URL of a link |
| Image URL (src) | The URL of an image |
| Inner HTML | Raw HTML inside the element |
| Custom attribute | Any attribute (data-id, title, etc.) |

### 4. Extract all data
Reopen the popup → Click **"Extract all data"**

The extension finds every element matching the defined selectors and builds a table automatically.

### 5. Export
- **CSV** — open in Excel, Google Sheets, or any spreadsheet
- **JSON** — use in code, APIs, or data pipelines

---

## Complete example: scraping an e-commerce site

```
1. Go to any online store (Amazon, eBay, etc.)
2. Open the extension → pick "E-commerce" template
   → Fields: name, price, description, image, link
3. Click "Start visual selection"
4. Click on a product name → Confirm as "name"
5. Click on a price → Confirm as "price"
6. Click on an image → Change type to "Image URL (src)" → Confirm
7. Click on a product link → Change type to "Link URL (href)" → Confirm
8. Reopen popup → "Extract all data"
9. Click "Export CSV" → open in Excel
```

---

## Project files

```
visual-scraper/
├── manifest.json       → Extension config (Manifest V3)
├── popup.html          → Popup UI
├── popup.js            → Popup logic
├── content.js          → Visual selector injected into the page
├── content.css         → Styles for highlights, tooltip, and modal
├── background.js       → Service worker (message relay, badge counter)
├── generate-icons.js   → Script to regenerate icons (requires node-canvas)
└── icons/
    ├── icon16.png
    ├── icon32.png
    ├── icon48.png
    └── icon128.png
```

## Keyboard shortcuts

| Key | Action |
|-----|--------|
| `Esc` | Stop visual selection mode |
| `Enter` (in field input) | Add field |

## Technical notes

- Built with Manifest V3 (current Chrome standard)
- Zero external dependencies — pure JavaScript
- Data persists across sessions via `chrome.storage.local`
- CSS selectors are auto-generated on click
- Compatible with dynamic pages (SPA, React, Vue, etc.)
