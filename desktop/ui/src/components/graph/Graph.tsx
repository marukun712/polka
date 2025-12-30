import cytoscape, { type ElementDefinition } from "cytoscape";
import dagre from "cytoscape-dagre";
import { onMount } from "solid-js";
import { collectChildPosts } from "../../lib/graph";
import type { Ref } from "../../types";

cytoscape.use(dagre);

export default function GraphComponent({
	graph,
	setChildren,
}: {
	graph: ElementDefinition[];
	setChildren: (children: Set<Ref>) => void;
}) {
	let container!: HTMLDivElement;

	onMount(() => {
		const cy = cytoscape({
			container,
			elements: graph,
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
					selector: 'node[type="link"]',
					style: {
						"background-color": "#FFFF00",
						shape: "triangle",
						width: "50px",
						height: "50px",
						"font-size": "10px",
						"text-valign": "bottom",
						"text-margin-y": 5,
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

		// ノードクリック時のイベントハンドラ
		cy.on("click", "node", (e) => {
			const { id, type } = e.target.data();
			if (type === "tag") {
				const paths = collectChildPosts(cy, id);
				setChildren(new Set(paths));
			}
		});
	});

	return <div ref={container} style="width:100%; height:50vh;"></div>;
}
