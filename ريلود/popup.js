// Interface elements
const list = document.getElementById('extensionsList');
const updateAllBtn = document.getElementById('updateAll');
const updateAllReloadTabsBtn = document.getElementById('updateAllReloadTabs');

// Default fallback icon
const defaultIcon = 'data:image/svg+xml;utf8,' +
  encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#6b7280" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
       <rect x="3" y="3" width="18" height="18" rx="3"></rect>
       <path d="M8 7h8M8 12h8M8 17h5"></path>
     </svg>`
  );

function escapeHtml(str) {
  if (!str) return '';
  return str.replace(/[&<>"']/g, s => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[s]));
}

// position the menu so it never overflows the viewport
function positionMenu(menu, anchor) {
  // temporarily show (but invisible) to measure
  menu.style.visibility = 'hidden';
  menu.style.display = 'block';
  menu.style.position = 'fixed'; // fixed to viewport
  menu.style.maxWidth = '260px';
  menu.style.boxSizing = 'border-box';

  const mRect = menu.getBoundingClientRect();
  const aRect = anchor.getBoundingClientRect();

  const margin = 8; // safe margin from edges

  // Preferred placement: below the anchor, aligned to anchor's right edge
  let left = aRect.right - mRect.width;
  // If it would overflow left side, shift right
  if (left < margin) left = Math.min(margin, window.innerWidth - mRect.width - margin);

  let top = aRect.bottom;
  // If it overflows bottom, try placing above the anchor
  if (top + mRect.height > window.innerHeight - margin) {
    top = aRect.top - mRect.height;
    // if still overflow (very tall menu), clamp to viewport
    if (top < margin) {
      top = Math.max(margin, window.innerHeight - mRect.height - margin);
    }
  }

  // final safety clamp horizontally
  if (left + mRect.width > window.innerWidth - margin) {
    left = Math.max(margin, window.innerWidth - mRect.width - margin);
  }

  menu.style.left = Math.round(left) + 'px';
  menu.style.top = Math.round(top) + 'px';

  // restore visibility
  menu.style.visibility = 'visible';
}

// Get all extensions except this extension itself
chrome.management.getAll(function (extensions) {
  // show all extensions except this one
  const shownExtensions = extensions.filter(ext => ext.id !== chrome.runtime.id);

  if (shownExtensions.length === 0) {
    const p = document.createElement('p');
    p.textContent = 'No extensions found (except this extension).';
    list.appendChild(p);
    return;
  }

  shownExtensions.forEach((ext) => {
    const div = document.createElement('div');
    div.className = 'extension';
    div.style.position = 'relative';
    // store ext id for later use (update all etc.)
    div.dataset.extId = ext.id;

    // LEFT SIDE (icon + name + status)
    const left = document.createElement('div');
    left.className = 'ext-left';

    // extension icon
    const extIcon = document.createElement('img');
    const bestIcon = (ext.icons && ext.icons.length)
      ? ext.icons.sort((a, b) => (b.size || 0) - (a.size || 0))[0].url
      : defaultIcon;

    extIcon.src = bestIcon;
    extIcon.width = 20;
    extIcon.height = 20;
    extIcon.className = 'ext-icon';
    extIcon.alt = '';
    extIcon.addEventListener('error', () => {
      if (extIcon.src !== defaultIcon) extIcon.src = defaultIcon;
    });

    const nameSpan = document.createElement('span');
    nameSpan.className = 'ext-name';
    nameSpan.textContent = ext.name;

    const status = document.createElement('span');
    status.className = 'status';
    status.textContent = '';

    left.appendChild(extIcon);     // icon beside name
    left.appendChild(nameSpan);
    left.appendChild(status);

    // Options button
    const optionsBtn = document.createElement('button');
    optionsBtn.className = 'options-btn';
    optionsBtn.innerHTML =
      '<img src="https://unpkg.com/ionicons@7.1.0/dist/svg/ellipsis-vertical.svg" width="18" height="18">';

    // Simple dropdown menu
    const menu = document.createElement('div');
    menu.className = 'menu';

    const updateOpt = document.createElement('button');
    updateOpt.textContent = 'Update';

    const moreOpt = document.createElement('button');
    moreOpt.textContent = 'More';

    menu.appendChild(updateOpt);
    menu.appendChild(moreOpt);

    // Expanded panel
    const panel = document.createElement('div');
    panel.className = 'expanded-panel';
    panel.style.display = 'none';

    let panelLoaded = false;

    const panelActions = document.createElement('div');
    panelActions.className = 'panel-actions';

    const closePanelBtn = document.createElement('button');
    closePanelBtn.textContent = 'Close';

    const updateWithTabsBtn = document.createElement('button');
    updateWithTabsBtn.textContent = 'Update all';

    panelActions.appendChild(closePanelBtn);
    panelActions.appendChild(updateWithTabsBtn);

    const tabsListDiv = document.createElement('div');
    tabsListDiv.className = 'tabs-list';

    panel.appendChild(panelActions);
    panel.appendChild(tabsListDiv);

    // Append everything
    div.appendChild(left);
    div.appendChild(optionsBtn);
    div.appendChild(menu);
    div.appendChild(panel);
    list.appendChild(div);

    // Update extension function
    function updateExtensionById(extId, statusEl, onDone) {
      statusEl.textContent = 'Updating...';
      chrome.management.setEnabled(extId, false, () => {
        chrome.management.setEnabled(extId, true, () => {
          statusEl.textContent = 'Updated';
          setTimeout(() => {
            statusEl.textContent = '';
            if (typeof onDone === 'function') onDone();
          }, 1500);
        });
      });
    }

    // Show/Hide menu — now positioned to never overflow viewport
    optionsBtn.addEventListener('click', (e) => {
      e.stopPropagation();

      // hide other menus/panels
      document.querySelectorAll('.menu').forEach(m => {
        if (m !== menu) m.style.display = 'none';
      });
      document.querySelectorAll('.expanded-panel').forEach(p => p.style.display = 'none');

      const isShown = menu.style.display === 'block';
      if (isShown) {
        menu.style.display = 'none';
      } else {
        // position and show menu within viewport bounds
        positionMenu(menu, optionsBtn);
      }
    });

    // Clicking anywhere else hides menus/panels
    document.addEventListener('click', () => {
      document.querySelectorAll('.menu').forEach(m => m.style.display = 'none');
      // do not auto-hide expanded-panel here to preserve user's opened panel if desired
    });

    // Update option (uses ext.id from closure)
    updateOpt.addEventListener('click', (ev) => {
      ev.stopPropagation();
      menu.style.display = 'none';
      updateExtensionById(ext.id, status);
    });

    // More option (open panel)
    moreOpt.addEventListener('click', (ev) => {
      ev.stopPropagation();
      menu.style.display = 'none';

      document.querySelectorAll('.expanded-panel').forEach(p => p.style.display = 'none');

      panel.style.display = 'block';

      if (!panelLoaded) {
        loadTabsIntoPanel(tabsListDiv, ext, status, panel);
        panelLoaded = true;
      }
    });

    // Close panel
    closePanelBtn.addEventListener('click', (ev) => {
      ev.stopPropagation();
      panel.style.display = 'none';
    });

    // Update + reload all tabs (for this extension)
    updateWithTabsBtn.addEventListener('click', (ev) => {
      ev.stopPropagation();
      updateExtensionById(ext.id, status, () => {
        chrome.tabs.query({}, function (tabs) {
          tabs.forEach(t => {
            try { chrome.tabs.reload(t.id); } catch (e) {}
          });
        });
      });
      panel.style.display = 'none';
    });

  });

  // Update ALL (use ext id stored on each div)
  updateAllBtn.addEventListener('click', () => {
    const extDivs = Array.from(list.querySelectorAll('.extension'));
    extDivs.forEach((div) => {
      const statusEl = div.querySelector('.status');
      const extId = div.dataset.extId;
      if (!extId) return;
      statusEl.textContent = 'Updating...';
      chrome.management.setEnabled(extId, false, () => {
        chrome.management.setEnabled(extId, true, () => {
          statusEl.textContent = 'Updated';
          setTimeout(() => { statusEl.textContent = ''; }, 1200);
        });
      });
    });
  });

  // Update ALL + reload ALL tabs
  updateAllReloadTabsBtn.addEventListener('click', () => {
    updateAllBtn.click();
    chrome.tabs.query({}, function (tabs) {
      tabs.forEach(tab => {
        try { chrome.tabs.reload(tab.id); } catch (e) {}
      });
    });
  });

});

// Load tabs into panel (lazy loading)
function loadTabsIntoPanel(container, extObject, statusElement, panelEl) {
  container.innerHTML =
    '<div style="font-size:13px; color:#6b7280; padding:6px 0 8px 0;">Loading tabs...</div>';

  chrome.tabs.query({}, function (tabs) {
    container.innerHTML = '';
    if (!tabs || tabs.length === 0) {
      container.innerHTML =
        '<div style="color:#6b7280; font-size:13px;">No open tabs.</div>';
      return;
    }

    tabs.forEach(tab => {
      const tdiv = document.createElement('div');
      tdiv.className = 'tab-item';
      tdiv.title = tab.title || tab.url || 'No title';

      const fav = document.createElement('img');
      fav.src = tab.favIconUrl || defaultIcon;
      fav.width = 20;
      fav.height = 20;
      fav.alt = '';
      fav.addEventListener('error', () => {
        if (fav.src !== defaultIcon) fav.src = defaultIcon;
      });

      const titleSpan = document.createElement('span');
      titleSpan.className = 'tab-title';
      titleSpan.textContent = tab.title || tab.url || '(No title)';

      tdiv.appendChild(fav);
      tdiv.appendChild(titleSpan);

      // Click → update extension + reload selected tab
      tdiv.addEventListener('click', () => {
        panelEl.style.display = 'none';
        statusElement.textContent = 'Updating...';
        chrome.management.setEnabled(extObject.id, false, () => {
          chrome.management.setEnabled(extObject.id, true, () => {
            statusElement.textContent = 'Updated';

            try {
              chrome.tabs.reload(tab.id, {}, () => {
                chrome.tabs.update(tab.id, { active: true });
              });
            } catch (err) {}

            setTimeout(() => { statusElement.textContent = ''; }, 1000);
          });
        });
      });

      container.appendChild(tdiv);
    });
  });
}

