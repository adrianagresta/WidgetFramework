export class WidgetEvent {
    #stopped;

    constructor(type, source, detail = {}) {
        this.type = type;
        this.source = source;
        this.currentTarget = source;
        this.detail = detail;
        this.timestamp = Date.now();
        this.#stopped = false;
    }

    stopPropagation() {
        this.#stopped = true;
    }

    get propagationStopped() {
        return this.#stopped;
    }
}