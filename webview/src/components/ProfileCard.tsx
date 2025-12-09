import type { Component } from "solid-js";
import { createSignal, Show } from "solid-js";

export interface Profile {
	version: number;
	name: string;
	icon: string;
	description: string;
}

export const ProfileCard: Component<{ profile: Profile }> = (props) => {
	const [imageError, setImageError] = createSignal(false);

	return (
		<div class="bg-white rounded-2xl shadow-lg p-6 md:p-8 mb-6">
			<div class="flex flex-col md:flex-row items-center md:items-start gap-6">
				<Show
					when={!imageError() && props.profile.icon}
					fallback={
						<div class="w-24 h-24 md:w-32 md:h-32 rounded-full bg-blue-100 flex items-center justify-center text-4xl font-bold text-blue-600">
							{props.profile.name?.[0]?.toUpperCase() || "?"}
						</div>
					}
				>
					<img
						src={props.profile.icon}
						alt={props.profile.name || "Profile"}
						class="w-24 h-24 md:w-32 md:h-32 rounded-full object-cover shadow-md"
						onError={() => setImageError(true)}
					/>
				</Show>

				<div class="flex-1 text-center md:text-left">
					<h1 class="text-3xl md:text-4xl font-bold text-gray-900 mb-2">
						{props.profile.name || "Unknown User"}
					</h1>
					<p class="text-lg text-gray-600 leading-relaxed">
						{props.profile.description || "No description provided"}
					</p>
				</div>
			</div>
		</div>
	);
};
