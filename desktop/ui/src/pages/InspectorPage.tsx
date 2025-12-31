import { type Component, createResource, For, Show } from "solid-js";
import RecordEditForm from "../components/forms/RecordEditForm";
import Loading from "../components/ui/Loading";
import { useIPC } from "../hooks/useIPC";
import { allRecords } from "../lib/client";

const fetcher = async (did: string) => {
	const res = await allRecords(did);
	return res;
};

const InspectorPage: Component = () => {
	const ipc = useIPC();
	const [res] = createResource(ipc.did, fetcher);

	return (
		<main class="container-fluid">
			<a href="/">Back to top page</a>
			<Show when={res()} fallback={<Loading />}>
				{(r) => (
					<>
						<figure>
							<table class="striped hoverable">
								<thead>
									<tr>
										<th scope="col">rpath</th>
										<th scope="col">Content</th>
										<th scope="col">Edit</th>
									</tr>
								</thead>
								<tbody>
									<For each={r().records}>
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
