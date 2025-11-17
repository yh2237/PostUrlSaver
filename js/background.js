chrome.runtime.onInstalled.addListener(() => {
  chrome.storage.local.get(['urls'], (result) => {
    if (!result.urls) {
      chrome.storage.local.set({ urls: [] });
    }
  });

  chrome.storage.sync.get(['saveToStorage', 'copyToClipboard'], (items) => {
    if (items.saveToStorage === undefined || items.copyToClipboard === undefined) {
      chrome.storage.sync.set({
        saveToStorage: true,
        copyToClipboard: true
      });
    }
  });
});

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'saveUrl') {
    (async () => {
      const urlToProcess = request.url;
      const settings = await chrome.storage.sync.get({
        saveToStorage: true,
        copyToClipboard: true
      });

      const promises = [];

      if (settings.saveToStorage) {
        const savePromise = new Promise(async (resolve) => {
          const result = await chrome.storage.local.get(['urls']);
          const urls = result.urls || [];
          if (!urls.includes(urlToProcess)) {
            urls.push(urlToProcess);
            await chrome.storage.local.set({ urls: urls });
            console.log('URL saved:', urlToProcess);
          } else {
            console.log('URL already exists:', urlToProcess);
          }
          resolve();
        });
        promises.push(savePromise);
      }

      if (settings.copyToClipboard) {
        const copyPromise = new Promise((resolve) => {
          chrome.scripting.executeScript({
            target: { tabId: sender.tab.id },
            func: copyToClipboard,
            args: [urlToProcess]
          }).then(() => {
            console.log('URL copied:', urlToProcess);
            resolve();
          });
        });
        promises.push(copyPromise);
      }

      if (promises.length > 0) {
        await Promise.all(promises);
        sendResponse({ status: 'processed' });
      } else {
        sendResponse({ status: 'noop' });
      }
    })();

    return true;
  }
});

function copyToClipboard(text) {
  navigator.clipboard.writeText(text).catch(err => {
    console.error('Could not copy text: ', err);
  });
}
