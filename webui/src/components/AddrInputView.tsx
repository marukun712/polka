import type { Component } from "solid-js";
import { createSignal } from "solid-js";

export const AddrInputView: Component<{ onSubmit: (addr: string) => void }> = (
	props,
) => {
	const [addr, setAddr] = createSignal("");

	const handleSubmit = (e: Event) => {
		e.preventDefault();
		if (addr().trim()) {
			props.onSubmit(addr().trim());
		}
	};

	return (
		<div class="flex items-center justify-center min-h-screen p-4">
			<div class="bg-white rounded-2xl shadow-lg p-8 w-full max-w-md">
				<h1 class="text-3xl font-bold text-gray-900 mb-2">Polka PDS Viewer</h1>
				<p class="text-gray-600 mb-6">
					Enter a multiaddr to connect to a PDS server
				</p>

				<form onSubmit={handleSubmit}>
					<div class="mb-4">
						<label
							for="addr"
							class="block text-sm font-medium text-gray-700 mb-2"
						>
							Multiaddr
						</label>
						<input
							id="addr"
							type="text"
							value={addr()}
							onInput={(e) => setAddr(e.currentTarget.value)}
							placeholder="/ip4/127.0.0.1/tcp/8000/ws"
							class="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
						/>
						<p class="text-xs text-gray-500 mt-1">
							Example: /ip4/127.0.0.1/tcp/8000/ws
						</p>
					</div>

					<button
						type="submit"
						class="w-full bg-blue-600 text-white py-3 rounded-lg font-medium hover:bg-blue-700 transition-colors shadow-md hover:shadow-lg"
					>
						Connect to PDS
					</button>
				</form>
			</div>
		</div>
	);
};
