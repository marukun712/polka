import type { ElementDefinition } from "cytoscape";
import type { Feed, FeedItem, Ref } from "../types";

export function buildTagHierarchy(items: FeedItem[]) {
	const tagParentMap = new Map<string, Set<string>>(); // 親 -> 子のセット
	const allTags = new Set<string>(); // 全タグ
	const childTags = new Set<string>(); // 誰かの子であるタグ

	items.forEach(({ post }) => {
		// 空文字を除去したタグリストを取得
		const tags = post.data.tags?.filter((t) => t.trim()) || [];
		tags.forEach((tag, i) => {
			allTags.add(tag);
			if (i > 0) {
				// 親タグ(一つ前のタグ)を取得
				const parent = tags[i - 1];
				if (!tagParentMap.has(parent)) tagParentMap.set(parent, new Set());
				tagParentMap.get(parent)?.add(tag);
				childTags.add(tag);
			}
		});
	});

	return { tagParentMap, allTags, childTags };
}

export function createGraphElements(
	feed: Feed,
	follows: Feed[],
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

	// "following" ルートノード
	addNode("following", {
		data: { id: "following", label: "following", type: "tag" },
	});

	const processFeed = (
		id: string,
		label: string,
		items: FeedItem[],
		rootTag?: string,
	) => {
		// グラフ上のルートID (rootTagがある場合は "id:tagName"、なければ "id")
		const graphRootId = rootTag ? `${id}:${rootTag}` : id;

		// ルートノードの作成
		addNode(graphRootId, {
			data: { id: graphRootId, label: rootTag || label, type: "tag" },
		});

		// rootTag指定がある場合は、"following" ノードと接続する
		if (rootTag) {
			addEdge("following", graphRootId);
		}

		// タグの親子関係を解析
		const { tagParentMap, allTags, childTags } = buildTagHierarchy(items);

		// グラフに追加済みのタグIDを追跡(投稿を紐付けるために使用)
		const addedTagNodes = new Set<string>([graphRootId]);

		// タグノードとエッジの生成
		if (rootTag) {
			const queue = [rootTag];
			const visited = new Set([rootTag]);

			while (queue.length) {
				const currentTag = queue.shift();
				if (!currentTag) continue;
				const children = tagParentMap.get(currentTag);

				children?.forEach((child) => {
					if (visited.has(child)) return;
					visited.add(child);
					queue.push(child);

					const childNodeId = `${id}:${child}`;
					addNode(childNodeId, {
						data: { id: childNodeId, label: child, type: "tag" },
					});
					addEdge(`${id}:${currentTag}`, childNodeId);
					addedTagNodes.add(childNodeId);
				});
			}
		} else {
			const rootTags = [...allTags].filter((t) => !childTags.has(t));
			rootTags.forEach((r) => {
				const nodeId = `${id}:${r}`;
				addNode(nodeId, { data: { id: nodeId, label: r, type: "tag" } });
				addEdge(id, nodeId);
				addedTagNodes.add(nodeId);
			});

			// 親子関係のあるタグ同士を接続
			tagParentMap.forEach((children, parent) => {
				children.forEach((child) => {
					const childId = `${id}:${child}`;
					addNode(childId, {
						data: { id: childId, label: child, type: "tag" },
					});
					addEdge(`${id}:${parent}`, childId);
					addedTagNodes.add(childId);
				});
			});
		}

		// 投稿(Post/Link)ノードの接続
		items.forEach((item) => {
			const tags = item.tags?.filter((t) => t.trim()) || [];
			// 直近の親タグIDを決定。タグがない場合はユーザー直下(graphRootId)とする
			let parentId = graphRootId;

			if (tags.length > 0) {
				// 最後のタグを親とする
				const lastTagName = tags[tags.length - 1];
				const candidateId = `${id}:${lastTagName}`;
				// 親となるタグがグラフ上に存在する場合のみ接続する
				if (addedTagNodes.has(candidateId)) {
					parentId = candidateId;
				} else if (rootTag) {
					// rootTagモードで親が見つからない場合はこの投稿を表示しない
					return;
				}
			} else if (rootTag) {
				return;
			}

			const itemId = `${id}:${item.type}:${item.post.rpath}`;
			addNode(itemId, {
				data: {
					id: itemId,
					label: item.post.rpath,
					type: item.type === "post" ? "post" : "link",
					ref: { did: item.did, rpath: item.rpath },
				},
			});

			addEdge(parentId, itemId);
		});
	};

	// 自身のフィードを処理
	processFeed(feed.id, feed.ownerProfile.name, feed.feed);

	// フォロー中のフィードを処理
	follows.forEach((f) => {
		processFeed(f.id, f.ownerProfile.name, f.feed, f.rootTag);
	});

	return [...elements.values()];
}

export function collectChildPosts(cy: cytoscape.Core, tagId: string): Ref[] {
	const node = cy.getElementById(tagId);
	if (node.empty()) return [];
	return node
		.successors('node[type="post"], node[type="link"]')
		.map((n) => n.data("ref"))
		.filter((r): r is Ref => r !== undefined && r !== null);
}
