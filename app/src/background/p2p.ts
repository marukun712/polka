import { createLibp2p, Libp2p } from 'libp2p';
import { webRTC } from '@libp2p/webrtc';
import { webSockets } from '@libp2p/websockets';
import { noise } from '@chainsafe/libp2p-noise';
import { yamux } from '@chainsafe/libp2p-yamux';
import { kadDHT } from '@libp2p/kad-dht';
import { mdns } from '@libp2p/mdns';
import { bootstrap } from '@libp2p/bootstrap';
import { circuitRelayTransport } from '@libp2p/circuit-relay-v2';
import { identify } from '@libp2p/identify';
import { autoNAT } from '@libp2p/autonat';
import { dcutr } from '@libp2p/dcutr';
import { fromString as uint8ArrayFromString } from 'uint8arrays/from-string';
import { toString as uint8ArrayToString } from 'uint8arrays/to-string';
import { getDatabase } from './db.js';
import { verifyEvent, PolkaEvent } from './crypto.js';

const POLKA_PROTOCOL = '/polka/1.0.0';

export class PolkaP2PNode {
  private node: Libp2p | null = null;
  private isRunning = false;

  /**
   * Start the libp2p node with hole punching capabilities
   */
  async start(): Promise<void> {
    if (this.isRunning) {
      console.log('P2P node already running');
      return;
    }

    console.log('Starting libp2p node...');

    try {
      this.node = await createLibp2p({
        addresses: {
          listen: [
            '/webrtc'
          ]
        },
        transports: [
          webRTC(),
          webSockets(),
          circuitRelayTransport({
            discoverRelays: 1
          })
        ],
        connectionEncrypters: [noise()],
        streamMuxers: [yamux()],
        peerDiscovery: [
          mdns(),
          bootstrap({
            list: [
              // Public bootstrap nodes
              '/dnsaddr/bootstrap.libp2p.io/p2p/QmNnooDu7bfjPFoTZYxMNLWUQJyrVwtbZg5gBMjTezGAJN',
              '/dnsaddr/bootstrap.libp2p.io/p2p/QmQCU2EcMqAqQPR2i9bChDtGNJchTbq5TbXJJ16u19uLTa'
            ]
          })
        ],
        services: {
          identify: identify(),
          dht: kadDHT({
            clientMode: false
          }),
          autoNAT: autoNAT(),
          dcutr: dcutr()
        }
      });

      // Handle incoming protocol requests
      await this.node.handle(POLKA_PROTOCOL, async ({ stream }) => {
        try {
          const chunks: Uint8Array[] = [];
          for await (const chunk of stream.source) {
            chunks.push(chunk.subarray());
          }

          const request = uint8ArrayToString(
            chunks.reduce((acc, chunk) => {
              const tmp = new Uint8Array(acc.length + chunk.length);
              tmp.set(acc, 0);
              tmp.set(chunk, acc.length);
              return tmp;
            }, new Uint8Array(0))
          );

          console.log('Received request:', request);

          // Parse request: eventId
          const eventId = request.trim();

          // Check whitelist
          const allowed = await this.checkWhitelist();
          if (!allowed) {
            await stream.sink([uint8ArrayFromString(JSON.stringify({ error: 'Access denied' }))]);
            await stream.close();
            return;
          }

          // Get event from database
          const db = getDatabase();
          const event = await db.getEvent(eventId);

          if (!event) {
            await stream.sink([uint8ArrayFromString(JSON.stringify({ error: 'Event not found' }))]);
          } else {
            await stream.sink([uint8ArrayFromString(JSON.stringify(event))]);
          }

          await stream.close();
        } catch (error) {
          console.error('Error handling protocol request:', error);
        }
      });

      await this.node.start();
      this.isRunning = true;

      console.log('Libp2p node started');
      console.log('Peer ID:', this.node.peerId.toString());
      console.log('Listening addresses:', this.node.getMultiaddrs().map(ma => ma.toString()));

    } catch (error) {
      console.error('Failed to start libp2p node:', error);
      throw error;
    }
  }

  /**
   * Stop the libp2p node
   */
  async stop(): Promise<void> {
    if (!this.isRunning || !this.node) {
      return;
    }

    console.log('Stopping libp2p node...');
    await this.node.stop();
    this.isRunning = false;
    this.node = null;
    console.log('Libp2p node stopped');
  }

  /**
   * Get node's peer ID
   */
  getPeerId(): string | null {
    return this.node ? this.node.peerId.toString() : null;
  }

  /**
   * Get node's multiaddresses
   */
  getMultiaddrs(): string[] {
    if (!this.node) return [];
    return this.node.getMultiaddrs().map(ma => ma.toString());
  }

  /**
   * Fetch an event from a remote peer
   */
  async fetchEvent(peerMultiaddr: string, eventId: string): Promise<PolkaEvent | null> {
    if (!this.node) {
      throw new Error('Node not started');
    }

    try {
      const { stream } = await this.node.dialProtocol(peerMultiaddr as any, POLKA_PROTOCOL);

      // Send request
      await stream.sink([uint8ArrayFromString(eventId)]);

      // Read response
      const chunks: Uint8Array[] = [];
      for await (const chunk of stream.source) {
        chunks.push(chunk.subarray());
      }

      const response = uint8ArrayToString(
        chunks.reduce((acc, chunk) => {
          const tmp = new Uint8Array(acc.length + chunk.length);
          tmp.set(acc, 0);
          tmp.set(chunk, acc.length);
          return tmp;
        }, new Uint8Array(0))
      );

      await stream.close();

      const data = JSON.parse(response);

      if (data.error) {
        console.error('Error fetching event:', data.error);
        return null;
      }

      // Verify signature
      if (!verifyEvent(data)) {
        console.error('Invalid event signature');
        return null;
      }

      return data as PolkaEvent;
    } catch (error) {
      console.error('Error fetching event:', error);
      return null;
    }
  }

  /**
   * Check if the requesting origin is whitelisted
   */
  private async checkWhitelist(): Promise<boolean> {
    try {
      const result = await browser.storage.local.get('whitelist');
      const whitelist = result.whitelist || [];

      // For now, allow all requests in background
      // In a real implementation, you'd check the requesting origin
      return true;
    } catch (error) {
      console.error('Error checking whitelist:', error);
      return false;
    }
  }

  /**
   * Get connection status
   */
  getStatus(): { isRunning: boolean; peerId: string | null; connections: number } {
    return {
      isRunning: this.isRunning,
      peerId: this.getPeerId(),
      connections: this.node ? this.node.getConnections().length : 0
    };
  }
}

// Singleton instance
let p2pInstance: PolkaP2PNode | null = null;

export function getP2PNode(): PolkaP2PNode {
  if (!p2pInstance) {
    p2pInstance = new PolkaP2PNode();
  }
  return p2pInstance;
}
