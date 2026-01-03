import cytoscape, { type ElementDefinition } from "cytoscape";
import dagre from "cytoscape-dagre";
import { createEffect, createSignal, onMount } from "solid-js";
import { collectChildPosts } from "../../lib/graph";
import type { Ref } from "../../types";

cytoscape.use(dagre);

export default function GraphComponent({
	graph,
	setChildren,
}: {
	graph: () => Set<ElementDefinition>;
	setChildren: (children: Ref[]) => void;
}) {
	let container!: HTMLDivElement;
	const [current, setCurrent] = createSignal<string | null>(null);

	onMount(() => {
		const cy = cytoscape({
			container,
			elements: [...graph()],
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
					selector: 'node[type="user"]',
					style: {
						"background-image": "data(icon)",
						"background-fit": "cover",
						shape: "ellipse",
						width: "40px",
						height: "40px",
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
		});

		cy.layout({ name: "dagre" }).run();

		createEffect(() => {
			const elements = [...graph()];
			const existingIds = new Set(cy.nodes().map((n) => n.id()));

			const newNodes = elements.filter(
				(el) => !existingIds.has(el.data.id as string),
			);

			if (newNodes.length > 0) {
				const nodesWithStyle = newNodes.map((node) => ({
					...node,
					style: { opacity: 0 },
				}));

				const added = cy.add(nodesWithStyle);

				added.animate({
					style: { opacity: 1 },
					duration: 800,
					easing: "ease-out",
				});
			}
		});

		createEffect(() => {
			const c = current();
			if (c) {
				const childPosts = collectChildPosts(cy, c);
				setChildren(childPosts);
			}
		});

		// ノードクリック時のイベントハンドラ
		cy.on("click", "node", (e) => {
			const { id, type, did } = e.target.data();
			if (type === "tag") {
				setCurrent(id);
			} else if (type === "user" && did) {
				window.location.hash = `#/user?did=${did}`;
			}
		});
	});

	return <div ref={container} style="width:100%; height:50vh;"></div>;
}
