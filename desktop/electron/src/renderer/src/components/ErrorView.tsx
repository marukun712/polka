import { IoClose } from 'solid-icons/io'
import type { Component } from 'solid-js'

export const ErrorView: Component<{ error: string; onRetry: () => void }> = (props) => {
  return (
    <div class="bg-white rounded-lg shadow-md p-8 text-center">
      <div class="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
        <IoClose class="w-8 h-8 text-red-600" />
      </div>
      <h2 class="text-xl font-semibold text-gray-900 mb-2">Error</h2>
      <p class="text-gray-600 mb-6">{props.error}</p>
      <button
        type="button"
        onClick={props.onRetry}
        class="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
      >
        Retry
      </button>
    </div>
  )
}
