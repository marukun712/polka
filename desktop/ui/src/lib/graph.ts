import type { ElementDefinition } from "cytoscape";
import type { Edge, EdgeData, Ref } from "../types";
import { walkMST } from "./client";

export function buildTagHierarchy(items: EdgeData[]) {
	const tagParentMap = new Map<string, Set<string>>(); // 親 -> 子のセット
	const roots = new Set<string>(); // ルートから生えているタグ

	items.forEach(({ to, from }) => {
		if (from) {
			const has = tagParentMap.get(from);
			if (!has) {
				tagParentMap.set(from, new Set());
				return;
			}
			has.add(to);
		} else {
			roots.add(to);
		}
	});

	return { tagParentMap, roots };
}

export function createGraphElements(
	id: string,
	root: string,
	edges: Edge[],
	did: string,
): ElementDefinition[] {
	const elements = new Map<string, ElementDefinition>();

	const edgeKey = (s: string, t: string) => `edge:${s}->${t}`;
	const nodeKey = (id: string) => `node:${id}`;

	const addNode = (id: string, data: ElementDefinition) => {
		elements.set(nodeKey(id), data);
	};

	const addEdge = (s: string, t: string) => {
		const key = edgeKey(s, t);
		if (!elements.has(key)) {
			elements.set(key, { data: { source: s, target: t } });
		}
	};

	const findChildItem = async (item: string) => {
		const posts = await walkMST(did, `index/polka.post.tags.${item}`);
		const links = await walkMST(did, `index/polka.link.tags.${item}`);
		posts.keys.forEach((key) => {
			addNode(key, {
				data: {
					id: key,
					label: key,
					type: "post",
					ref: { did, rpath: key },
				},
			});
			addEdge(`${id}:${item}`, key);
		});
		links.keys.forEach((key) => {
			addNode(key, {
				data: {
					id: key,
					label: key,
					type: "link",
					ref: { did, rpath: key },
				},
			});
			addEdge(`${id}:${item}`, key);
		});
	};

	// ルートノードの作成
	addNode(id, {
		data: { id: id, label: root, type: "tag" },
	});

	// タグの親子関係を解析
	const { tagParentMap, roots } = buildTagHierarchy(edges.map((e) => e.data));

	roots.forEach(async (item) => {
		addNode(`${id}:${item}`, {
			data: { id: `${id}:${item}`, label: item, type: "tag" },
		});
		addEdge(id, `${id}:${item}`);
		await findChildItem(item);
	});

	tagParentMap.forEach(async (children, parent) => {
		children.forEach(async (child) => {
			addNode(`${id}:${child}`, {
				data: { id: `${id}:${child}`, label: child, type: "tag" },
			});
			addEdge(`${id}:${parent}`, `${id}:${child}`);
			await findChildItem(child);
		});
	});

	return [...elements.values()];
}

export function collectChildPosts(cy: cytoscape.Core, tagId: string): Ref[] {
	const node = cy.getElementById(tagId);
	if (node.empty()) return [];
	return node
		.successors('node[type="post"], node[type="link"], node[type="reply"]')
		.map((n) => n.data("ref"))
		.filter((r): r is Ref => r !== undefined && r !== null);
}
