document.addEventListener('DOMContentLoaded', () => {
  const urlList = document.getElementById('url-list');
  const emptyMessage = document.getElementById('empty-message');
  const downloadBtn = document.getElementById('download-btn');
  const clearBtn = document.getElementById('clear-btn');

  const saveToStorageCheckbox = document.getElementById('saveToStorage');
  const copyToClipboardCheckbox = document.getElementById('copyToClipboard');
  const autoSaveEnabledCheckbox = document.getElementById('autoSaveEnabled');
  const autoSaveAccountsInput = document.getElementById('autoSaveAccounts');

  function loadUrls() {
    chrome.storage.local.get(['urls'], (result) => {
      const urls = result.urls || [];
      urlList.innerHTML = '';

      if (urls.length === 0) {
        emptyMessage.style.display = 'block';
        urlList.style.display = 'none';
        downloadBtn.disabled = true;
        clearBtn.disabled = true;
      } else {
        emptyMessage.style.display = 'none';
        urlList.style.display = 'block';
        downloadBtn.disabled = false;
        clearBtn.disabled = false;

        urls.forEach((url) => {
          const listItem = document.createElement('li');
          const link = document.createElement('a');
          link.href = url;
          link.textContent = url;
          link.target = '_blank';

          const deleteBtn = document.createElement('button');
          deleteBtn.textContent = '削除';
          deleteBtn.className = 'delete-btn';
          deleteBtn.dataset.url = url;

          deleteBtn.addEventListener('click', (e) => {
            const urlToDelete = e.target.dataset.url;
            chrome.storage.local.get(['urls'], (result) => {
              const filteredUrls = result.urls.filter(u => u !== urlToDelete);
              chrome.storage.local.set({ urls: filteredUrls });
            });
          });

          listItem.appendChild(link);

          listItem.appendChild(deleteBtn);
          urlList.appendChild(listItem);
        });
      }
    });
  }

  downloadBtn.addEventListener('click', () => {
    chrome.storage.local.get(['urls'], (result) => {
      const urls = result.urls || [];
      const data = { urls: urls };
      const jsonString = JSON.stringify(data, null, 2);
      const blob = new Blob([jsonString], { type: 'application/json' });
      const url = URL.createObjectURL(blob);

      const a = document.createElement('a');
      a.href = url;
      a.download = 'saved_urls.json';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    });
  });

  clearBtn.addEventListener('click', () => {
    if (confirm('本当にすべてのURLを削除しますか？')) {
      chrome.storage.local.set({ urls: [] }, () => {
        console.log('All URLs cleared.');
      });
    }
  });

  chrome.storage.onChanged.addListener((changes, namespace) => {
    if (namespace === 'local' && changes.urls) {
      loadUrls();
    }
  });

  function saveSettings() {
    const accounts = autoSaveAccountsInput.value
      .split(',')
      .map(s => s.trim().replace('@', ''))
      .filter(s => s.length > 0);

    chrome.storage.sync.set({
      saveToStorage: saveToStorageCheckbox.checked,
      copyToClipboard: copyToClipboardCheckbox.checked,
      autoSaveEnabled: autoSaveEnabledCheckbox.checked,
      autoSaveAccounts: accounts
    });
  }

  function restoreSettings() {
    chrome.storage.sync.get({
      saveToStorage: true,
      copyToClipboard: true,
      autoSaveEnabled: false,
      autoSaveAccounts: []
    }, (items) => {
      saveToStorageCheckbox.checked = items.saveToStorage;
      copyToClipboardCheckbox.checked = items.copyToClipboard;
      autoSaveEnabledCheckbox.checked = items.autoSaveEnabled;
      autoSaveAccountsInput.value = items.autoSaveAccounts.join(', ');
    });
  }

  saveToStorageCheckbox.addEventListener('change', saveSettings);
  copyToClipboardCheckbox.addEventListener('change', saveSettings);
  autoSaveEnabledCheckbox.addEventListener('change', saveSettings);
  autoSaveAccountsInput.addEventListener('blur', saveSettings);

  loadUrls();
  restoreSettings();
});
