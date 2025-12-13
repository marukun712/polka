import * as TID from "@atcute/tid";

export function extractTimestamp(rpath: string): string {
	const recordId = rpath.split("/")[1];
	const tid = TID.parse(recordId);
	return new Date(tid.timestamp / 1000).toLocaleString();
}

export function extractTimestampNum(rpath: string): number {
	const recordId = rpath.split("/")[1];
	const tid = TID.parse(recordId);
	return tid.timestamp / 1000;
}
