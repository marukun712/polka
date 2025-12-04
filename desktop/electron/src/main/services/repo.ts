import { homedir } from 'node:os'
import { join } from 'node:path'
import { readFileSync, existsSync } from 'node:fs'
import { WASIShim } from '@bytecodealliance/preview2-shim/instantiation'
import { secp256k1 } from '@noble/curves/secp256k1.js'
import { hexToBytes } from '@noble/hashes/utils.js'
import { CID } from 'multiformats'
import type { Repo } from '../../../dist/transpiled/interfaces/polka-repository-repo.js'
import { instantiate } from '../../../dist/transpiled/repo.js'
import { CarSyncStore } from './blockstore.js'

class RepoManager {
  private repo: Repo | null = null
  private store: CarSyncStore | null = null

  async init(sk: string, did: string): Promise<void> {
    const path = join(homedir(), '.polka/repo.car')
    this.store = new CarSyncStore(path)

    const loader = async (path: string): Promise<WebAssembly.Module> => {
      const buf = await readFileSync(`../../../dist/transpiled/${path}`)
      return await WebAssembly.compile(buf.buffer)
    }

    const wasm = await instantiate(loader, {
      'polka:repository/crypto@0.1.0': {
        sign: (bytes: Uint8Array) => {
          const skBytes = hexToBytes(sk)
          return secp256k1.sign(bytes, skBytes)
        }
      },
      'polka:repository/blockstore@0.1.0': {
        readBlock: (cid: Uint8Array) => {
          const parsed = CID.decode(cid)
          const out: Uint8Array[] = []
          this.store!.readBlock(parsed, out)
          return out[0]
        },
        writeBlock: (codec: bigint, hash: bigint, contents: Uint8Array) => {
          return this.store!.writeBlock(Number(codec), Number(hash), contents)
        }
      },
      ...new WASIShim().getImportObject<'0.2.6'>()
    })

    const exists = existsSync(path)
    if (exists) {
      this.store.open()
      const roots = this.store.getRoots()
      this.repo = wasm.repo.open(did, roots[0].toString())
    } else {
      this.store.create()
      this.repo = wasm.repo.create(did)
    }
  }

  getRepo(): Repo {
    if (!this.repo) throw new Error('Repo not initialized')
    return this.repo
  }
}

export const repoManager = new RepoManager()
