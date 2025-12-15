import type { JSX, ParentComponent } from "solid-js";

type DialogProps = {
	ref: (el: HTMLDialogElement) => void;
	title: string;
	onClose: () => void;
	footer?: JSX.Element;
};

export const Dialog: ParentComponent<DialogProps> = (props) => {
	return (
		<dialog ref={props.ref}>
			<article>
				<header>
					<button
						aria-label="Close"
						// @ts-expect-error
						rel="prev"
						class="close"
						onClick={props.onClose}
					/>
					<p>
						<strong>{props.title}</strong>
					</p>
				</header>
				{props.children}
				{props.footer && <footer>{props.footer}</footer>}
			</article>
		</dialog>
	);
};
