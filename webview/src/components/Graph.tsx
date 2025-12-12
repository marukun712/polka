import cytoscape, { type ElementDefinition } from "cytoscape";
import dagre from "cytoscape-dagre";
import { onMount } from "solid-js";
import type { Post } from "../../@types/types";

cytoscape.use(dagre);
export default function GraphComponent({
	posts,
	root,
}: {
	posts: Post[];
	root: string;
}) {
	let container!: HTMLDivElement;

	onMount(() => {
		const elements: Set<ElementDefinition> = new Set([
			{ data: { id: "root", label: root, type: "tag" } },
		]);

		const parentChildrenMap = new Map<string, Set<string>>();
		const roots = new Set<string>();

		// 親になっているタグ、子になっているタグを集計
		posts.forEach((post: Post) => {
			const tags = post.data.tags;
			if (tags) {
				tags.forEach((_: string, i: number) => {
					const parent = tags[i - 1];
					if (parent !== undefined) {
						const children = parentChildrenMap.get(parent) ?? new Set<string>();
						parentChildrenMap.set(parent, children.add(tags[i]));
					} else {
						roots.add(tags[i]); // 親がないものはRoot
					}
				});
			}
		});

		for (const map of parentChildrenMap.entries()) {
			map[1].forEach((node) => {
				elements.add({
					data: {
						id: node,
						label: node,
						type: "tag",
					},
				});

				elements.add({
					data: {
						source: map[0],
						target: node,
					},
				});
			});
		}

		posts.forEach((post: Post) => {
			elements.add({
				data: {
					id: post.rpath,
					label: post.data.content,
					type: "post",
				},
			});

			elements.add({
				data: {
					source: post.data.tags?.pop(),
					target: post.rpath,
				},
			});
		});

		roots.forEach((root) => {
			elements.add({
				data: {
					id: root,
					label: root,
					type: "tag",
				},
			});

			elements.add({
				data: {
					source: "root",
					target: root,
				},
			});
		});

		cytoscape({
			container,
			elements: [...elements.values()],
			style: [
				{
					selector: "node",
					style: {
						label: "data(label)",
						"text-valign": "center",
						"text-halign": "center",
						"font-size": "12px",
						width: "60px",
						height: "60px",
						"background-color": "#666",
						color: "#fff",
						"text-wrap": "wrap",
						"text-max-width": "80px",
					},
				},
				{
					selector: 'node[type="tag"]',
					style: { "background-color": "#4A90E2", shape: "roundrectangle" },
				},
				{
					selector: 'node[type="post"]',
					style: {
						"background-color": "#E24A90",
						shape: "ellipse",
						width: "50px",
						height: "50px",
						"font-size": "10px",
						"text-valign": "bottom",
						"text-margin-y": 5,
					},
				},
				{
					selector: "edge",
					style: {
						width: 2,
						"line-color": "#ccc",
						"target-arrow-color": "#ccc",
						"target-arrow-shape": "triangle",
						"curve-style": "bezier",
					},
				},
			],
			layout: { name: "dagre" },
		});
	});

	return <div ref={container} style="width:100%; height:50vh;"></div>;
}
