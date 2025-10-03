import { getP2PNode } from './p2p.js';
import { getDatabase } from './db.js';
import { getProtocolHandler } from './protocol.js';
import {
  generateKeypair,
  signEvent,
  encryptPrivateKey,
  decryptPrivateKey,
  storeEncryptedKey,
  loadEncryptedKey,
  storePublicKey,
  loadPublicKey,
  PolkaEvent
} from './crypto.js';

/**
 * Background script - runs persistently in Manifest v2
 */

console.log('Polka background script starting...');

// Initialize components
const p2pNode = getP2PNode();
const db = getDatabase();
const protocolHandler = getProtocolHandler();

// Track current private key (in memory only)
let currentPrivateKey: Uint8Array | null = null;

/**
 * Initialize the extension
 */
async function initialize() {
  try {
    console.log('Initializing Polka extension...');

    // Check if we have a stored keypair
    const publicKey = await loadPublicKey();

    if (publicKey) {
      console.log('Found existing keypair, public key:', publicKey);
    } else {
      console.log('No keypair found. User needs to generate or import one.');
    }

    // Start P2P node
    await p2pNode.start();

    // Initialize protocol handler
    protocolHandler.init();

    // Get database info
    const dbInfo = await db.getInfo();
    console.log('Database info:', dbInfo);

    console.log('Polka extension initialized successfully');
    console.log('Peer ID:', p2pNode.getPeerId());
    console.log('Multiaddrs:', p2pNode.getMultiaddrs());

  } catch (error) {
    console.error('Failed to initialize Polka extension:', error);
  }
}

/**
 * Message handler for communication with popup/content scripts
 */
browser.runtime.onMessage.addListener((message, sender, sendResponse) => {
  console.log('Received message:', message);

  (async () => {
    try {
      switch (message.type) {
        case 'GENERATE_KEYPAIR': {
          const { password } = message;
          const { privateKey, publicKey } = generateKeypair();

          // Encrypt and store private key
          const encrypted = await encryptPrivateKey(privateKey, password);
          await storeEncryptedKey(encrypted);
          await storePublicKey(publicKey);

          // Keep in memory
          currentPrivateKey = privateKey;

          sendResponse({ success: true, publicKey });
          break;
        }

        case 'UNLOCK_KEY': {
          const { password } = message;
          const encrypted = await loadEncryptedKey();

          if (!encrypted) {
            sendResponse({ success: false, error: 'No keypair found' });
            break;
          }

          try {
            currentPrivateKey = await decryptPrivateKey(encrypted, password);
            const publicKey = await loadPublicKey();
            sendResponse({ success: true, publicKey });
          } catch (error) {
            sendResponse({ success: false, error: 'Invalid password' });
          }
          break;
        }

        case 'LOCK_KEY': {
          currentPrivateKey = null;
          sendResponse({ success: true });
          break;
        }

        case 'GET_PUBLIC_KEY': {
          const publicKey = await loadPublicKey();
          sendResponse({ success: true, publicKey });
          break;
        }

        case 'IS_UNLOCKED': {
          sendResponse({ success: true, unlocked: currentPrivateKey !== null });
          break;
        }

        case 'CREATE_EVENT': {
          if (!currentPrivateKey) {
            sendResponse({ success: false, error: 'Key not unlocked' });
            break;
          }

          const { eventType, message: eventMessage } = message;
          const publicKey = await loadPublicKey();

          if (!publicKey) {
            sendResponse({ success: false, error: 'No public key found' });
            break;
          }

          const unsignedEvent: Omit<PolkaEvent, 'id' | 'signature'> = {
            publickey: publicKey,
            event: eventType,
            timestamp: new Date().toISOString(),
            message: eventMessage
          };

          const signedEvent = signEvent(unsignedEvent, currentPrivateKey);
          await db.storeEvent(signedEvent);

          sendResponse({ success: true, event: signedEvent });
          break;
        }

        case 'GET_EVENT': {
          const { id } = message;
          const event = await db.getEvent(id);
          sendResponse({ success: true, event });
          break;
        }

        case 'GET_ALL_EVENTS': {
          const events = await db.getAllEvents();
          sendResponse({ success: true, events });
          break;
        }

        case 'GET_EVENTS_BY_TYPE': {
          const { eventType } = message;
          const events = await db.getEventsByType(eventType);
          sendResponse({ success: true, events });
          break;
        }

        case 'DELETE_EVENT': {
          const { id } = message;
          await db.deleteEvent(id);
          sendResponse({ success: true });
          break;
        }

        case 'GET_P2P_STATUS': {
          const status = p2pNode.getStatus();
          sendResponse({ success: true, status });
          break;
        }

        case 'FETCH_REMOTE_EVENT': {
          const { multiaddr, eventId } = message;
          const event = await p2pNode.fetchEvent(multiaddr, eventId);
          sendResponse({ success: true, event });
          break;
        }

        case 'ADD_TO_WHITELIST': {
          const { domain } = message;
          const result = await browser.storage.local.get('whitelist');
          const whitelist = result.whitelist || [];

          if (!whitelist.includes(domain)) {
            whitelist.push(domain);
            await browser.storage.local.set({ whitelist });
          }

          sendResponse({ success: true, whitelist });
          break;
        }

        case 'REMOVE_FROM_WHITELIST': {
          const { domain } = message;
          const result = await browser.storage.local.get('whitelist');
          let whitelist = result.whitelist || [];

          whitelist = whitelist.filter((d: string) => d !== domain);
          await browser.storage.local.set({ whitelist });

          sendResponse({ success: true, whitelist });
          break;
        }

        case 'GET_WHITELIST': {
          const result = await browser.storage.local.get('whitelist');
          const whitelist = result.whitelist || [];
          sendResponse({ success: true, whitelist });
          break;
        }

        default:
          sendResponse({ success: false, error: 'Unknown message type' });
      }
    } catch (error) {
      console.error('Error handling message:', error);
      sendResponse({ success: false, error: (error as Error).message });
    }
  })();

  return true; // Keep channel open for async response
});

// Start initialization
initialize();

console.log('Polka background script loaded');
