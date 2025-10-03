/**
 * Popup script for Polka extension
 */

// UI Elements
const noKeyState = document.getElementById('no-key-state')!;
const lockedState = document.getElementById('locked-state')!;
const unlockedState = document.getElementById('unlocked-state')!;
const keyError = document.getElementById('key-error')!;

const newPasswordInput = document.getElementById('new-password') as HTMLInputElement;
const unlockPasswordInput = document.getElementById('unlock-password') as HTMLInputElement;
const lockedPublicKey = document.getElementById('locked-public-key')!;
const unlockedPublicKey = document.getElementById('unlocked-public-key')!;

const generateKeyBtn = document.getElementById('generate-key-btn')!;
const unlockBtn = document.getElementById('unlock-btn')!;
const lockBtn = document.getElementById('lock-btn')!;

const p2pStatus = document.getElementById('p2p-status')!;
const peerId = document.getElementById('peer-id')!;
const connections = document.getElementById('connections')!;
const refreshStatusBtn = document.getElementById('refresh-status-btn')!;

const eventTypeSelect = document.getElementById('event-type') as HTMLSelectElement;
const eventMessageTextarea = document.getElementById('event-message') as HTMLTextAreaElement;
const createEventBtn = document.getElementById('create-event-btn')!;
const eventsContainer = document.getElementById('events-container')!;
const refreshEventsBtn = document.getElementById('refresh-events-btn')!;

const whitelistDomainInput = document.getElementById('whitelist-domain') as HTMLInputElement;
const addWhitelistBtn = document.getElementById('add-whitelist-btn')!;
const whitelistList = document.getElementById('whitelist-list')!;

/**
 * Send message to background script
 */
function sendMessage(message: any): Promise<any> {
  return new Promise((resolve) => {
    browser.runtime.sendMessage(message, (response) => {
      resolve(response);
    });
  });
}

/**
 * Show error message
 */
function showError(message: string) {
  keyError.textContent = message;
  keyError.style.display = 'block';
  setTimeout(() => {
    keyError.style.display = 'none';
  }, 5000);
}

/**
 * Update key state UI
 */
async function updateKeyState() {
  const publicKeyResponse = await sendMessage({ type: 'GET_PUBLIC_KEY' });
  const unlockedResponse = await sendMessage({ type: 'IS_UNLOCKED' });

  noKeyState.style.display = 'none';
  lockedState.style.display = 'none';
  unlockedState.style.display = 'none';

  if (!publicKeyResponse.publicKey) {
    // No keypair
    noKeyState.style.display = 'block';
  } else if (unlockedResponse.unlocked) {
    // Unlocked
    unlockedState.style.display = 'block';
    unlockedPublicKey.textContent = publicKeyResponse.publicKey;
  } else {
    // Locked
    lockedState.style.display = 'block';
    lockedPublicKey.textContent = publicKeyResponse.publicKey;
  }
}

/**
 * Update P2P status
 */
async function updateP2PStatus() {
  const response = await sendMessage({ type: 'GET_P2P_STATUS' });

  if (response.success && response.status) {
    const { isRunning, peerId: pId, connections: conn } = response.status;

    if (isRunning) {
      p2pStatus.textContent = '🟢 Connected';
      p2pStatus.className = 'status-badge success';
    } else {
      p2pStatus.textContent = '🔴 Disconnected';
      p2pStatus.className = 'status-badge error';
    }

    peerId.textContent = pId || '-';
    connections.textContent = conn.toString();
  }
}

/**
 * Update events list
 */
async function updateEventsList() {
  const response = await sendMessage({ type: 'GET_ALL_EVENTS' });

  if (response.success && response.events) {
    if (response.events.length === 0) {
      eventsContainer.innerHTML = '<p class="empty-state">No events yet</p>';
    } else {
      eventsContainer.innerHTML = response.events.map((event: any) => `
        <div class="event-item">
          <div class="event-type">${event.event}</div>
          <div class="event-id">ID: ${event.id}</div>
          <div class="event-timestamp">${new Date(event.timestamp).toLocaleString()}</div>
        </div>
      `).join('');
    }
  }
}

/**
 * Update whitelist
 */
async function updateWhitelist() {
  const response = await sendMessage({ type: 'GET_WHITELIST' });

  if (response.success && response.whitelist) {
    if (response.whitelist.length === 0) {
      whitelistList.innerHTML = '<li class="empty-state">No domains whitelisted</li>';
    } else {
      whitelistList.innerHTML = response.whitelist.map((domain: string) => `
        <li>
          <span>${domain}</span>
          <button class="btn danger remove-whitelist" data-domain="${domain}">Remove</button>
        </li>
      `).join('');

      // Add event listeners to remove buttons
      document.querySelectorAll('.remove-whitelist').forEach(btn => {
        btn.addEventListener('click', async (e) => {
          const domain = (e.target as HTMLElement).getAttribute('data-domain');
          await sendMessage({ type: 'REMOVE_FROM_WHITELIST', domain });
          await updateWhitelist();
        });
      });
    }
  }
}

/**
 * Event Listeners
 */

// Generate keypair
generateKeyBtn.addEventListener('click', async () => {
  const password = newPasswordInput.value;

  if (!password || password.length < 8) {
    showError('Password must be at least 8 characters');
    return;
  }

  const response = await sendMessage({ type: 'GENERATE_KEYPAIR', password });

  if (response.success) {
    newPasswordInput.value = '';
    await updateKeyState();
  } else {
    showError(response.error || 'Failed to generate keypair');
  }
});

// Unlock key
unlockBtn.addEventListener('click', async () => {
  const password = unlockPasswordInput.value;

  if (!password) {
    showError('Please enter password');
    return;
  }

  const response = await sendMessage({ type: 'UNLOCK_KEY', password });

  if (response.success) {
    unlockPasswordInput.value = '';
    await updateKeyState();
  } else {
    showError(response.error || 'Failed to unlock key');
  }
});

// Lock key
lockBtn.addEventListener('click', async () => {
  await sendMessage({ type: 'LOCK_KEY' });
  await updateKeyState();
});

// Refresh status
refreshStatusBtn.addEventListener('click', async () => {
  await updateP2PStatus();
});

// Create event
createEventBtn.addEventListener('click', async () => {
  const eventType = eventTypeSelect.value;
  const messageText = eventMessageTextarea.value;

  if (!messageText) {
    showError('Please enter event message');
    return;
  }

  let message;
  try {
    message = JSON.parse(messageText);
  } catch (e) {
    showError('Invalid JSON message');
    return;
  }

  const response = await sendMessage({ type: 'CREATE_EVENT', eventType, message });

  if (response.success) {
    eventMessageTextarea.value = '';
    await updateEventsList();
  } else {
    showError(response.error || 'Failed to create event');
  }
});

// Refresh events
refreshEventsBtn.addEventListener('click', async () => {
  await updateEventsList();
});

// Add to whitelist
addWhitelistBtn.addEventListener('click', async () => {
  const domain = whitelistDomainInput.value.trim();

  if (!domain) {
    showError('Please enter a domain');
    return;
  }

  const response = await sendMessage({ type: 'ADD_TO_WHITELIST', domain });

  if (response.success) {
    whitelistDomainInput.value = '';
    await updateWhitelist();
  } else {
    showError(response.error || 'Failed to add domain');
  }
});

/**
 * Initialize popup
 */
async function init() {
  await updateKeyState();
  await updateP2PStatus();
  await updateEventsList();
  await updateWhitelist();
}

// Start
init();
