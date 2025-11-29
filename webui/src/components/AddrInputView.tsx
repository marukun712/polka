import type { Component } from "solid-js";
import { createSignal } from "solid-js";

export const AddrInputView: Component<{
	onSubmit: (addr: string, useRelay: boolean, relayAddr?: string) => void;
}> = (props) => {
	const [addr, setAddr] = createSignal("");
	const [useRelay, setUseRelay] = createSignal(false);
	const [relayAddr, setRelayAddr] = createSignal("");

	const handleSubmit = (e: Event) => {
		e.preventDefault();
		if (addr().trim()) {
			props.onSubmit(
				addr().trim(),
				useRelay(),
				useRelay() ? relayAddr().trim() : undefined,
			);
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
						<p class="block text-sm font-medium text-gray-700 mb-2">
							Connection Method
						</p>
						<div class="flex gap-4 mb-4">
							<label class="flex items-center cursor-pointer">
								<input
									type="radio"
									name="connectionType"
									checked={!useRelay()}
									onChange={() => setUseRelay(false)}
									class="mr-2"
								/>
								<span class="text-sm text-gray-700">Direct (WebSocket)</span>
							</label>
							<label class="flex items-center cursor-pointer">
								<input
									type="radio"
									name="connectionType"
									checked={useRelay()}
									onChange={() => setUseRelay(true)}
									class="mr-2"
								/>
								<span class="text-sm text-gray-700">Via Relay</span>
							</label>
						</div>
					</div>

					{useRelay() && (
						<div class="mb-4">
							<label
								for="relayAddr"
								class="block text-sm font-medium text-gray-700 mb-2"
							>
								Relay Address
							</label>
							<input
								id="relayAddr"
								type="text"
								value={relayAddr()}
								onInput={(e) => setRelayAddr(e.currentTarget.value)}
								placeholder="/ip4/127.0.0.1/tcp/9000/ws/p2p/12D3..."
								class="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
							/>
							<p class="text-xs text-gray-500 mt-1">
								Example: /ip4/127.0.0.1/tcp/9000/ws/p2p/12D3...
							</p>
						</div>
					)}

					<div class="mb-4">
						<label
							for="addr"
							class="block text-sm font-medium text-gray-700 mb-2"
						>
							{useRelay() ? "PDS Peer ID" : "PDS Address"}
						</label>
						<input
							id="addr"
							type="text"
							value={addr()}
							onInput={(e) => setAddr(e.currentTarget.value)}
							placeholder={
								useRelay()
									? "12D3KooWABC..."
									: "/ip4/127.0.0.1/tcp/8000/ws/p2p/12D3..."
							}
							class="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
						/>
						<p class="text-xs text-gray-500 mt-1">
							{useRelay()
								? "Example: 12D3KooWABC..."
								: "Example: /ip4/127.0.0.1/tcp/8000/ws/p2p/12D3..."}
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
