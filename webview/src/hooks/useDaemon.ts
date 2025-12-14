import { useContext } from "solid-js";
import { daemonContext } from "../index";

export function useDaemon() {
	const daemon = useContext(daemonContext);
	if (!daemon) {
		throw new Error("Daemon context not available");
	}
	return daemon.daemon;
}
