import { IoDocumentTextOutline } from 'solid-icons/io'
import type { Component } from 'solid-js'
import { For, Show } from 'solid-js'
import { TreeNode as TreeNodeComponent } from './TreeNode'

export interface TreeNode {
  name: string
  fullPath: string
  children: TreeNode[]
  records: RecordData[]
  isExpanded: boolean
}

export interface RecordData {
  rpath: string
  data: Record<string, unknown>
}

export const RecordsTreeView: Component<{ root: TreeNode }> = (props) => {
  const hasContent = props.root.children.length > 0 || props.root.records.length > 0

  return (
    <div class="bg-white rounded-lg shadow-md p-6">
      <h2 class="text-2xl font-semibold text-gray-900 mb-4">Records</h2>

      <Show
        when={hasContent}
        fallback={
          <div class="text-center py-12">
            <div class="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <IoDocumentTextOutline class="w-8 h-8 text-gray-400" />
            </div>
            <h3 class="text-xl font-semibold text-gray-700 mb-2">No Records Found</h3>
            <p class="text-gray-500">This PDS doesn't have any records yet.</p>
          </div>
        }
      >
        <For each={props.root.children}>
          {(child) => <TreeNodeComponent node={child} depth={0} />}
        </For>
      </Show>
    </div>
  )
}
