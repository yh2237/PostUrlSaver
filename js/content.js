(function(chrome) {
  let autoClickSettings = {
    enabled: false,
    accounts: []
  };

  function loadAutoClickSettings() {
    chrome.storage.sync.get({
      autoSaveEnabled: false,
      autoSaveAccounts: []
    }, (items) => {
      autoClickSettings.enabled = items.autoSaveEnabled;
      autoClickSettings.accounts = items.autoSaveAccounts;
    });
  }

  function checkAndAutoClick(post) {
    if (!autoClickSettings.enabled || autoClickSettings.accounts.length === 0 || post.dataset.autoClicked === 'true') {
      return;
    }

    const userNameElement = post.querySelector('[data-testid="User-Name"]');
    if (userNameElement) {
      const spans = userNameElement.querySelectorAll('span');
      const accountId = Array.from(spans).find(span => span.textContent.startsWith('@'))?.textContent.substring(1);

      if (accountId && autoClickSettings.accounts.includes(accountId)) {
        const button = post.querySelector('.save-url-button:not(:disabled)');
        if (button) {
          post.dataset.autoClicked = 'true';
          setTimeout(() => button.click(), 100);
        }
      }
    }
  }

  function addSaveButtonToPost(post) {
    if (post.querySelector('.save-url-button')) {
      checkAndAutoClick(post);
      return;
    }

    const toolbar = post.querySelector('div[role="group"]');
    if (toolbar) {
      const button = document.createElement('button');
      button.innerText = '保存';
      button.className = 'save-url-button';

      button.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();

        const timeElement = post.querySelector('time');
        if (timeElement) {
          const link = timeElement.closest('a');
          if (link && link.href) {
            const postUrl = link.href;

            chrome.runtime.sendMessage({ action: 'saveUrl', url: postUrl }, (response) => {
              if (response && response.status === 'processed') {
                button.innerText = '保存済み';
                button.disabled = true;
              }
            });
          }
        }
      });

      toolbar.appendChild(button);
      checkAndAutoClick(post);
    }
  }

  function observeTimeline() {
    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        mutation.addedNodes.forEach((node) => {
          if (node.nodeType === 1) {
            const posts = node.querySelectorAll('article');
            posts.forEach(addSaveButtonToPost);
          }
        });
      });
    });

    observer.observe(document.body, {
      childList: true,
      subtree: true,
    });
  }

  chrome.storage.onChanged.addListener((changes, namespace) => {
    if (namespace === 'sync') {
      loadAutoClickSettings();
    }
  });

  loadAutoClickSettings();
  setTimeout(() => {
    const initialPosts = document.querySelectorAll('article');
    initialPosts.forEach(addSaveButtonToPost);
  }, 2000);
  observeTimeline();

})(chrome);
