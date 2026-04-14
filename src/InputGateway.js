/**
 * Class representing an input gateway for handling form inputs in widgets.
 */
export class InputGateway {
    #element;
    #type;
    #listeners = new Map();
    #validator = null;
    #lastValidation = null;

    /**
     * Creates an InputGateway instance.
     * @param {string} type - The input type (e.g., 'text', 'number', 'select').
     * @param {object} options - Configuration options for the input.
     */
    constructor(type, options = {}) {
        this.#type = type;
        this.#createElement(type);
        this.#applyOptions(options);
        this.#attachListeners();
    }

    /**
     * Creates the DOM element based on the type.
     * @param {string} type - The input type.
     */
    #createElement(type) {
        if (type === 'textarea') {
            this.#element = document.createElement('textarea');
        } else if (type === 'select') {
            this.#element = document.createElement('select');
        } else {
            this.#element = document.createElement('input');
            this.#element.type = type;
        }
    }

    /**
     * Applies configuration options to the element.
     * @param {object} options - The options object.
     */
    #applyOptions(options) {
        if (options.placeholder) this.#element.placeholder = options.placeholder;
        if (options.disabled !== undefined) this.#element.disabled = options.disabled;
        if (options.readOnly !== undefined) this.#element.readOnly = options.readOnly;
        if (options.name) this.#element.name = options.name;
        if (options.id) this.#element.id = options.id;
        if (options.min !== undefined) this.#element.min = options.min;
        if (options.max !== undefined) this.#element.max = options.max;
        if (options.step !== undefined) this.#element.step = options.step;
        if (options.pattern) this.#element.pattern = options.pattern;
        if (options.accept) this.#element.accept = options.accept;
        if (options.multiple !== undefined) this.#element.multiple = options.multiple;
        if (options.rows !== undefined) this.#element.rows = options.rows;
        if (options.cols !== undefined) this.#element.cols = options.cols;
        if (options.options && type === 'select') {
            this.setOptions(options.options);
        }
        if (options.checked !== undefined && (type === 'checkbox' || type === 'radio')) {
            this.#element.checked = options.checked;
        }
        if (options.value !== undefined) {
            this.#element.value = options.value;
        }
        if (options.cssClass) this.#element.className = options.cssClass;
        if (options.attributes) {
            for (const [k, v] of Object.entries(options.attributes)) {
                this.#element.setAttribute(k, v);
            }
        }
    }

    /**
     * Attaches event listeners to the element.
     */
    #attachListeners() {
        // Create an emit function to standardize event details
        const emit = (type, nativeEvent = null) => {
            const value = this.getValue();
            const detail = {
                gatewayName: null, // set by widget
                gatewayType: this.#type,
                type,
                value,
                previousValue: null, // not tracked
                source: 'user',
                timestamp: Date.now(),
                nativeEvent
            };
            const handlers = this.#listeners.get(type);
            if (handlers) for (const h of handlers) h(detail);
        };

        this.#element.addEventListener('input', (e) => emit('input', e));
        this.#element.addEventListener('change', (e) => emit('change', e));
        this.#element.addEventListener('focus', (e) => emit('focus', e));
        this.#element.addEventListener('blur', (e) => emit('blur', e));
    }

    /**
     * Emits an update event programmatically.
     */
    #emitUpdate() {
        const value = this.getValue();
        const detail = {
            gatewayName: null,
            gatewayType: this.#type,
            type: 'update',
            value,
            previousValue: null,
            source: 'program',
            timestamp: Date.now(),
            nativeEvent: null
        };
        const handlers = this.#listeners.get('update');
        if (handlers) for (const h of handlers) h(detail);
    }

    /**
     * Gets the current value of the input, handling different types.
     * @returns {*} The value of the input.
     */
    getValue() {
        // Handle different input types for value retrieval
        if (this.#type === 'number' || this.#type === 'range') {
            const num = parseFloat(this.#element.value);
            return isNaN(num) ? null : num;
        }
        if (this.#type === 'checkbox' || this.#type === 'radio') {
            return this.#element.value;
        }
        if (this.#type === 'file') {
            return null;
        }
        if (this.#type === 'select') {
            return this.#element.value;
        }
        return this.#element.value;
    }

    /**
     * Checks if the input is checked (for checkbox/radio).
     * @returns {boolean} True if checked.
     */
    isChecked() {
        return this.#element.checked;
    }

    /**
     * Gets the selected files (for file input).
     * @returns {FileList} The files.
     */
    getFiles() {
        return this.#element.files;
    }

    /**
     * Gets the selected options (for select).
     * @returns {Array<string>} Array of selected values.
     */
    getSelectedOptions() {
        if (this.#type !== 'select') return [];
        return Array.from(this.#element.selectedOptions).map(o => o.value);
    }

    /**
     * Sets the value of the input.
     * @param {*} value - The value to set.
     */
    setValue(value) {
        this.#element.value = value ?? '';
        this.#emitUpdate();
    }

    /**
     * Sets the checked state (for checkbox/radio).
     * @param {boolean} bool - The checked state.
     */
    setChecked(bool) {
        this.#element.checked = bool;
        this.#emitUpdate();
    }

    /**
     * Sets the options for a select element.
     * @param {Array<{value: string, label: string, selected?: boolean, disabled?: boolean}>} opts - The options.
     */
    setOptions(opts) {
        if (this.#type !== 'select') return;
        this.#element.innerHTML = '';
        for (const opt of opts) {
            const el = document.createElement('option');
            el.value = opt.value;
            el.textContent = opt.label;
            if (opt.selected) el.selected = true;
            if (opt.disabled) el.disabled = true;
            this.#element.appendChild(el);
        }
        this.#emitUpdate();
    }

    /**
     * Clears the input value.
     */
    clear() {
        if (this.#type === 'checkbox' || this.#type === 'radio') {
            this.#element.checked = false;
        } else {
            this.#element.value = '';
        }
        this.#emitUpdate();
    }

    /**
     * Sets the disabled state.
     * @param {boolean} bool - Whether to disable.
     */
    setDisabled(bool) {
        this.#element.disabled = bool;
    }

    /**
     * Sets the read-only state.
     * @param {boolean} bool - Whether to make read-only.
     */
    setReadOnly(bool) {
        this.#element.readOnly = bool;
    }

    /**
     * Sets the placeholder text.
     * @param {string} text - The placeholder text.
     */
    setPlaceholder(text) {
        this.#element.placeholder = text;
    }

    /**
     * Sets an attribute on the element.
     * @param {string} name - The attribute name.
     * @param {string} value - The attribute value.
     */
    setAttribute(name, value) {
        this.#element.setAttribute(name, value);
    }

    /**
     * Removes an attribute from the element.
     * @param {string} name - The attribute name.
     */
    removeAttribute(name) {
        this.#element.removeAttribute(name);
    }

    /**
     * Sets a validation function.
     * @param {function} fn - The validator function.
     */
    setValidator(fn) {
        this.#validator = fn;
    }

    /**
     * Runs validation on the current value and emits a validate event.
     * @returns {object} The validation result.
     */
    validate() {
        const value = this.getValue();
        const result = this.#validator ? this.#validator(value) : { valid: true, message: '' };
        this.#lastValidation = { ...result, value };
        const detail = {
            gatewayName: null,
            gatewayType: this.#type,
            type: 'validate',
            value,
            previousValue: null,
            source: 'user',
            timestamp: Date.now(),
            nativeEvent: null,
            valid: result.valid,
            message: result.message
        };
        const handlers = this.#listeners.get('validate');
        if (handlers) for (const h of handlers) h(detail);
        return this.#lastValidation;
    }

    /**
     * Gets the last validation state.
     * @returns {object|null} The validation state.
     */
    getValidationState() {
        return this.#lastValidation;
    }

    /**
     * Clears the validation state.
     */
    clearValidation() {
        this.#lastValidation = null;
    }

    /**
     * Adds an event listener.
     * @param {string} type - The event type.
     * @param {function} handler - The handler function.
     */
    on(type, handler) {
        if (!this.#listeners.has(type)) this.#listeners.set(type, []);
        this.#listeners.get(type).push(handler);
    }

    /**
     * Removes an event listener.
     * @param {string} type - The event type.
     * @param {function} handler - The handler function.
     */
    off(type, handler) {
        const list = this.#listeners.get(type);
        if (!list) return;
        const idx = list.indexOf(handler);
        if (idx !== -1) list.splice(idx, 1);
    }

    /**
     * Gets the DOM element.
     * @returns {HTMLElement} The element.
     */
    getElement() {
        return this.#element;
    }

    /**
     * Mounts the element to a container.
     * @param {HTMLElement} container - The container element.
     */
    mount(container) {
        container.appendChild(this.#element);
    }

    /**
     * Unmounts the element from its parent.
     */
    unmount() {
        if (this.#element.parentNode) {
            this.#element.parentNode.removeChild(this.#element);
        }
    }

    /**
     * Destroys the gateway, cleaning up listeners and removing the element.
     */
    destroy() {
        this.unmount();
        this.#listeners.clear();
    }
}