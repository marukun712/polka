export type GraphNodeType = "tag" | "post" | "link";

export type GraphNode = {
	id: string;
	label: string;
	type: GraphNodeType;
};

export type GraphEdge = {
	source: string;
	target: string;
};

export type TagHierarchy = {
	tagParentMap: Map<string, Set<string>>;
	allTags: Set<string>;
	childTags: Set<string>;
};
