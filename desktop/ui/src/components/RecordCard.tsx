import { IoDocumentTextOutline } from "solid-icons/io";
import type { Component } from "solid-js";
import { For } from "solid-js";
import type { RecordData } from "./RecordsTreeView";

export const RecordCard: Component<{ record: RecordData; depth: number }> = (
	props,
) => {
	const recordId = (): string => props.record.rpath.split("/")[1] || "unknown";

	const renderValue = (value: unknown): string => {
		if (typeof value === "string") return value;
		if (typeof value === "number") return value.toString();
		if (typeof value === "boolean") return value ? "true" : "false";
		if (value === null) return "null";
		if (value === undefined) return "undefined";
		return JSON.stringify(value, null, 2);
	};

	return (
		<div
			class="my-2 bg-gray-50 rounded-lg p-4 border border-gray-200"
			style={`margin-left: ${props.depth * 1.5}rem`}
		>
			<div class="font-medium text-gray-700 mb-3 flex items-center gap-2">
				<IoDocumentTextOutline class="w-5 h-5 text-blue-600" />
				<span>{recordId()}</span>
			</div>

			<table class="w-full text-sm">
				<thead>
					<tr class="border-b border-gray-300">
						<th class="text-left py-2 px-3 font-semibold text-gray-700 bg-gray-100">
							Key
						</th>
						<th class="text-left py-2 px-3 font-semibold text-gray-700 bg-gray-100">
							Value
						</th>
					</tr>
				</thead>
				<tbody>
					<For each={Object.entries(props.record.data)}>
						{([key, value]) => (
							<tr class="border-b border-gray-200 even:bg-white odd:bg-gray-50">
								<td class="py-2 px-3 font-medium text-gray-600 align-top">
									{key}
								</td>
								<td class="py-2 px-3 text-gray-800 wrap-break-words">
									<pre class="whitespace-pre-wrap font-mono text-xs">
										{renderValue(value)}
									</pre>
								</td>
							</tr>
						)}
					</For>
				</tbody>
			</table>
		</div>
	);
};
