import { Secp256k1Keypair } from '@atproto/crypto'
import { bytesToHex } from '@noble/curves/utils.js'

export async function generate(): Promise<{ did: string; pk: string; sk: string }> {
  const keypair = await Secp256k1Keypair.create({ exportable: true })
  const skExported = await keypair.export()
  return {
    did: keypair.did(),
    pk: keypair.publicKeyStr(),
    sk: bytesToHex(skExported)
  }
}
