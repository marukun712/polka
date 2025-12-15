export function formatDate(dateString: string): string {
	return new Date(dateString).toLocaleString();
}

export function formatTags(tags: string[]): string {
	return tags.join("/");
}

export function parseTags(tagString: string): string[] {
	return tagString.split("/").filter((t) => t.trim());
}
