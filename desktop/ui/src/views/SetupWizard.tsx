import { IoCheckmark } from "solid-icons/io";
import type { Component } from "solid-js";
import { Show } from "solid-js";
import { createStore } from "solid-js/store";
import { DomainStep } from "../components/setup/DomainStep";
import { GitStep } from "../components/setup/GitStep";
import { KeyStep } from "../components/setup/KeyStep";
import { ProfileStep } from "../components/setup/ProfileStep";
import { RepoInitStep } from "../components/setup/RepoInitStep";

interface WizardState {
	currentStep: number;
	domain: string;
	didKey: string;
	secretKey: string;
	remoteUrl: string;
}

export const SetupWizard: Component = () => {
	const [state, setState] = createStore<WizardState>({
		currentStep: 1,
		domain: "",
		didKey: "",
		secretKey: "",
		remoteUrl: "",
	});

	const handleDomainNext = async (
		domain: string,
		didKey: string,
		sk?: string,
	) => {
		try {
			setState({
				domain,
				didKey,
				secretKey: sk,
			});
			if (sk) {
				setState("currentStep", 2);
			} else {
				setState("currentStep", 3);
			}
		} catch (err) {
			console.error("Failed to resolve domain:", err);
		}
	};

	const handleKeyNext = (secretKey: string) => {
		setState({
			secretKey,
		});
		setState("currentStep", 3);
	};

	const handleGitNext = (remoteUrl: string) => {
		setState({ remoteUrl });
		setState("currentStep", 4);
	};

	const handleRepoInitNext = () => {
		setState("currentStep", 5);
	};

	const handleProfileComplete = () => {
		window.location.href = "/timeline";
	};

	return (
		<div class="min-h-screen bg-gray-50 py-12 px-4">
			<div class="max-w-4xl mx-auto">
				<div class="mb-8">
					<div class="flex items-center justify-center gap-2">
						{[1, 2, 3, 4, 5].map((step) => (
							<div class="flex items-center">
								<div
									class={`w-10 h-10 rounded-full flex items-center justify-center font-semibold ${
										state.currentStep === step
											? "bg-blue-600 text-white"
											: state.currentStep > step
												? "bg-green-600 text-white"
												: "bg-gray-300 text-gray-600"
									}`}
								>
									{state.currentStep > step ? <IoCheckmark /> : step}
								</div>
								{step < 5 && (
									<div
										class={`w-12 h-1 mx-1 ${
											state.currentStep > step ? "bg-green-600" : "bg-gray-300"
										}`}
									/>
								)}
							</div>
						))}
					</div>
					<div class="flex justify-center mt-4">
						<p class="text-sm text-gray-600">
							ステップ {state.currentStep} / 5
						</p>
					</div>
				</div>

				<Show when={state.currentStep === 1}>
					<DomainStep onNext={handleDomainNext} />
				</Show>

				<Show when={state.currentStep === 2}>
					<KeyStep onNext={handleKeyNext} />
				</Show>

				<Show when={state.currentStep === 3}>
					<GitStep remoteUrl={state.remoteUrl} onNext={handleGitNext} />
				</Show>

				<Show when={state.currentStep === 4}>
					<RepoInitStep
						secretKey={state.secretKey}
						didKey={state.didKey}
						onNext={handleRepoInitNext}
					/>
				</Show>

				<Show when={state.currentStep === 5}>
					<ProfileStep onComplete={handleProfileComplete} />
				</Show>
			</div>
		</div>
	);
};
