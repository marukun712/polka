import cytoscape, { type ElementDefinition } from "cytoscape";
import dagre from "cytoscape-dagre";
import { onMount } from "solid-js";
import type { Post } from "../../@types/types";

type tagDocs = {
	layer: number;
	nodeId: string;
	children: string[];
};

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
		const elements: ElementDefinition[] = [
			{ data: { id: "root", label: root, type: "tag" } },
		];

		const parentToChild: { parent: string; child: string }[] = [];
		const parents = new Set<string>();
		const children = new Set<string>();
		const layers = new Map<number, Set<string>>();
		const docs = new Map<string, tagDocs>();

		// 親になっているタグ、子になっているタグを集計
		posts.forEach((post: Post) => {
			const tags = post.data.tags;
			if (tags) {
				tags.forEach((_: string, i: number) => {
					if (tags[i - 1] !== undefined) {
						parentToChild.push({ parent: tags[i - 1], child: tags[i] });
						parents.add(tags[i - 1]);
						children.add(tags[i]);
					}
				});
			}
		});

		// 親Setだけにあって子Setにないものがroot tag
		function difference(a: Set<string>, b: Set<string>): Set<string> {
			const result = new Set<string>();
			for (const x of a) {
				if (!b.has(x)) result.add(x);
			}
			return result;
		}
		const roots = difference(parents, children);

		let currentParents = [...roots];
		let num = 0;
		while (currentParents.length > 0) {
			const nextParents: string[] = [];
			currentParents.forEach((parent) => {
				const id = crypto.randomUUID();
				const children = parentToChild
					.filter((rel) => rel.parent === parent)
					.map((rel) => rel.child);
				docs.set(parent, { layer: num, nodeId: id, children });
				nextParents.push(...children);
			});
			layers.set(num, new Set(nextParents));
			currentParents = nextParents;
			num++;
		}

		for (const doc of docs.entries()) {
			if (doc[1].layer === 0) {
				elements.push({
					data: {
						source: "root",
						target: doc[0],
					},
				});
			}

			elements.push({
				data: {
					id: doc[0],
					label: doc[0],
					type: "tag",
				},
			});

			doc[1].children.forEach((child) => {
				elements.push({
					data: {
						id: child,
						label: child,
						type: "tag",
					},
				});

				elements.push({
					data: {
						source: doc[0],
						target: child,
					},
				});
			});
		}

		posts.forEach((post: Post) => {
			elements.push({
				data: {
					id: post.rpath,
					label: post.data.content,
					type: "post",
				},
			});

			elements.push({
				data: {
					source: post.data.tags?.pop(),
					target: post.rpath,
				},
			});
		});

		cytoscape({
			container: container,
			elements: elements,
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
					style: {
						"background-color": "#4A90E2",
						shape: "roundrectangle",
					},
				},
				{
					selector: 'node[type="post"]',
					style: {
						"background-color": "#E24A90",
						shape: "ellipse",
						width: "50px",
						height: "50px",
						"font-size": "10px",
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
			layout: {
				name: "dagre",
			},
		});
	});

	return <div ref={container} style="width:100vh; height:100vh;"></div>;
}
