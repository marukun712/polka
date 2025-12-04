import { existsSync, readFileSync } from 'node:fs'
import { homedir } from 'node:os'
import { join } from 'node:path'
import { WASIShim } from '@bytecodealliance/preview2-shim/instantiation'
import { secp256k1 } from '@noble/curves/secp256k1.js'
import { hexToBytes } from '@noble/hashes/utils.js'
import { CID } from 'multiformats'
import type { Repo } from '../../../../dist/transpiled/interfaces/polka-repository-repo.js'
import { instantiate } from '../../../../dist/transpiled/repo.js'
import { CarSyncStore } from './blockstore.js'

export class Client {
  repo: Repo

  constructor(repo: Repo) {
    this.repo = repo
  }

  static async init(sk: string, did: string): Promise<Client> {
    const path = join(homedir(), '.polka/repo.car')

    const store = new CarSyncStore(path)

    const loader = async (path: string): Promise<WebAssembly.Module> => {
      const buf = await readFileSync(`./dist/transpiled/${path}`)
      return await WebAssembly.compile(buf.buffer)
    }

    const wasm = await instantiate(loader, {
      'polka:repository/crypto@0.1.0': {
        sign: (bytes: Uint8Array) => {
          const skBytes = hexToBytes(sk)
          const sig = secp256k1.sign(bytes, skBytes)
          return sig
        }
      },
      'polka:repository/blockstore@0.1.0': {
        readBlock: (cid: Uint8Array) => {
          const parsed = CID.decode(cid)
          const out: Uint8Array[] = []
          store.readBlock(parsed, out)
          return out[0]
        },
        writeBlock: (codec: bigint, hash: bigint, contents: Uint8Array) => {
          return store.writeBlock(Number(codec), Number(hash), contents)
        }
      },
      ...new WASIShim().getImportObject<'0.2.6'>()
    })

    if (existsSync(path)) {
      store.open()
      const roots = store.getRoots()
      const repo = wasm.repo.open(did, roots[0].toString())
      return new Client(repo)
    } else {
      store.create()
      const repo = wasm.repo.create(did)
      return new Client(repo)
    }
  }
}
