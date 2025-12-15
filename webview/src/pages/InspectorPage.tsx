import { type Component, For, Show } from "solid-js";
import RecordEditForm from "../components/forms/RecordEditForm";
import Loading from "../components/ui/Loading";
import { useAllRecords } from "../hooks/useAllRecords";

const InspectorPage: Component = () => {
	const res = useAllRecords();

	return (
		<main class="container-fluid">
			<Show when={res()} fallback={<Loading />}>
				{(r) => (
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
													{JSON.stringify(JSON.parse(item.data), null, 2)}
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
				)}
			</Show>
		</main>
	);
};

export default InspectorPage;
