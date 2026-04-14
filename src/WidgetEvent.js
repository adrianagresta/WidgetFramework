/**
 * Custom event class for widget events.
 */
export class WidgetEvent {
    #stopped;

    /**
     * Creates a WidgetEvent.
     * @param {string} type - The event type.
     * @param {Widget} source - The source widget.
     * @param {object} detail - Additional detail.
     */
    constructor(type, source, detail = {}) {
        this.type = type;
        this.source = source;
        this.currentTarget = source;
        this.detail = detail;
        this.timestamp = Date.now();
        this.#stopped = false;
    }

    /**
     * Stops event propagation.
     */
    stopPropagation() {
        this.#stopped = true;
    }

    /**
     * Checks if propagation is stopped.
     * @returns {boolean} True if stopped.
     */
    get propagationStopped() {
        return this.#stopped;
    }
}