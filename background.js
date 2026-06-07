// Visual Scraper Pro - Background Service Worker

chrome.runtime.onInstalled.addListener(() => {
  console.log('Visual Scraper Pro installed');
});

// Relay messages between content script and popup
chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (msg.action === 'fieldSaved' || msg.action === 'scrapeDone' || msg.action === 'sessionStopped') {
    chrome.runtime.sendMessage(msg).catch(() => {});
  }
  sendResponse({ ok: true });
  return true;
});

// Show number of extracted records on the extension badge
chrome.runtime.onMessage.addListener((msg) => {
  if (msg.action === 'scrapeDone') {
    const count = msg.count || 0;
    chrome.action.setBadgeText({ text: count > 0 ? String(count) : '' });
    chrome.action.setBadgeBackgroundColor({ color: '#10b981' });
  }
  if (msg.action === 'sessionStopped') {
    chrome.action.setBadgeText({ text: '' });
  }
});
