import cytoscape, { type ElementDefinition } from "cytoscape";
import dagre from "cytoscape-dagre";
import { createEffect, onMount } from "solid-js";
import type { Post } from "../../@types/types";

cytoscape.use(dagre);
export default function GraphComponent({
	posts,
	root,
	node,
	selectNode,
	insertTag,
	selectChildren,
}: {
	posts: Post[];
	root: string;
	insertTag: (tag: string) => void;
	node: () => string;
	selectNode: (id: string) => void;
	selectChildren: (paths: string[]) => void;
}) {
	let container!: HTMLDivElement;

	onMount(() => {
		const elements: Set<ElementDefinition> = new Set([
			{ data: { id: "root", label: root, type: "tag" } },
		]);

		const parentChildrenMap = new Map<string, Set<string>>();
		const roots = new Set<string>();
		const parents = new Set<string>();

		// 親になっているタグ、子になっているタグを集計
		posts.forEach((post: Post) => {
			const tags = post.data.tags;
			if (tags) {
				tags.forEach((_: string, i: number) => {
					const parent = tags[i - 1];
					if (parent !== undefined) {
						const children = parentChildrenMap.get(parent) ?? new Set<string>();
						children.add(tags[i]);
						parents.add(tags[i]);
						parentChildrenMap.set(parent, children);
					} else {
						roots.add(tags[i]);
					}
				});
			}
		});

		parents.forEach((parent) => {
			roots.delete(parent);
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

		function collectChildPosts(cy: cytoscape.Core, tagId: string) {
			const tagNode = cy.getElementById(tagId);

			if (tagNode.empty()) return [];

			const posts = tagNode
				.successors('node[type="post"]')
				.map((n) => n.data());

			return posts;
		}

		const cy = cytoscape({
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

		createEffect(() => {
			const pathList = collectChildPosts(cy, node());
			const paths = pathList.map((post) => post.id as string);
			selectChildren(paths);
		});

		cy.on("click", "node", (e) => {
			const id = e.target.data("id");
			const type = e.target.data("type");
			if (type === "tag") {
				selectNode(id);
				if (id !== "root") insertTag(id);
			}
		});
	});

	return <div ref={container} style="width:100%; height:50vh;"></div>;
}
