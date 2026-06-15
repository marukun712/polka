import { useNavigate } from "@solidjs/router";
import { type Component, onMount } from "solid-js";

const LAST_DID_KEY = "polka_last_did";

const IndexPage: Component = () => {
	const navigate = useNavigate();

	onMount(() => {
		const saved = localStorage.getItem(LAST_DID_KEY);
		if (saved) {
			navigate(`/user?did=${encodeURIComponent(saved)}`);
		}
	});

	return (
		<main class="container">
			<h1>polka viewer</h1>
			<form
				onSubmit={(e) => {
					e.preventDefault();
					const formData = new FormData(e.currentTarget);
					const did = (formData.get("did") as string).trim();
					if (!did) return;
					localStorage.setItem(LAST_DID_KEY, did);
					navigate(`/user?did=${encodeURIComponent(did)}`);
				}}
			>
				<input
					type="text"
					name="did"
					placeholder="Enter a DID (did:web:example.com)"
					required
				/>
				<button type="submit">View</button>
			</form>
		</main>
	);
};

export default IndexPage;
