export interface PolkaEvent {
	id: string;
	publickey: string;
	signature: string;
	event: string;
	timestamp: string;
	// biome-ignore lint/suspicious/noExplicitAny: any
	message: Record<string, any>;
}
