const list = document.getElementById('extensionsList');
const updateAllBtn = document.getElementById('updateAll');
const updateAllReloadTabsBtn = document.getElementById('updateAllReloadTabs');

// Get all extensions
chrome.management.getAll(function(extensions) {
  const localExtensions = extensions.filter(ext => 
    ext.type === 'extension' && 
    ext.installType === 'development' &&
    ext.id !== chrome.runtime.id
  );

  localExtensions.forEach(ext => {
    const div = document.createElement('div');
    div.className = 'extension';
    
    const span = document.createElement('span');
    span.textContent = ext.name;

    const status = document.createElement('span');
    status.style.marginLeft = '10px';
    status.style.color = '#a352ffff';
    status.style.fontSize = '12px';

    const btn = document.createElement('button');
    btn.textContent = 'Update';
    btn.addEventListener('click', () => updateExtension(ext, status));

    div.appendChild(span);
    div.appendChild(status);
    div.appendChild(btn);
    list.appendChild(div);
  });

  // Update All button
  updateAllBtn.addEventListener('click', () => {
    localExtensions.forEach((ext, index) => {
      const div = list.children[index];
      const status = div.querySelector('span:nth-child(2)');
      updateExtension(ext, status);
    });
  });

  // Update All + Reload Tabs button
  updateAllReloadTabsBtn.addEventListener('click', () => {
    localExtensions.forEach((ext, index) => {
      const div = list.children[index];
      const status = div.querySelector('span:nth-child(2)');
      updateExtension(ext, status);
    });

    // Reload all open tabs
    chrome.tabs.query({}, function(tabs) {
      tabs.forEach(tab => {
        chrome.tabs.reload(tab.id);
      });
    });
  });
});

// Function to update a local extension without alert
function updateExtension(ext, statusElement) {
  chrome.management.setEnabled(ext.id, false, () => {
    chrome.management.setEnabled(ext.id, true, () => {
      if (statusElement) {
        statusElement.textContent = 'Updated';
        setTimeout(() => {
          statusElement.textContent = '';
        }, 2000);
      }
    });
  });
}
