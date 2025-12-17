/* @refresh reload */
import "./index.css";
import { render } from "solid-js/web";
import "solid-devtools";
import { Route, Router } from "@solidjs/router";
import Notfound from "./components/ui/Notfound";
import { CacheProvider } from "./contexts";
import TopPage from "./pages/TopPage";
import UserPage from "./pages/UserPage";

const root = document.getElementById("root");

if (import.meta.env.DEV && !(root instanceof HTMLElement)) {
	throw new Error(
		"Root element not found. Did you forget to add it to your index.html? Or maybe the id attribute got misspelled?",
	);
}

render(
	() => (
		<CacheProvider>
			<Router>
				<Route path="/" component={TopPage} />
				<Route path="/user" component={UserPage} />
				<Route path="*404" component={Notfound} />
			</Router>
		</CacheProvider>
	),
	root as HTMLElement,
);
