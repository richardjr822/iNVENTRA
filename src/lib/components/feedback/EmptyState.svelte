<script lang="ts">
	import type { Component } from 'svelte';
	import { Button } from '$lib/components/ui/button';

	interface Props {
		/** Lucide icon component to display */
		icon: Component<{ class?: string }>;
		/** Main heading */
		title: string;
		/** Supporting description */
		description: string;
		/** Optional CTA button label */
		actionLabel?: string;
		/** Optional CTA button href (renders as link if provided) */
		actionHref?: string;
		/** Optional CTA button onclick handler */
		actionOnclick?: () => void;
		/** Whether the CTA should be hidden (e.g. for viewer roles) */
		hideAction?: boolean;
		/** Optional additional class for the container */
		class?: string;
	}

	let {
		icon: Icon,
		title,
		description,
		actionLabel,
		actionHref,
		actionOnclick,
		hideAction = false,
		class: className = ''
	}: Props = $props();

	const hasAction = $derived(!hideAction && actionLabel && (actionHref || actionOnclick));
</script>

<div
	class="flex flex-col items-center justify-center space-y-3 py-4 text-center {className}"
	role="status"
	aria-label={title}
>
	<!-- Icon container -->
	<div
		class="rounded-2xl border border-border/20 bg-muted/40 p-4 text-muted-foreground shadow-inner"
		aria-hidden="true"
	>
		<Icon class="h-7 w-7 text-muted-foreground/80" />
	</div>

	<!-- Text -->
	<div class="space-y-1">
		<h3 class="text-base font-bold text-foreground">{title}</h3>
		<p class="max-w-xs text-xs leading-relaxed text-muted-foreground">{description}</p>
	</div>

	<!-- CTA button -->
	{#if hasAction}
		<div class="pt-1">
			{#if actionHref}
				<Button
					href={actionHref}
					size="sm"
					class="bg-primary text-primary-foreground font-bold cursor-pointer hover:bg-primary/90"
				>
					{actionLabel}
				</Button>
			{:else if actionOnclick}
				<Button
					onclick={actionOnclick}
					size="sm"
					class="bg-primary text-primary-foreground font-bold cursor-pointer hover:bg-primary/90"
				>
					{actionLabel}
				</Button>
			{/if}
		</div>
	{/if}
</div>
