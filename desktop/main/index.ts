import { registerGitHandlers } from "./handlers/git";
import { registerRelayHandlers } from "./handlers/relay";
import { registerRepoHandlers } from "./handlers/repo";

export function registerAllHandlers() {
	registerGitHandlers();
	registerRepoHandlers();
	registerRelayHandlers();
}
