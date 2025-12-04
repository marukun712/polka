import { createSignal, JSX, Show } from 'solid-js'
import './App.css'
import type { DIDDocument } from 'did-resolver'
import type { GetResult } from '../../../dist/transpiled/interfaces/polka-repository-repo'
import { generate } from './lib/crypto'
import { generateDidDocument, resolve } from './lib/identity'
import { Client } from './lib/index'
import { DidInputView } from './components/DidInputView'
import { DidSetupView } from './components/DidSetupView'
import { ErrorView } from './components/ErrorView'
import { LoadingView } from './components/LoadingView'
import { RecordsTreeView, type TreeNode } from './components/RecordsTreeView'

function App(): JSX.Element {
  const [step, setStep] = createSignal<'input' | 'setup' | 'editor'>('input')
  const [loading, setLoading] = createSignal(false)
  const [error, setError] = createSignal<string>('')

  const [didWeb, setDidWeb] = createSignal('')
  const [privateKey, setPrivateKey] = createSignal('')
  const [didDocument, setDidDocument] = createSignal<DIDDocument | null>(null)
  const [generatedPrivateKey, setGeneratedPrivateKey] = createSignal('')

  const [client, setClient] = createSignal<Client | null>(null)
  const [treeRoot, setTreeRoot] = createSignal<TreeNode | null>(null)

  const handleExistingAccount = async (did: string, sk: string): Promise<void> => {
    setLoading(true)
    setError('')
    setDidWeb(did)
    setPrivateKey(sk)

    try {
      const resolved = await resolve(did)
      await initializeClient(sk, resolved.didKey)
    } catch {
      setError('Failed to resolve DID or initialize client')
      setLoading(false)
    }
  }

  const handleNewAccount = async (domain: string): Promise<void> => {
    setLoading(true)
    setError('')

    try {
      const keyPair = await generate()
      const doc = await generateDidDocument(domain)
      setDidWeb(doc.id)

      setGeneratedPrivateKey(keyPair.sk)
      setPrivateKey(keyPair.sk)
      setDidDocument(doc)

      setStep('setup')
    } catch {
      setError('Failed to generate DID document')
    } finally {
      setLoading(false)
    }
  }

  const initializeClient = async (sk: string, did: string): Promise<void> => {
    try {
      const c = await Client.init(sk, did)
      setClient(c)
      const allRecords = await c.allRecords()

      const tree = buildTree(allRecords)
      setTreeRoot(tree)

      setStep('editor')
    } catch (err) {
      throw new Error(`Failed to initialize client: ${err}`)
    } finally {
      setLoading(false)
    }
  }

  const handleContinueFromSetup = async (): Promise<void> => {
    setLoading(true)
    setError('')
    try {
      await initializeClient(privateKey(), didWeb())
    } catch {
      setError('Failed to initialize client')
      setLoading(false)
    }
  }

  const buildTree = (records: GetResult[]): TreeNode => {
    const root: TreeNode = {
      name: 'root',
      fullPath: '',
      children: [],
      records: [],
      isExpanded: true
    }

    for (const record of records) {
      if (record.rpath === 'polka.profile/self') continue
      const [nsid, id] = record.rpath.split('/')
      if (!nsid || !id) continue

      const segments = nsid.split('.')
      let currentNode = root
      let pathSoFar = ''

      for (const segment of segments) {
        pathSoFar = pathSoFar ? `${pathSoFar}.${segment}` : segment
        let child = currentNode.children.find((c) => c.name === segment)
        if (!child) {
          child = {
            name: segment,
            fullPath: pathSoFar,
            children: [],
            records: [],
            isExpanded: false
          }
          currentNode.children.push(child)
        }
        currentNode = child
      }

      let parsedData: Record<string, unknown> = {}

      try {
        parsedData = JSON.parse(record.data)
      } catch {
        parsedData = {}
      }

      currentNode.records.push({
        rpath: record.rpath,
        data: parsedData
      })
    }
    return root
  }

  const handleRetry = (): void => {
    setError('')
    setStep('input')
  }

  const handleSaveRecord = async (
    rpath: string,
    jsonData: string,
    isExisting: boolean
  ): Promise<void> => {
    try {
      JSON.parse(jsonData)
      const c = client()
      if (!c) throw new Error('Client not initialized')
      if (isExisting) {
        await c.update(rpath, jsonData)
      } else {
        await c.create(rpath, jsonData)
      }
      refreshRecords()
    } catch {
      setError('Failed to save record')
    }
  }

  const handleDeleteRecord = async (rpath: string): Promise<void> => {
    try {
      const c = client()
      if (!c) throw new Error('Client not initialized')
      await c.delete(rpath)
      refreshRecords()
    } catch {
      setError('Failed to delete record')
    }
  }

  const refreshRecords = async (): Promise<void> => {
    try {
      const c = client()
      if (!c) throw new Error('Client not initialized')
      const allRecords = await c.allRecords()
      const tree = buildTree(allRecords)
      setTreeRoot(tree)
    } catch {
      setError('Failed to refresh records')
    }
  }

  return (
    <main class="container min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <Show when={error()}>
        <ErrorView error={error()} onRetry={handleRetry} />
      </Show>
      <Show when={!error()}>
        {loading() ? (
          <LoadingView message="Initializing..." />
        ) : (
          <>
            <Show when={step() === 'input'}>
              <DidInputView
                onExistingAccount={handleExistingAccount}
                onNewAccount={handleNewAccount}
              />
            </Show>
            <Show when={didDocument() && step() === 'setup'}>
              <DidSetupView
                didWeb={didWeb()}
                didDocument={didDocument()!}
                privateKey={generatedPrivateKey()}
                onBack={() => setStep('input')}
                onContinue={handleContinueFromSetup}
              />
            </Show>
            <Show when={treeRoot() && step() === 'editor'}>
              <div class="max-w-6xl mx-auto space-y-6">
                <RecordsTreeView root={treeRoot()!} />

                <div class="bg-white rounded-lg shadow p-6">
                  <h2 class="text-xl font-bold mb-4">Create/Update Record</h2>
                  <form
                    onSubmit={(e) => {
                      e.preventDefault()
                      const formData = new FormData(e.currentTarget)
                      const rpath = formData.get('rpath') as string
                      const data = formData.get('data') as string
                      const isExisting = formData.get('isExisting') === 'on'
                      handleSaveRecord(rpath, data, isExisting)
                      e.currentTarget.reset()
                    }}
                    class="space-y-4"
                  >
                    <div>
                      <label class="block text-sm font-medium text-gray-700 mb-1">
                        Record Path (e.g., polka.post/abc123)
                      </label>
                      <input
                        type="text"
                        name="rpath"
                        required
                        class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="polka.post/abc123"
                      />
                    </div>
                    <div>
                      <label class="block text-sm font-medium text-gray-700 mb-1">JSON Data</label>
                      <textarea
                        name="data"
                        required
                        rows="4"
                        class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono text-sm"
                        placeholder='{"title": "Hello", "content": "World"}'
                      />
                    </div>
                    <div class="flex items-center">
                      <input
                        type="checkbox"
                        name="isExisting"
                        id="isExisting"
                        class="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                      />
                      <label for="isExisting" class="ml-2 block text-sm text-gray-700">
                        Update existing record
                      </label>
                    </div>
                    <button
                      type="submit"
                      class="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
                    >
                      Save Record
                    </button>
                  </form>
                </div>

                <div class="bg-white rounded-lg shadow p-6">
                  <h2 class="text-xl font-bold mb-4">Delete Record</h2>
                  <form
                    onSubmit={(e) => {
                      e.preventDefault()
                      const formData = new FormData(e.currentTarget)
                      const rpath = formData.get('rpath') as string
                      if (confirm(`Are you sure you want to delete "${rpath}"?`)) {
                        handleDeleteRecord(rpath)
                        e.currentTarget.reset()
                      }
                    }}
                    class="space-y-4"
                  >
                    <div>
                      <label class="block text-sm font-medium text-gray-700 mb-1">
                        Record Path to Delete
                      </label>
                      <input
                        type="text"
                        name="rpath"
                        required
                        class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500"
                        placeholder="polka.post/abc123"
                      />
                    </div>
                    <button
                      type="submit"
                      class="w-full bg-red-600 text-white py-2 px-4 rounded-md hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2"
                    >
                      Delete Record
                    </button>
                  </form>
                </div>
              </div>
            </Show>
          </>
        )}
      </Show>
    </main>
  )
}

export default App
