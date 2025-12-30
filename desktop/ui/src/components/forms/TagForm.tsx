import { useIPC } from "../../hooks/useIPC";
import { type EdgeData, edgeDataSchema } from "../../types";

export default function TagForm() {
	const ipc = useIPC();

	return (
		<form
			onSubmit={async (e) => {
				e.preventDefault();

				const formData = new FormData(e.currentTarget);
				const raw = formData.get("tags") as string;

				const tags = raw
					.split(",")
					.map((t) => t.trim())
					.filter(Boolean);

				for (let i = 0; i < tags.length; i++) {
					const tag = tags[i];
					const parent = i === 0 ? undefined : tags[i - 1];

					const rpath = parent
						? `polka.edge/${parent}:${tag}`
						: `polka.edge/root:${tag}`;

					const data: EdgeData = {
						from: parent,
						to: tag,
						updatedAt: new Date().toISOString(),
					};

					const parsed = edgeDataSchema.safeParse(data);
					if (!parsed.success) {
						console.error("Failed to parse edge:", parsed.error);
						return;
					}

					await ipc.client.create(rpath, parsed.data);
				}

				await ipc.client.commit();

				e.currentTarget.reset();
			}}
		>
			<input
				type="text"
				name="tags"
				placeholder="Enter tags separated by commas"
			/>
			<button type="submit">Create</button>
		</form>
	);
}
