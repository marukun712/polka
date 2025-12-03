import type { Component } from "solid-js";
import { createSignal } from "solid-js";

interface DidInputViewProps {
	onExistingAccount: (didWeb: string, privateKey: string) => void;
	onNewAccount: (domain: string) => void;
}

export const DidInputView: Component<DidInputViewProps> = (props) => {
	const [mode, setMode] = createSignal<"existing" | "new">("existing");
	const [didWeb, setDidWeb] = createSignal("");
	const [privateKey, setPrivateKey] = createSignal("");
	const [domain, setDomain] = createSignal("");

	const handleSubmit = (e: Event) => {
		e.preventDefault();
		if (mode() === "existing") {
			if (didWeb().trim() && privateKey().trim()) {
				props.onExistingAccount(didWeb().trim(), privateKey().trim());
			}
		} else {
			if (domain().trim()) {
				props.onNewAccount(domain().trim());
			}
		}
	};

	return (
		<div class="flex items-center justify-center min-h-screen p-4">
			<div class="bg-white rounded-2xl shadow-lg p-8 w-full max-w-md">
				<h1 class="text-3xl font-bold text-gray-900 mb-2">polka Post Editor</h1>
				<p class="text-gray-600 mb-6">Create and edit repository records</p>

				<form onSubmit={handleSubmit}>
					<div class="mb-4">
						<p class="block text-sm font-medium text-gray-700 mb-2">
							Account Mode
						</p>
						<div class="flex gap-4 mb-4">
							<label class="flex items-center cursor-pointer">
								<input
									type="radio"
									name="accountMode"
									checked={mode() === "existing"}
									onChange={() => setMode("existing")}
									class="mr-2"
								/>
								<span class="text-sm text-gray-700">
									Sign in with existing account
								</span>
							</label>
							<label class="flex items-center cursor-pointer">
								<input
									type="radio"
									name="accountMode"
									checked={mode() === "new"}
									onChange={() => setMode("new")}
									class="mr-2"
								/>
								<span class="text-sm text-gray-700">Create new account</span>
							</label>
						</div>
					</div>

					{mode() === "existing" ? (
						<>
							<div class="mb-4">
								<label
									for="didWeb"
									class="block text-sm font-medium text-gray-700 mb-2"
								>
									DID Web
								</label>
								<input
									id="didWeb"
									type="text"
									value={didWeb()}
									onInput={(e) => setDidWeb(e.currentTarget.value)}
									placeholder="did:web:example.com"
									class="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
								/>
							</div>

							<div class="mb-4">
								<label
									for="privateKey"
									class="block text-sm font-medium text-gray-700 mb-2"
								>
									Private Key (hex)
								</label>
								<input
									id="privateKey"
									type="text"
									value={privateKey()}
									onInput={(e) => setPrivateKey(e.currentTarget.value)}
									placeholder="Enter your private key in hex format"
									class="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
								/>
							</div>

							<button
								type="submit"
								class="w-full bg-blue-600 text-white py-3 rounded-lg font-medium hover:bg-blue-700 transition-colors shadow-md hover:shadow-lg"
							>
								Connect & Resolve
							</button>
						</>
					) : (
						<>
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
								<p class="text-xs text-gray-500 mt-1">
									Enter your domain without "did:web:" prefix
								</p>
							</div>

							<button
								type="submit"
								class="w-full bg-blue-600 text-white py-3 rounded-lg font-medium hover:bg-blue-700 transition-colors shadow-md hover:shadow-lg"
							>
								Create New Identity
							</button>
						</>
					)}
				</form>
			</div>
		</div>
	);
};
