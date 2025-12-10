import type { Component } from "solid-js";
import { createSignal } from "solid-js";

export const AddrInputView: Component<{
	onSubmit: (domain: string) => void;
}> = (props) => {
	const [domain, setDomain] = createSignal("");

	const handleSubmit = (e: Event): void => {
		e.preventDefault();
		if (domain().trim()) {
			props.onSubmit(domain().trim());
		}
	};

	return (
		<div class="flex items-center justify-center min-h-screen p-4">
			<div class="bg-white rounded-2xl shadow-lg p-8 w-full max-w-md">
				<h1 class="text-3xl font-bold text-gray-900 mb-2">
					polka Repository Viewer
				</h1>
				<p class="text-gray-600 mb-6">
					Enter a domain to view its polka repository
				</p>

				<form onSubmit={handleSubmit}>
					<div class="mb-4">
						<label
							for="domain"
							class="block text-sm font-medium text-gray-700 mb-2"
						>
							Domain
						</label>
						<input
							id="domain"
							type="text"
							value={domain()}
							onInput={(e) => setDomain(e.currentTarget.value)}
							placeholder="example.com"
							class="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
						/>
						<p class="text-xs text-gray-500 mt-1">Example: example.com</p>
					</div>

					<button
						type="submit"
						class="w-full bg-blue-600 text-white py-3 rounded-lg font-medium hover:bg-blue-700 transition-colors shadow-md hover:shadow-lg"
					>
						View Repository
					</button>
				</form>
			</div>
		</div>
	);
};
