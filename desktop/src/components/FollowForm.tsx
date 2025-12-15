import { now } from "@atcute/tid";
import { useContext } from "solid-js";
import { daemonContext } from "..";
import { followDataSchema } from "../types";

export default function FollowForm() {
	const daemon = useContext(daemonContext);

	if (daemon)
		return (
			<article>
				<header>
					<h1>タグノードをフォロー</h1>
				</header>
				<form
					onSubmit={async (e) => {
						e.preventDefault();
						const form = e.currentTarget;
						const formData = new FormData(form);
						const did = formData.get("did") as string;
						const tag = formData.get("tag") as string;

						if (!did || !tag) return;

						const raw = {
							did,
							tag,
							updatedAt: new Date().toISOString(),
						};

						const parsed = followDataSchema.safeParse(raw);
						if (!parsed.success) {
							console.error("Failed to parse follow data:", parsed.error);
							return;
						}

						await daemon.daemon.create(
							`polka.follow/${now()}`,
							JSON.stringify(parsed.data),
						);
						await daemon.daemon.commit();

						form.reset();
					}}
				>
					<label>
						DID
						<input
							type="text"
							name="did"
							placeholder="did:web:example.com"
							required
						/>
					</label>
					<label>
						タグ名
						<input type="text" name="tag" required />
					</label>
					<button type="submit">フォロー</button>
				</form>
			</article>
		);
}
