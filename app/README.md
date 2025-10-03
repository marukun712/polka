# Polka Firefox Extension

Polka is a decentralized P2P data hosting Firefox extension that allows users to host and share data using libp2p with hole punching capabilities.

## Features

- **Self-hosted data**: Every node hosts its own data (similar to ATProto's PDS)
- **P2P connectivity**: Uses libp2p with WebRTC hole punching - no port forwarding needed
- **Cryptographic signatures**: All events are signed with Schnorr signatures
- **Secure key storage**: Private keys are encrypted using NIP-49 inspired format
- **Access control**: Whitelist-based domain access control
- **Custom protocol**: Access data via `polka://peerid/eventid` URLs
- **PouchDB storage**: All data stored locally in browser

## Architecture

### Event Schema

```json
{
  "id": "xxxxxxx",
  "publickey": "xxxxxxx",
  "signature": "xxxxxxx",
  "event": "polka.post",
  "timestamp": "2025-09-30T12:34:56Z",
  "message": {
    "...": "arbitrary JSON data"
  }
}
```

### Components

- **Background script** (persistent): Runs libp2p node, PouchDB, and protocol handler
- **Popup UI**: Key management, event creation, whitelist configuration
- **Protocol handler**: Handles `polka://` protocol requests
- **Crypto module**: Schnorr signatures with @noble/curves
- **P2P module**: libp2p with WebRTC, DHT, mDNS, Circuit Relay v2, AutoNAT, DCUTR

## Development

### Prerequisites

- Node.js 18+ and pnpm
- Firefox (for testing)

### Installation

```bash
cd app
pnpm install
```

### Build

```bash
# Development build with watch mode
pnpm dev

# Production build
pnpm build
```

### Load Extension in Firefox

1. Build the extension (`pnpm build`)
2. Open Firefox and navigate to `about:debugging#/runtime/this-firefox`
3. Click "Load Temporary Add-on"
4. Select the `manifest.json` file from the `dist/` directory

Note: Icons need to be created before loading. See `icons/README.md`.

### Create Icons (Optional)

If you have ImageMagick installed:

```bash
cd icons
convert -size 16x16 xc:#667eea icon-16.png
convert -size 32x32 xc:#667eea icon-32.png
convert -size 48x48 xc:#667eea icon-48.png
convert -size 128x128 xc:#667eea icon-128.png
```

Or create PNG icons with your preferred image editor.

## Usage

### 1. Generate Keypair

1. Click the Polka extension icon
2. Enter a strong password (min 8 characters)
3. Click "Generate Keypair"
4. Your public key will be displayed

### 2. Create Events

1. Unlock your key with your password
2. Select event type (e.g., `polka.post`)
3. Enter message as JSON (e.g., `{"text": "Hello World"}`)
4. Click "Create Event"

### 3. Access Events

Events can be accessed via the custom protocol:

```
polka://YOUR_PEER_ID/EVENT_ID
```

You can also access events from remote peers:

```
polka://REMOTE_PEER_ID/EVENT_ID
```

### 4. Manage Whitelist

Add domains that are allowed to access your data:

1. Enter domain name (e.g., `example.com`)
2. Click "Add Domain"
3. Remove domains by clicking "Remove" next to them

## Technical Details

### libp2p Configuration

- **Transports**: WebRTC, WebSockets, Circuit Relay v2
- **Connection encryption**: Noise
- **Stream multiplexing**: Yamux
- **Peer discovery**: mDNS, DHT (Kademlia), Bootstrap nodes
- **NAT traversal**: AutoNAT, DCUTR (Direct Connection Upgrade through Relay)
- **Protocol**: `/polka/1.0.0`

### Security

- Private keys are encrypted with AES-GCM using PBKDF2 (100,000 iterations)
- All events are cryptographically signed with Schnorr signatures
- Signatures are verified before displaying events
- Only whitelisted domains can access your data (planned feature)

### Storage

- **PouchDB**: Local event storage in browser
- **browser.storage.local**: Encrypted private key and configuration

## Protocol Format

```
polka://[multiaddr|peerid]/[eventid]
```

Examples:
- `polka://QmPeerID123.../abc123def456...`
- `polka://12D3KooWPeerID.../event-id-hash...`

## Limitations & Future Work

- **Icons**: Placeholder icons need to be created
- **Peer discovery**: Currently relies on public bootstrap nodes
- **Data replication**: Not yet implemented (planned: IPFS-style distribution with encryption)
- **Access control**: Whitelist checking not fully implemented in protocol handler
- **WebRTC support**: Browser-specific limitations may apply
- **Manifest v3**: Firefox currently supports Manifest v2 for persistent background scripts

## Contributing

This is an experimental project. Contributions are welcome!

## License

ISC

## Security Considerations

⚠️ **Important Security Notes**:

- This is experimental software - use at your own risk
- Always use strong passwords for key encryption
- Back up your encrypted keys from browser storage
- Be aware that plaintext copies/screenshots cannot be prevented
- Whitelist only trusted domains
- Review the code before using in production

## References

- [libp2p Documentation](https://docs.libp2p.io/)
- [PouchDB Documentation](https://pouchdb.com/)
- [NIP-49 (Nostr Improvement Proposal)](https://github.com/nostr-protocol/nips/blob/master/49.md)
- [@noble/curves](https://github.com/paulmillr/noble-curves)
