/**
 * Registry for widget templates and classes.
 */
export class WidgetRegistry {
    static #entries = new Map();

    /**
     * Registers a widget.
     * @param {string} widgetName - The widget name.
     * @param {DocumentFragment} template - The template fragment.
     * @param {string} css - The scoped CSS.
     * @param {Function} WidgetClass - The widget class.
     */
    static register(widgetName, template, css, WidgetClass) {
        this.#entries.set(widgetName, { template, css, WidgetClass });
    }

    /**
     * Gets the template for a widget.
     * @param {string} widgetName - The widget name.
     * @returns {DocumentFragment} The cloned template.
     * @throws {Error} If widget not registered.
     */
    static getTemplate(widgetName) {
        const entry = this.#entries.get(widgetName);
        if (!entry) throw new Error('Widget "' + widgetName + '" is not registered.');
        return entry.template.cloneNode(true);
    }

    /**
     * Gets the class for a widget.
     * @param {string} widgetName - The widget name.
     * @returns {Function|null} The widget class.
     */
    static getClass(widgetName) {
        return this.#entries.get(widgetName)?.WidgetClass ?? null;
    }

    /**
     * Checks if a widget is registered.
     * @param {string} widgetName - The widget name.
     * @returns {boolean} True if registered.
     */
    static has(widgetName) {
        return this.#entries.has(widgetName);
    }
}