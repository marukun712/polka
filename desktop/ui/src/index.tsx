import "./index.css";
import { HashRouter, Route } from "@solidjs/router";
import {
	type Component,
	createResource,
	createSignal,
	type JSX,
	Show,
} from "solid-js";
import { render } from "solid-js/web";
import { IPCProvider } from "./contexts";
import { getDidWithKid, setDidWithKid } from "./lib/ipc";
import InspectorPage from "./pages/InspectorPage";
import TopPage from "./pages/TopPage";
import UserPage from "./pages/UserPage";

const root = document.getElementById("root");

if (import.meta.env.DEV && !(root instanceof HTMLElement)) {
	throw new Error(
		"Root element not found. Did you forget to add it to your index.html? Or maybe the id attribute got misspelled?",
	);
}

const [didWithKid] = createResource(getDidWithKid);

const PasswordGate: Component<{ children: JSX.Element }> = (props) => {
	const [isInitialized, setIsInitialized] = createSignal(false);
	const [error, setError] = createSignal<string | null>(null);

	const handlePasswordSubmit = async (e: Event) => {
		e.preventDefault();
		setError(null);
		const formData = new FormData(e.currentTarget as HTMLFormElement);
		const password = formData.get("password") as string;

		try {
			await window.polka.init(password);
			setIsInitialized(true);
		} catch (err) {
			setError((err as Error).message || "Failed to initialize");
		}
	};

	return (
		<Show
			when={isInitialized()}
			fallback={
				<main class="container">
					<form onSubmit={handlePasswordSubmit} style="padding-top: 10rem;">
						<h2>Enter Vault Password</h2>
						<input
							type="password"
							name="password"
							placeholder="Vault password..."
							required
						/>
						<button type="submit">Unlock</button>
						<Show when={error()}>
							<p style="color: red;">{error()}</p>
						</Show>
					</form>
				</main>
			}
		>
			{props.children}
		</Show>
	);
};

render(
	() => (
		<Show
			when={didWithKid()}
			fallback={
				<main class="container">
					<form
						onSubmit={async (e) => {
							e.preventDefault();
							const formData = new FormData(e.currentTarget);
							const did = formData.get("didWithKid") as string;
							await setDidWithKid(did);
							location.reload();
						}}
						style="padding-top: 10rem;"
					>
						<input
							type="text"
							name="didWithKid"
							placeholder="Enter your DID (did:web:example.com#kid)..."
						/>
						<button type="submit">Submit</button>
					</form>
				</main>
			}
		>
			<PasswordGate>
				<IPCProvider>
					<HashRouter>
						<Route path="/" component={TopPage} />
						<Route path="/inspector" component={InspectorPage} />
						<Route path="/user" component={UserPage} />
					</HashRouter>
				</IPCProvider>
			</PasswordGate>
		</Show>
	),
	root as HTMLElement,
);
