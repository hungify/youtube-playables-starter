type Listener<P> = (payload: P) => void;

/**
 * Typed pub/sub with no engine dependency. Each game declares its own payload map
 * (`{ 'score:changed': { score: number } }`) and creates one shared instance.
 */
export class TypedEventBus<Payloads extends object> {
    private readonly listeners = new Map<keyof Payloads, Set<(payload: never) => void>>();

    on<K extends keyof Payloads>(event: K, listener: Listener<Payloads[K]>): () => void {
        let bucket = this.listeners.get(event);
        if (!bucket) {
            bucket = new Set();
            this.listeners.set(event, bucket);
        }
        bucket.add(listener as (payload: never) => void);
        return () => this.off(event, listener);
    }

    off<K extends keyof Payloads>(event: K, listener: Listener<Payloads[K]>): void {
        const bucket = this.listeners.get(event);
        if (!bucket) return;
        bucket.delete(listener as (payload: never) => void);
    }

    emit<K extends keyof Payloads>(event: K, payload: Payloads[K]): void {
        const bucket = this.listeners.get(event);
        if (!bucket) return;
        for (const fn of bucket) {
            (fn as Listener<Payloads[K]>)(payload);
        }
    }

    clear(): void {
        this.listeners.clear();
    }
}
