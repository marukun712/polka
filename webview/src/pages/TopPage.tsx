import { useNavigate } from "@solidjs/router";
import { createSignal } from "solid-js";

function TopPage() {
	const [did, setDid] = createSignal("");
	const router = useNavigate();

	return (
		<>
			<nav class="container-fluid">
				<ul>
					<li>
						<strong>polka</strong>
					</li>
				</ul>
			</nav>

			<header class="container">
				<hgroup>
					<h1>polka viewer</h1>
					<p>
						polkaは、データの所有権をユーザーに取り戻す、分散型ソーシャルデジタルガーデンです。
					</p>
				</hgroup>
			</header>

			<main class="container">
				<input
					type="text"
					placeholder="didを入力..."
					value={did()}
					onchange={(e) => {
						setDid(e.currentTarget.value);
					}}
				></input>
				<button
					type="submit"
					onclick={() => {
						router(`/user?did=${did()}`);
					}}
				>
					Go
				</button>
			</main>
		</>
	);
}

export default TopPage;
