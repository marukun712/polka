import type { Component } from "solid-js";

export const LoadingView: Component = () => {
	return (
		<div class="flex flex-col items-center justify-center py-20">
			<div class="w-16 h-16 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin" />
			<p class="text-gray-600 mt-4">Connecting to Repository...</p>
		</div>
	);
};
