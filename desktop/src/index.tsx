import "./index.css";
import { HashRouter, Route } from "@solidjs/router";
import { createResource } from "solid-js";
import { render, Show } from "solid-js/web";
import { CacheProvider, CliProvider } from "./contexts";
import { getDomain, setDomain } from "./lib/store";
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
							await setDomain(formData.get("domain") as string);
							refetch();
						}}
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
			{(d) => (
				<CliProvider domain={d()}>
					<CacheProvider>
						<HashRouter>
							<Route path="/" component={TopPage} />
							<Route path="/inspector" component={InspectorPage} />
						</HashRouter>
					</CacheProvider>
				</CliProvider>
			)}
		</Show>
	),
	root as HTMLElement,
);
