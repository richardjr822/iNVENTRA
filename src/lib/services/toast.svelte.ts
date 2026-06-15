export type ToastType = 'success' | 'info' | 'warning' | 'error';

export interface ToastOptions {
	message: string;
	title?: string;
	type?: ToastType;
	duration?: number;
}

class ToastService {
	show = $state(false);
	message = $state('');
	title = $state('');
	type = $state<ToastType>('success');
	duration = $state(3500);
	progress = $state(100);

	private timeoutId: ReturnType<typeof setTimeout> | null = null;
	private progressInterval: ReturnType<typeof setInterval> | null = null;

	trigger(message: string, type: ToastType = 'success', title?: string, duration = 3500) {
		// Clear any existing timers
		this._clearTimers();

		this.message = message;
		this.title = title || '';
		this.type = type;
		this.duration = duration;
		this.show = true;
		this.progress = 100;

		// Animate progress bar
		const startTime = Date.now();
		this.progressInterval = setInterval(() => {
			const elapsed = Date.now() - startTime;
			this.progress = Math.max(0, 100 - (elapsed / duration) * 100);
		}, 16);

		this.timeoutId = setTimeout(() => {
			this.show = false;
			this._clearTimers();
		}, duration);
	}

	dismiss() {
		this.show = false;
		this._clearTimers();
	}

	private _clearTimers() {
		if (this.timeoutId) {
			clearTimeout(this.timeoutId);
			this.timeoutId = null;
		}
		if (this.progressInterval) {
			clearInterval(this.progressInterval);
			this.progressInterval = null;
		}
	}
}

export const toastService = new ToastService();
