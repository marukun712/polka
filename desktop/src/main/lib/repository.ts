import { existsSync, readFileSync } from 'node:fs'
import { homedir } from 'node:os'
import { join } from 'node:path'
import { secp256k1 } from '@noble/curves/secp256k1.js'
import { hexToBytes } from '@noble/hashes/utils.js'
import { WASIShim } from '@bytecodealliance/preview2-shim/instantiation'
import { CID } from 'multiformats'
import keytar from 'keytar'
import type { Repo } from '../../../dist/transpiled/interfaces/polka-repository-repo.js'
import { instantiate } from '../../../dist/transpiled/repo.js'
import { CarSyncStore } from './blockstore'
import { existsRepository, POLKA_CAR_PATH } from './git'
import { commitAndPush, pullRepository } from './git'

let repo: Repo | null = null
let store: CarSyncStore | null = null
let isInitialized = false

export type IpcResult = { success: true; data: unknown } | { success: false; error: string }

function getRepo(): { repo: Repo; store: CarSyncStore } {
  if (!isInitialized || !repo || !store) {
    throw new Error('Repository not initialized')
  }
  return { repo, store }
}

export async function initRepository(didKey: string): Promise<void> {
  if (isInitialized) {
    throw new Error('Repository already initialized')
  }

  const sk = await getStoredCredentials()
  if (!sk) {
    throw new Error('Private key is not stored. To initialize repository, please use polka cli.')
  }

  const polkaDir = join(homedir(), '.polka')
  if (!existsSync(polkaDir) || !existsRepository(polkaDir)) {
    throw new Error(
      'Local git repository is not initalized. To initialize repository, please use polka cli.'
    )
  }

  const path = POLKA_CAR_PATH
  store = new CarSyncStore(path)

  const loader = async (wasmPath: string): Promise<WebAssembly.Module> => {
    const fullPath = join('../../../dist/', wasmPath)
    if (!existsSync(fullPath)) {
      throw new Error(`WASM module not found: ${wasmPath}`)
    }
    const buf = readFileSync(fullPath)
    return await WebAssembly.compile(new Uint8Array(buf))
  }

  const wasm = await instantiate(loader, {
    // @ts-ignore import
    'polka:repository/crypto': {
      sign: (bytes: Uint8Array) => {
        const skBytes = hexToBytes(sk)
        const sig = secp256k1.sign(bytes, skBytes)
        return sig
      }
    },
    'polka:repository/blockstore': {
      readBlock: (cid: Uint8Array) => {
        const parsed = CID.decode(cid)
        const out: Uint8Array[] = []
        store!.readBlock(parsed, out)
        if (!out[0]) throw new Error('Block not found.')
        return out[0]
      },
      writeBlock: (codec: bigint, hash: bigint, contents: Uint8Array) => {
        return store!.writeBlock(Number(codec), Number(hash), contents)
      }
    },
    ...new WASIShim().getImportObject<'0.2.6'>()
  })

  if (existsSync(path)) {
    store.updateIndex()
    const roots = store.getRoots()
    if (!roots[0]) throw new Error('Root not found.')
    repo = wasm.repo.open(didKey, roots[0].toString())
  } else {
    store.create()
    repo = wasm.repo.create(didKey)
    const root = repo.getRoot()
    store.updateHeaderRoots([CID.parse(root)])
  }

  isInitialized = true
}

export function createRecord(rpath: string, data: string): string {
  const { repo, store } = getRepo()
  const cid = repo.create(rpath, data)
  const root = repo.getRoot()
  store.updateHeaderRoots([CID.parse(root)])
  return cid
}

export function updateRecord(rpath: string, data: string): string {
  const { repo, store } = getRepo()
  const cid = repo.update(rpath, data)
  const root = repo.getRoot()
  store!.updateHeaderRoots([CID.parse(root)])
  return cid
}

export function deleteRecord(rpath: string): boolean {
  const { repo, store } = getRepo()
  const result = repo.delete(rpath)
  const root = repo.getRoot()
  store!.updateHeaderRoots([CID.parse(root)])
  return result
}

export async function getStoredCredentials(): Promise<string | null> {
  return await keytar.getPassword('polka', 'user')
}

export function gitCommitAndPush(message: string): void {
  commitAndPush(message)
}

export function gitPull(): void {
  pullRepository()
}
