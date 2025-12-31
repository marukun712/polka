import type { ElementDefinition } from "cytoscape";
import type { Edge, EdgeData, Ref } from "../types";
import { getKeys } from "./client";

export function buildTagHierarchy(items: EdgeData[]) {
	const tagParentMap = new Map<string, Set<string>>(); // 親 -> 子のセット
	const roots = new Set<string>(); // ルートから生えているタグ

	items.forEach(({ to, from }) => {
		if (from) {
			const has = tagParentMap.get(from);
			if (!has) {
				const set = new Set<string>();
				set.add(to);
				tagParentMap.set(from, set);
				return;
			}
			has.add(to);
		} else {
			roots.add(to);
		}
	});

	return { tagParentMap, roots };
}

export async function createGraphElements(
	id: string,
	root: string,
	edges: Edge[],
	did: string,
): Promise<ElementDefinition[]> {
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
		const posts = await getKeys(did, "polka.post", { parents: item });
		const links = await getKeys(did, "polka.link", { parents: item });
		posts.keys.forEach((key) => {
			addNode(`${id}:${key}`, {
				data: {
					id: `${id}:${key}`,
					label: key,
					type: "post",
					ref: { did, rpath: key },
				},
			});
			addEdge(`${id}:${item}`, `${id}:${key}`);
		});
		links.keys.forEach((key) => {
			addNode(`${id}:${key}`, {
				data: {
					id: `${id}:${key}`,
					label: key,
					type: "link",
					ref: { did, rpath: key },
				},
			});
			addEdge(`${id}:${item}`, `${id}:${key}`);
		});
	};

	// ルートノードの作成
	addNode(id, {
		data: { id: id, label: root, type: "tag" },
	});

	// タグの親子関係を解析
	const { tagParentMap, roots } = buildTagHierarchy(edges.map((e) => e.data));

	for (const item of roots) {
		addNode(`${id}:${item}`, {
			data: { id: `${id}:${item}`, label: item, type: "tag" },
		});
		addEdge(id, `${id}:${item}`);
		await findChildItem(item);
	}

	for (const [parent, children] of tagParentMap) {
		for (const child of children) {
			addNode(`${id}:${child}`, {
				data: { id: `${id}:${child}`, label: child, type: "tag" },
			});
			addEdge(`${id}:${parent}`, `${id}:${child}`);
			await findChildItem(child);
		}
	}

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
