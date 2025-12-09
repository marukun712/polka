import * as TID from "@atcute/tid";
import type { Component } from "solid-js";
import { createSignal, Show } from "solid-js";
import { z } from "zod";

export const profileSchema = z.object({
	name: z.string(),
	icon: z.string(),
	description: z.string(),
});

export const postSchema = z.object({
	rpath: z.string(),
	data: z.object({ content: z.string() }),
});

export type Profile = z.infer<typeof profileSchema>;
export type Post = z.infer<typeof postSchema>;

function formatRelativeTime(timestamp: number): string {
	return new Date(timestamp / 1000).toLocaleString();
}

function extractTimestamp(rpath: string): number {
	try {
		const recordId = rpath.split("/")[1];
		const tid = TID.parse(recordId);
		return tid.timestamp;
	} catch {
		return Date.now();
	}
}

export const TimelinePostCard: Component<{ post: Post; profile: Profile }> = (
	props,
) => {
	const timestamp = () => extractTimestamp(props.post.rpath);
	const relativeTime = () => formatRelativeTime(timestamp());
	const [imageError, setImageError] = createSignal(false);

	return (
		<div class="bg-white rounded-2xl shadow-lg p-4 md:p-6 mb-4 hover:shadow-xl transition-shadow">
			<div class="flex items-start gap-3 mb-4">
				<Show
					when={!imageError() && props.profile.icon}
					fallback={
						<div class="w-12 h-12 rounded-full bg-linear-to-br from-blue-400 to-blue-600 flex items-center justify-center text-white font-bold text-lg shrink-0">
							{props.profile.name[0]?.toUpperCase() || "?"}
						</div>
					}
				>
					<img
						src={props.profile.icon}
						alt={props.profile.name}
						class="w-12 h-12 rounded-full object-cover shrink-0"
						onError={() => setImageError(true)}
					/>
				</Show>

				<div class="flex-1 min-w-0">
					<div class="font-semibold text-gray-900 truncate">
						{props.profile.name}
					</div>
					<div class="text-sm text-gray-500">{relativeTime()}</div>
				</div>
			</div>

			<div class="pl-15">
				<div class="text-gray-800 whitespace-pre-wrap leading-relaxed">
					{props.post.data.content}
				</div>
			</div>
		</div>
	);
};
