// @ts-check
import { createLibp2p } from 'libp2p'
import { autoNAT } from '@libp2p/autonat'
import { identify } from '@libp2p/identify'
import { noise } from '@chainsafe/libp2p-noise'
import { yamux } from '@chainsafe/libp2p-yamux'
import { gossipsub } from '@chainsafe/libp2p-gossipsub'
import { webSockets } from '@libp2p/websockets'
import { webRTC } from '@libp2p/webrtc'
import { tcp } from '@libp2p/tcp'
import { circuitRelayServer,circuitRelayTransport } from '@libp2p/circuit-relay-v2'
import  fs  from "fs";
import { createEd25519PeerId, createFromProtobuf, exportToProtobuf } from '@libp2p/peer-id-factory'

const identity_path = './identity.key'
const PUBSUB_PEER_DISCOVERY = "orbitdb"

async function exportIdentity(path) {
    try {
        const peerId = await createEd25519PeerId()
        const bytes = exportToProtobuf(peerId);

        await fs.promises.writeFile(path, bytes);

        return peerId;
    } catch (err) {
        console.error('Error generating identity:', err);
        throw err;
    }
}

async function importIdentity(path) {
    try {
        const bytes = await fs.promises.readFile(path);
        const peerId = await createFromProtobuf(bytes);
        return peerId;
    } catch (err) {
        console.error('Error importing identity:', err);
        throw err;
    }
}


async function main() {
  let peerId;
  try {
    await fs.promises.access(identity_path);
    peerId = await importIdentity(identity_path);
  } catch (error) {
    peerId = await exportIdentity(identity_path);
  }


  const libp2p = await createLibp2p({
    peerId: peerId,
    addresses: {
      // announce: [
      //     '/dns4/relay.linsoap/tcp/443/wss',
      // ],
      listen: [
        // '/ip4/0.0.0.0/tcp/443/wss',
        '/ip4/0.0.0.0/tcp/9001/ws',
        '/ip4/0.0.0.0/tcp/9002',
      ],
    },
    transports: [
      webSockets(),
      webRTC(),
      
      tcp(),
      circuitRelayTransport({
        discoverRelays: 1,
      }),
    ],
    connectionEncryption: [noise()],
    streamMuxers: [yamux()],
    connectionGater: {
      // Allow private addresses for local testing
      denyDialMultiaddr: async () => false,
    },
    services: {
      identify: identify(),
      autoNat: autoNAT(),
      relay: circuitRelayServer(),
      pubsub: gossipsub(),
    },
  })

  libp2p.services.pubsub.subscribe(PUBSUB_PEER_DISCOVERY)

  console.log('PeerID: ', libp2p.peerId.toString())
  console.log('Multiaddrs: ', libp2p.getMultiaddrs())
}

main()