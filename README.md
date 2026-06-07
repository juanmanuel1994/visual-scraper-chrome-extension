Visual Scraper Pro - Chrome Extension
======================================

A point-and-click data extraction tool for Chrome. Define the data you want, click on elements in any webpage, and export the results to CSV or JSON — no coding required.

HOW IT WORKS
------------
Visual Scraper Pro lets you map fields to elements on a page by simply hovering and clicking. The extension builds CSS selectors automatically, finds all matching elements across the page, and assembles the data into structured rows ready to export.

FEATURES
--------
- Visual element selection with live green/purple highlighting
- Automatic CSS selector generation based on the clicked element
- Smart row detection: uses the field with the most matches as the row iterator
- Field type options: text, link (href), image (src), HTML, or any custom attribute
- Preview of extracted value and match count before confirming a field
- Quick-start templates for common scraping tasks
- In-page results panel showing a live table of extracted data
- Export to CSV or JSON with one click
- Keyboard shortcut: Esc to exit selection mode at any time

QUICK-START TEMPLATES
---------------------
The extension includes ready-made field sets for common use cases so you do not have to define fields from scratch:

- E-commerce: name, price, rating, image, link
- Blog / News: title, author, date, summary, link
- Job listings: job title, company, location, salary, link
- Contacts: name, email, phone, company
- Real estate: address, price, beds, baths, area

USAGE
-----
1. Navigate to the page you want to scrape
2. Click the extension icon to open the popup
3. Add field names manually or select a template
4. Click "Start visual selection" — the page enters selection mode
5. Hover over any element to see it highlighted in purple with a tooltip
6. Click the element to open the field definition modal:
   - Choose which field this element belongs to
   - Select the extraction type (text, href, src, HTML, attribute)
   - Review the preview and match count, then confirm
7. Repeat for each field you want to capture
8. Click "Extract data" to run the scraper across the full page
9. A results panel appears at the bottom of the page with a preview table
10. Click "Export CSV" or "Export JSON" to download your data

SELECTOR LOGIC
--------------
When you click an element, the extension walks up the DOM hierarchy to build a CSS selector that uniquely identifies that element type across the page. It tries progressively shorter selectors to maximize the number of matching elements (for example, finding all product cards rather than just the one you clicked). If no clean selector is found it falls back to a tag + class combination.

EXPORT FORMAT
-------------
Each exported row contains all the fields you defined, plus two automatic fields:
- _index: the row number
- _url: the URL of the page where the data was extracted

CSV files are properly escaped and safe to open in Excel or Google Sheets.
JSON files are formatted arrays of objects, one object per row.

PERMISSIONS USED
----------------
- activeTab: to access the current page for scraping
- scripting: to inject the selection interface into the page
- storage: to save field definitions between sessions
- downloads: to trigger the CSV/JSON file download
