import { useContext } from "solid-js";
import { cliContext } from "../contexts";

export function useCli() {
	const client = useContext(cliContext);
	if (!client) {
		throw new Error("Please set your domain first.");
	}
	return client;
}
