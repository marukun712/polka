import type { ElementDefinition } from "cytoscape";
import { type EdgeData, edgeSchema, type Ref } from "../types";
import { validateRecords } from "../utils/validation";
import { getKeys, getRecords } from "./reader";

export function buildTagHierarchy(items: EdgeData[], from?: string) {
	const tagParentMap = new Map<string, Set<string>>();
	const roots = new Set<string>();

	items.forEach((item) => {
		if (item.from) {
			const set = tagParentMap.get(item.from) ?? new Set();
			set.add(item.to);
			tagParentMap.set(item.from, set);
		} else if (!from) {
			roots.add(item.to);
		}
	});

	if (from) roots.add(from);

	return { tagParentMap, roots };
}

export async function createGraphElements(
	root: string,
	did: string,
	from?: string,
): Promise<ElementDefinition[]> {
	const id = crypto.randomUUID();
	const raw = await getRecords(did, "polka.edge");
	const edges = validateRecords(raw.records, edgeSchema);
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
		[...posts.keys, ...links.keys].forEach((key) => {
			const type = posts.keys.includes(key) ? "post" : "link";
			addNode(`${id}:${key}`, {
				data: {
					id: `${id}:${key}`,
					label: key,
					type,
					ref: { did, rpath: key },
				},
			});
			addEdge(`${id}:${item}`, `${id}:${key}`);
		});
	};

	addNode(id, {
		data: { id: id, label: root, type: "tag" },
	});

	const { tagParentMap, roots } = buildTagHierarchy(
		edges.map((e) => e.data),
		from,
	);

	const traverse = async (tagName: string, parentId: string) => {
		const nodeId = `${id}:${tagName}`;
		if (elements.has(nodeKey(nodeId))) return;

		addNode(nodeId, {
			data: { id: nodeId, label: tagName, type: "tag" },
		});
		addEdge(parentId, nodeId);
		await findChildItem(tagName);

		const children = tagParentMap.get(tagName);
		if (children) {
			for (const child of children) {
				await traverse(child, nodeId);
			}
		}
	};

	for (const rootTag of roots) {
		await traverse(rootTag, id);
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
