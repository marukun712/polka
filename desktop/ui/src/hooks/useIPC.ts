import { useContext } from "solid-js";
import { ipcContext } from "../contexts";

export function useIPC() {
	const client = useContext(ipcContext);
	if (!client) {
		throw new Error("Please set your domain first.");
	}
	return client;
}
