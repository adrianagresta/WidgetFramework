export class InputGateway {
    #element;
    #type;
    #listeners = new Map();
    #validator = null;
    #lastValidation = null;

    constructor(type, options = {}) {
        this.#type = type;
        this.#createElement(type);
        this.#applyOptions(options);
        this.#attachListeners();
    }

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

    #attachListeners() {
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

    getValue() {
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

    isChecked() {
        return this.#element.checked;
    }

    getFiles() {
        return this.#element.files;
    }

    getSelectedOptions() {
        if (this.#type !== 'select') return [];
        return Array.from(this.#element.selectedOptions).map(o => o.value);
    }

    setValue(value) {
        this.#element.value = value ?? '';
        this.#emitUpdate();
    }

    setChecked(bool) {
        this.#element.checked = bool;
        this.#emitUpdate();
    }

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

    clear() {
        if (this.#type === 'checkbox' || this.#type === 'radio') {
            this.#element.checked = false;
        } else {
            this.#element.value = '';
        }
        this.#emitUpdate();
    }

    setDisabled(bool) {
        this.#element.disabled = bool;
    }

    setReadOnly(bool) {
        this.#element.readOnly = bool;
    }

    setPlaceholder(text) {
        this.#element.placeholder = text;
    }

    setAttribute(name, value) {
        this.#element.setAttribute(name, value);
    }

    removeAttribute(name) {
        this.#element.removeAttribute(name);
    }

    setValidator(fn) {
        this.#validator = fn;
    }

    /**
     * Runs validation functions on value. Sends event to validation handlers. 
     * @returns validation details. 
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

    getValidationState() {
        return this.#lastValidation;
    }

    clearValidation() {
        this.#lastValidation = null;
    }

    on(type, handler) {
        if (!this.#listeners.has(type)) this.#listeners.set(type, []);
        this.#listeners.get(type).push(handler);
    }

    off(type, handler) {
        const list = this.#listeners.get(type);
        if (!list) return;
        const idx = list.indexOf(handler);
        if (idx !== -1) list.splice(idx, 1);
    }

    getElement() {
        return this.#element;
    }

    mount(container) {
        container.appendChild(this.#element);
    }

    unmount() {
        if (this.#element.parentNode) {
            this.#element.parentNode.removeChild(this.#element);
        }
    }

    destroy() {
        this.unmount();
        this.#listeners.clear();
    }
}