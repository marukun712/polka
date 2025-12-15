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
					<>
						<article>
							<h1>Your identity:</h1>
							<h4>did:web: {r().daemon?.did}</h4>
							<h4>did:key(pk to verify): {r().doc.didKey}</h4>
							<pre style="max-height: 12rem; overflow: auto;">
								{JSON.stringify(r().doc.doc, null, 2)}
							</pre>
						</article>
						<article>
							<h1>Your repository data:</h1>
							<h4>
								Root CID(CID for Signed commit):{" "}
								{r().reader.getCommitToVerify().root}
							</h4>
							<pre style="max-height: 12rem; overflow: auto;">
								{JSON.stringify(
									r().reader.getCommitToVerify().decoded,
									null,
									2,
								)}
							</pre>
						</article>
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
					</>
				)}
			</Show>
		</main>
	);
};

export default InspectorPage;
