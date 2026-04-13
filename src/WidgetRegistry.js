export class WidgetRegistry {
    static #entries = new Map();

    static register(widgetName, template, css, WidgetClass) {
        this.#entries.set(widgetName, { template, css, WidgetClass });
    }

    static getTemplate(widgetName) {
        const entry = this.#entries.get(widgetName);
        if (!entry) throw new Error('Widget "' + widgetName + '" is not registered.');
        return entry.template.cloneNode(true);
    }

    static getClass(widgetName) {
        return this.#entries.get(widgetName)?.WidgetClass ?? null;
    }

    static has(widgetName) {
        return this.#entries.has(widgetName);
    }
}