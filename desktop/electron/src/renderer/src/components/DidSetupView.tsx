import type { DIDDocument } from 'did-resolver'
import type { Component } from 'solid-js'

interface DidSetupViewProps {
  didWeb: string
  didDocument: DIDDocument
  privateKey: string
  onBack: () => void
  onContinue: () => void
}

export const DidSetupView: Component<DidSetupViewProps> = (props) => {
  const copyToClipboard = async (text: string): Promise<void> => {
    try {
      await navigator.clipboard.writeText(text)
    } catch (err) {
      console.error('Failed to copy:', err)
    }
  }

  const formattedDidDocument = (): string => {
    return JSON.stringify(props.didDocument, null, 2)
  }

  return (
    <div class="flex items-center justify-center min-h-screen p-4">
      <div class="bg-white rounded-2xl shadow-lg p-8 w-full max-w-2xl">
        <h1 class="text-2xl font-bold text-gray-900 mb-4">Setup New Identity</h1>

        <div class="mb-4">
          <p class="text-sm text-gray-600 mb-1">Your DID:</p>
          <p class="text-lg font-mono text-gray-900">{props.didWeb}</p>
        </div>

        <div class="mb-6 p-4 bg-yellow-50 border-2 border-yellow-400 rounded-lg">
          <p class="text-sm font-bold text-yellow-900 mb-2 flex items-center">
            IMPORTANT: Save your private key!
          </p>
          <div class="bg-white p-3 rounded border border-yellow-300 mb-2">
            <p class="text-xs text-gray-600 mb-1">Private Key (hex):</p>
            <p class="font-mono text-sm text-gray-900 break-all">{props.privateKey}</p>
          </div>
          <button
            type="button"
            onClick={() => copyToClipboard(props.privateKey)}
            class="w-full px-4 py-2 bg-yellow-600 text-white rounded hover:bg-yellow-700 transition-colors text-sm font-medium"
          >
            Copy Private Key
          </button>
          <p class="text-xs text-yellow-800 mt-2">
            This key will not be shown again. Save it securely!
          </p>
        </div>

        <div class="mb-4">
          <p class="text-sm font-medium text-gray-700 mb-2">Generated DID Document:</p>
          <div class="bg-gray-50 p-4 rounded-lg border border-gray-200 overflow-x-auto">
            <pre class="text-xs font-mono text-gray-800 whitespace-pre-wrap">
              {formattedDidDocument()}
            </pre>
          </div>
          <button
            type="button"
            onClick={() => copyToClipboard(formattedDidDocument())}
            class="mt-2 w-full px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors text-sm font-medium"
          >
            Copy DID Document
          </button>
        </div>

        <div class="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <p class="text-sm font-medium text-blue-900 mb-2">Instructions:</p>
          <ol class="text-sm text-blue-800 space-y-1 list-decimal list-inside">
            <li>SAVE the private key securely (you'll need it to sign in)</li>
            <li>
              Upload the DID document to:
              <br />
              <code class="bg-white px-2 py-1 rounded text-xs mt-1 inline-block">
                https://{props.didWeb.replace('did:web:', '')}
                /.well-known/did.json
              </code>
            </li>
            <li>Ensure the DID document is publicly accessible via HTTPS</li>
            <li>Keep your private key safe - never share it!</li>
          </ol>
        </div>

        <div class="flex gap-3">
          <button
            type="button"
            onClick={props.onBack}
            class="flex-1 px-6 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors font-medium"
          >
            Back
          </button>
          <button
            type="button"
            onClick={props.onContinue}
            class="flex-1 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium shadow-md hover:shadow-lg"
          >
            Continue to Editor
          </button>
        </div>
      </div>
    </div>
  )
}
