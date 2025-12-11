import * as TID from "@atcute/tid";
import type { Component } from "solid-js";
import { createSignal, Show } from "solid-js";
import { z } from "zod";
import { ConfirmDialog } from "./ConfirmDialog";

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

interface TimelinePostCardProps {
	post: Post;
	profile: Profile;
	isOwner: boolean;
	onUpdate?: (rpath: string, content: string) => Promise<void>;
	onDelete?: (rpath: string) => Promise<void>;
}

export const TimelinePostCard: Component<TimelinePostCardProps> = (props) => {
	const timestamp = (): number => extractTimestamp(props.post.rpath);
	const relativeTime = (): string => formatRelativeTime(timestamp());
	const [imageError, setImageError] = createSignal(false);
	const [isEditing, setIsEditing] = createSignal(false);
	const [editContent, setEditContent] = createSignal("");
	const [showDeleteConfirm, setShowDeleteConfirm] = createSignal(false);
	const [isSubmitting, setIsSubmitting] = createSignal(false);

	const handleEditClick = (): void => {
		setEditContent(props.post.data.content);
		setIsEditing(true);
	};

	const handleSave = async (): Promise<void> => {
		if (!props.onUpdate) return;
		setIsSubmitting(true);
		try {
			await props.onUpdate(props.post.rpath, editContent());
			setIsEditing(false);
		} finally {
			setIsSubmitting(false);
		}
	};

	const handleCancel = (): void => {
		setIsEditing(false);
		setEditContent("");
	};

	const handleDeleteClick = (): void => {
		setShowDeleteConfirm(true);
	};

	const handleConfirmDelete = async (): Promise<void> => {
		if (!props.onDelete) return;
		await props.onDelete(props.post.rpath);
		setShowDeleteConfirm(false);
	};

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
				<Show
					when={isEditing()}
					fallback={
						<>
							<div class="text-gray-800 whitespace-pre-wrap leading-relaxed">
								{props.post.data.content}
							</div>
							<Show when={props.isOwner && props.onUpdate && props.onDelete}>
								<div class="flex gap-2 mt-3">
									<button
										type="button"
										onClick={handleEditClick}
										class="px-3 py-1 text-sm bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors"
									>
										編集
									</button>
									<button
										type="button"
										onClick={handleDeleteClick}
										class="px-3 py-1 text-sm bg-red-100 text-red-700 rounded-lg hover:bg-red-200 transition-colors"
									>
										削除
									</button>
								</div>
							</Show>
						</>
					}
				>
					<textarea
						value={editContent()}
						onInput={(e) => setEditContent(e.currentTarget.value)}
						class="w-full min-h-20 p-3 border border-gray-300 rounded-lg resize-y focus:outline-none focus:ring-2 focus:ring-blue-500"
						disabled={isSubmitting()}
					/>
					<div class="flex gap-2 mt-3">
						<button
							type="button"
							onClick={handleSave}
							disabled={!editContent().trim() || isSubmitting()}
							class="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
						>
							{isSubmitting() ? "保存中..." : "保存"}
						</button>
						<button
							type="button"
							onClick={handleCancel}
							disabled={isSubmitting()}
							class="px-4 py-2 bg-gray-400 text-white rounded-lg hover:bg-gray-500 disabled:cursor-not-allowed transition-colors"
						>
							キャンセル
						</button>
					</div>
				</Show>
			</div>

			<ConfirmDialog
				isOpen={showDeleteConfirm()}
				title="投稿を削除"
				message="本当に削除しますか？この操作は取り消せません。"
				onConfirm={handleConfirmDelete}
				onCancel={() => setShowDeleteConfirm(false)}
			/>
		</div>
	);
};
