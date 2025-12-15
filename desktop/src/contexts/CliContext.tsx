import {
	createContext,
	createResource,
	type ParentComponent,
	Show,
} from "solid-js";
import { CliClient } from "../lib/cli";

type CliContextType = {
	did: string;
	client: CliClient;
};

export const cliContext = createContext<CliContextType | null>(null);

const fetchClient = async (domain: string) => {
	const client = await CliClient.init(domain);
	const did = await client.getDid();
	return { did, client };
};

export const CliProvider: ParentComponent<{ domain: string }> = (props) => {
	const [cli] = createResource(props.domain, fetchClient);

	return (
		<Show when={cli()}>
			{(d) => (
				<cliContext.Provider value={d()}>{props.children}</cliContext.Provider>
			)}
		</Show>
	);
};
