import cytoscape, { type ElementDefinition } from "cytoscape";
import dagre from "cytoscape-dagre";
import { createEffect, onMount } from "solid-js";
import type { Feed, FeedItem, Node, Ref } from "../../@types/types";

cytoscape.use(dagre);

const collectChildPosts = (cy: cytoscape.Core, tagId: string): Ref[] => {
	const node = cy.getElementById(tagId);
	if (node.empty()) return [];
	return node
		.successors('node[type="post"], node[type="link"]')
		.map((n) => n.data("ref"))
		.filter((r): r is Ref => r !== undefined && r !== null);
};

export default function GraphComponent({
	feed,
	follows,
	node,
	setNode,
	setChildren,
}: {
	feed: Feed;
	follows: Feed[];
	node: () => Node | null;
	setNode: (state: Node) => void;
	setChildren: (children: Set<Ref>) => void;
}) {
	let container!: HTMLDivElement;

	onMount(() => {
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

			// 全投稿からタグの親子関係を解析 (データ構造の構築)
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

			// グラフに追加済みのタグIDを追跡(投稿を紐付けるために使用)
			const addedTagNodes = new Set<string>([graphRootId]);

			// タグノードとエッジの生成
			if (rootTag) {
				const queue = [rootTag];
				// 訪問済みセット(ルート自体は処理済みとする)
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
				// ルートタグ(親を持たないタグ)を抽出し、ユーザーノードに接続
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

		// 選択状態の変更を監視して子要素を選択
		createEffect(() => {
			const n = node();
			if (!n) return;
			const paths = collectChildPosts(cy, n.id);
			setChildren(new Set(paths));
		});

		// ノードクリック時のイベントハンドラ
		cy.on("click", "node", (e) => {
			const { id, type, label } = e.target.data();
			if (type === "tag") {
				setNode({
					id: id,
					label: label,
				});
			}
		});
	});

	return <div ref={container} style="width:100%; height:50vh;"></div>;
}
