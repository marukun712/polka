import { getP2PNode } from './p2p.js';
import { getDatabase } from './db.js';
import { verifyEvent } from './crypto.js';

/**
 * Handle polka:// protocol requests
 * Format: polka://multiaddr/eventid
 *
 * Example: polka://QmPeerID/abc123...
 */
export class ProtocolHandler {
  /**
   * Initialize protocol handler
   */
  init(): void {
    // Listen for web requests to polka:// protocol
    browser.webRequest.onBeforeRequest.addListener(
      this.handleProtocolRequest.bind(this),
      { urls: ['*://polka/*'] },
      ['blocking']
    );

    console.log('Protocol handler initialized');
  }

  /**
   * Handle incoming polka:// protocol requests
   */
  private async handleProtocolRequest(details: any): Promise<any> {
    try {
      const url = new URL(details.url);
      console.log('Protocol request:', url.href);

      // Parse polka://peerid/eventid or polka://multiaddr/eventid
      const path = url.pathname.slice(1); // Remove leading /
      const parts = path.split('/');

      if (parts.length < 2) {
        return this.createErrorResponse('Invalid polka:// URL format. Expected: polka://peerid/eventid');
      }

      const peerIdOrMultiaddr = url.hostname;
      const eventId = parts[parts.length - 1];

      console.log('Peer/Multiaddr:', peerIdOrMultiaddr);
      console.log('Event ID:', eventId);

      // Check if it's a local request (our own peer ID)
      const p2pNode = getP2PNode();
      const ourPeerId = p2pNode.getPeerId();

      let event = null;

      if (peerIdOrMultiaddr === ourPeerId) {
        // Local request
        const db = getDatabase();
        event = await db.getEvent(eventId);
      } else {
        // Remote request - fetch from peer
        const multiaddr = this.constructMultiaddr(peerIdOrMultiaddr);
        event = await p2pNode.fetchEvent(multiaddr, eventId);
      }

      if (!event) {
        return this.createErrorResponse('Event not found');
      }

      // Verify signature
      if (!verifyEvent(event)) {
        return this.createErrorResponse('Invalid event signature');
      }

      // Return event data as JSON
      return {
        redirectUrl: 'data:application/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(event, null, 2))
      };

    } catch (error) {
      console.error('Error handling protocol request:', error);
      return this.createErrorResponse('Internal error: ' + (error as Error).message);
    }
  }

  /**
   * Construct a multiaddr from peer ID
   */
  private constructMultiaddr(peerIdOrMultiaddr: string): string {
    // If it's already a multiaddr, return it
    if (peerIdOrMultiaddr.startsWith('/')) {
      return peerIdOrMultiaddr;
    }

    // Otherwise, construct a basic multiaddr
    // In production, you'd want to look this up from DHT or a registry
    return `/p2p/${peerIdOrMultiaddr}`;
  }

  /**
   * Create an error response
   */
  private createErrorResponse(message: string): any {
    const errorHtml = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Polka Error</title>
        <style>
          body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
            max-width: 600px;
            margin: 100px auto;
            padding: 20px;
          }
          .error {
            background: #fee;
            border: 1px solid #fcc;
            border-radius: 8px;
            padding: 20px;
          }
          h1 { color: #c00; margin-top: 0; }
        </style>
      </head>
      <body>
        <div class="error">
          <h1>Polka Protocol Error</h1>
          <p>${message}</p>
        </div>
      </body>
      </html>
    `;

    return {
      redirectUrl: 'data:text/html;charset=utf-8,' + encodeURIComponent(errorHtml)
    };
  }
}

// Singleton instance
let protocolHandler: ProtocolHandler | null = null;

export function getProtocolHandler(): ProtocolHandler {
  if (!protocolHandler) {
    protocolHandler = new ProtocolHandler();
  }
  return protocolHandler;
}
