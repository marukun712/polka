import { type Component, createResource, For, Show } from "solid-js";
import RecordEditForm from "../components/forms/RecordEditForm";
import Loading from "../components/ui/Loading";
import { useIPC } from "../hooks/useIPC";
import { allRecords } from "../lib/client";

const fetcher = async () => {
	const ipc = useIPC();
	const res = await allRecords(ipc.did);
	const commit = await ipc.client.getCommit();
	return { res, commit };
};

const InspectorPage: Component = () => {
	const [res] = createResource(fetcher);

	return (
		<main class="container-fluid">
			<a href="/">Back to top page</a>
			<Show when={res()} fallback={<Loading />}>
				{(r) => (
					<>
						<figure>
							<article>
								<h1>Your Commit:</h1>
								<pre style="max-height: 12rem; overflow: auto;">
									{JSON.stringify(r().commit, null, 2)}
								</pre>
							</article>
							<table class="striped hoverable">
								<thead>
									<tr>
										<th scope="col">rpath</th>
										<th scope="col">Content</th>
										<th scope="col">Edit</th>
									</tr>
								</thead>
								<tbody>
									<For each={r().res.records}>
										{(item) => (
											<tr>
												<th scope="row" style="white-space: nowrap;">
													{item.rpath}
												</th>
												<td>
													<pre style="max-height: 12rem; overflow: auto;">
														{JSON.stringify(item.data, null, 2)}
													</pre>
												</td>
												<td>
													<RecordEditForm init={item} />
												</td>
											</tr>
										)}
									</For>
								</tbody>
							</table>
						</figure>
					</>
				)}
			</Show>
		</main>
	);
};

export default InspectorPage;
