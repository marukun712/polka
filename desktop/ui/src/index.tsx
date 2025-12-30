import "./index.css";
import { HashRouter, Route } from "@solidjs/router";
import { createResource } from "solid-js";
import { render, Show } from "solid-js/web";
import { IPCProvider } from "./contexts";
import { getDomain, setDomain } from "./lib/ipc";
import InspectorPage from "./pages/InspectorPage";
import TopPage from "./pages/TopPage";

const root = document.getElementById("root");

if (import.meta.env.DEV && !(root instanceof HTMLElement)) {
	throw new Error(
		"Root element not found. Did you forget to add it to your index.html? Or maybe the id attribute got misspelled?",
	);
}

const [domain, { refetch }] = createResource(getDomain);

render(
	() => (
		<Show
			when={domain()}
			fallback={
				<main class="container">
					<form
						onSubmit={async (e) => {
							e.preventDefault();
							const formData = new FormData(e.currentTarget);
							const domain = formData.get("domain") as string;
							await setDomain(domain);
							refetch();
						}}
						style="padding-top: 10rem;"
					>
						<input
							type="text"
							name="domain"
							placeholder="Enter you domain..."
						/>
						<button type="submit">Submit</button>
					</form>
				</main>
			}
		>
			<IPCProvider>
				<HashRouter>
					<Route path="/" component={TopPage} />
					<Route path="/inspector" component={InspectorPage} />
				</HashRouter>
			</IPCProvider>
		</Show>
	),
	root as HTMLElement,
);
