/* @refresh reload */
import "./index.css";
import { render } from "solid-js/web";
import "solid-devtools";
import { Route, Router } from "@solidjs/router";
import Profile from "./Profile";

const root = document.getElementById("root");

if (import.meta.env.DEV && !(root instanceof HTMLElement)) {
	throw new Error(
		"Root element not found. Did you forget to add it to your index.html? Or maybe the id attribute got misspelled?",
	);
}

render(
	() => (
		<Router>
			<Route path="/profile" component={Profile} />
		</Router>
	),
	root as HTMLElement,
);
