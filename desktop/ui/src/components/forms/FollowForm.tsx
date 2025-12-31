import { now } from "@atcute/tid";
import { useIPC } from "../../hooks/useIPC";
import { type FollowData, followDataSchema } from "../../types";

export default function FollowForm() {
	const ipc = useIPC();

	return (
		<form
			onSubmit={async (e) => {
				e.preventDefault();
				const form = e.currentTarget;
				const formData = new FormData(form);
				const did = formData.get("did") as string;
				const tag = formData.get("tag") as string;

				if (!did || !tag) return;

				const raw: FollowData = {
					did,
					tag,
					updatedAt: new Date().toISOString(),
				};

				const parsed = followDataSchema.safeParse(raw);
				if (!parsed.success) {
					console.error("Failed to parse follow data:", parsed.error);
					return;
				}

				await ipc.client.create(`polka.follow/${now()}`, parsed.data);
				await ipc.client.commit();

				form.reset();
			}}
		>
			<input
				type="text"
				name="did"
				placeholder="did:web:example.com"
				required
			/>
			<input
				type="text"
				name="tag"
				placeholder="Enter follow target tag..."
				required
			/>
			<button type="submit">Follow</button>
		</form>
	);
}
