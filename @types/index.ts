export interface PolkaEvent {
	id: string;
	event: string;
	timestamp: string;
	// biome-ignore lint/suspicious/noExplicitAny: any
	message: Record<string, any>;
}
