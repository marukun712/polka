import * as TID from "@atcute/tid";
import type { Component } from "solid-js";
import { createSignal, Show } from "solid-js";

export interface Profile {
	version: number;
	name: string;
	icon: string;
	description: string;
}

export interface TimelinePost {
	id: string;
	did: string;
	rpath: string;
	tag: { name: string }[];
	content?: string;
	contentLoading?: boolean;
	contentError?: string;
	profile?: Profile | null;
	profileLoading?: boolean;
}

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

export const TimelinePostCard: Component<{ post: TimelinePost }> = (props) => {
	const timestamp = () => extractTimestamp(props.post.rpath);
	const relativeTime = () => formatRelativeTime(timestamp());
	const [imageError, setImageError] = createSignal(false);

	const displayName = () => {
		if (props.post.profileLoading) return "読み込み中...";
		return props.post.profile?.name || props.post.did;
	};

	const profileIcon = () => props.post.profile?.icon;
	const profileInitial = () => {
		const name = props.post.profile?.name || props.post.did;
		return name[0]?.toUpperCase() || "?";
	};

	return (
		<div class="bg-white rounded-2xl shadow-lg p-4 md:p-6 mb-4 hover:shadow-xl transition-shadow">
			<div class="flex items-start gap-3 mb-4">
				<Show
					when={!imageError() && profileIcon()}
					fallback={
						<div class="w-12 h-12 rounded-full bg-linear-to-br from-blue-400 to-blue-600 flex items-center justify-center text-white font-bold text-lg shrink-0">
							{profileInitial()}
						</div>
					}
				>
					<a href={`/?domain=${props.post.did.split(":").pop()}`}>
						<img
							src={profileIcon()}
							alt={displayName()}
							class="w-12 h-12 rounded-full object-cover shrink-0"
							onError={() => setImageError(true)}
						/>
					</a>
				</Show>

				<div class="flex-1 min-w-0">
					<a href={`/?domain=${props.post.did.split(":").pop()}`}>
						<div class="font-semibold text-gray-900 truncate">
							{displayName()}
						</div>
					</a>
					<div class="text-sm text-gray-500">{relativeTime()}</div>
				</div>

				<Show when={props.post.tag.length > 0}>
					<div class="flex gap-1 flex-wrap">
						{props.post.tag.map((t) => (
							<span class="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded-full">
								#{t.name}
							</span>
						))}
					</div>
				</Show>
			</div>

			<div class="pl-15">
				<Show when={props.post.contentLoading}>
					<div class="text-gray-400 text-sm animate-pulse">読み込み中...</div>
				</Show>
				<Show when={props.post.contentError}>
					<div class="text-red-400 text-sm">本文を取得できませんでした</div>
				</Show>
				<Show when={props.post.content && !props.post.contentLoading}>
					<div class="text-gray-800 whitespace-pre-wrap leading-relaxed">
						{props.post.content}
					</div>
				</Show>
			</div>
		</div>
	);
};
