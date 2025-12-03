import { IoChevronDown, IoChevronForward } from "solid-icons/io";
import type { Component } from "solid-js";
import { createSignal, For, Show } from "solid-js";
import { RecordCard } from "./RecordCard";
import type { TreeNode as TreeNodeType } from "./RecordsTreeView";

export const TreeNode: Component<{ node: TreeNodeType; depth: number }> = (
	props,
) => {
	const [expanded, setExpanded] = createSignal(props.node.isExpanded);

	const totalRecords = () => {
		let count = props.node.records.length;
		const countChildren = (node: TreeNodeType): number => {
			let total = node.records.length;
			for (const child of node.children) {
				total += countChildren(child);
			}
			return total;
		};
		for (const child of props.node.children) {
			count += countChildren(child);
		}
		return count;
	};

	return (
		<div
			class="border-l-2 border-gray-200 pl-4"
			style={`margin-left: ${props.depth * 1.5}rem`}
		>
			<button
				type="button"
				onClick={() => setExpanded(!expanded())}
				class="flex items-center gap-2 py-2 px-3 hover:bg-gray-50 cursor-pointer rounded transition-colors"
			>
				{expanded() ? (
					<IoChevronDown class="w-4 h-4 text-gray-500" />
				) : (
					<IoChevronForward class="w-4 h-4 text-gray-500" />
				)}
				<span class="font-medium text-gray-900">{props.node.name}</span>
				<span class="text-sm text-gray-500">({totalRecords()})</span>
			</button>

			<Show when={expanded()}>
				<div class="tree-node-content overflow-hidden">
					<For each={props.node.children}>
						{(child) => <TreeNode node={child} depth={props.depth + 1} />}
					</For>

					<For each={props.node.records}>
						{(record) => <RecordCard record={record} depth={props.depth + 1} />}
					</For>
				</div>
			</Show>
		</div>
	);
};
