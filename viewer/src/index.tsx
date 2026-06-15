import { HashRouter, Route } from "@solidjs/router";
import { render } from "solid-js/web";
import IndexPage from "./pages/IndexPage";
import UserPage from "./pages/UserPage";

const root = document.getElementById("root");

render(
	() => (
		<HashRouter>
			<Route path="/" component={IndexPage} />
			<Route path="/user" component={UserPage} />
		</HashRouter>
	),
	root as HTMLElement,
);
