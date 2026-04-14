import { WidgetRegistry } from './WidgetRegistry.js';
import { WidgetEvent } from './WidgetEvent.js';
import { BindingParser } from './BindingParser.js';
import { InputGateway } from './InputGateway.js';

/**
 * Base class for widgets in the framework.
 */
export class Widget {
    #state;
    #element;
    #children = [];
    #parent = null;
    #mounted = false;
    #ready = false;
    #destroyed = false;
    #bindings = new Map();
    #listeners = new Map();
    #gateways = new Map();
    #slots = new Map();
    #actionCleanups = [];

    /**
     * Creates a Widget instance.
     * @param {object} initialState - Initial state for the widget.
     */
    constructor(initialState = {}) {
        this.#state = { ...this.constructor.defaultState(), ...initialState };
        this.#element = WidgetRegistry.getTemplate(this.constructor.widgetName);
        this.#element.classList.add(this.constructor.widgetName);
        this.#parseAllBindings();
        this.#updateBindings(Object.keys(this.#state));
        this.onInit();
    }

    /**
     * Returns the default state for the widget.
     * @returns {object} Default state object.
     */
    static defaultState() {
        return {};
    }

    /**
     * Lifecycle method called after construction.
     */
    onInit() { }

    /**
     * Lifecycle method called after mounting.
     * @param {HTMLElement} parentElement - The parent element.
     */
    onMount(parentElement) { }

    /**
     * Lifecycle method called when the widget is ready.
     */
    onReady() { }

    /**
     * Lifecycle method called before destruction.
     */
    onDestroy() { }

    /**
     * Lifecycle method called when state changes.
     * @param {Array<string>} changedKeys - The keys that changed.
     * @param {object} previousState - The previous state.
     */
    onStateChange(changedKeys, previousState) { }

    /**
     * Lifecycle method called on broadcast events.
     * @param {WidgetEvent} event - The broadcast event.
     */
    onBroadcast(event) { }

    /**
     * Gets a copy of the current state.
     * @returns {object} The state object.
     */
    getState() {
        return { ...this.#state };
    }

    /**
     * Updates the state partially.
     * @param {object} partial - The partial state update.
     */
    setState(partial) {
        if (this.#destroyed) return;
        const prev = { ...this.#state };
        const changed = [];
        for (const key of Object.keys(partial)) {
            if (this.#state[key] !== partial[key]) {
                this.#state[key] = partial[key];
                changed.push(key);
            }
        }
        if (changed.length === 0) return;
        this.#updateBindings(changed);
        this.onStateChange(changed, prev);
    }

    /**
     * Updates bindings for changed state keys.
     * @param {Array<string>} changedKeys - The changed keys.
     */
    #updateBindings(changedKeys) {
        for (const key of changedKeys) {
            const bindings = this.#bindings.get(key);
            if (!bindings) continue;
            const value = this.#state[key];
            for (const binding of bindings) {
                this.#applyBinding(binding, value);
            }
        }
    }

    /**
     * Applies a binding to an element.
     * @param {object} binding - The binding object.
     * @param {*} value - The value to apply.
     */
    #applyBinding(binding, value) {
        const el = binding.element;
        switch (binding.type) {
            case 'text':
                el.textContent = value ?? '';
                break;
            case 'html':
                el.innerHTML = value ?? '';
                break;
            case 'visible':
                el.style.display = value ? '' : 'none';
                break;
            case 'attr':
                if (value == null || value === false) {
                    el.removeAttribute(binding.target);
                } else if (value === true) {
                    el.setAttribute(binding.target, '');
                } else {
                    el.setAttribute(binding.target, String(value));
                }
                break;
            case 'class':
                el.classList.toggle(binding.target, !!value);
                break;
            case 'style':
                if (value == null) {
                    el.style.removeProperty(binding.target);
                } else {
                    el.style.setProperty(binding.target, String(value));
                }
                break;
        }
    }

    /**
     * Parses all bindings and actions from the template.
     */
    #parseAllBindings() {
        for (const el of this.#element.querySelectorAll('[data-bind]')) {
            for (const b of BindingParser.parseBindings(el.getAttribute('data-bind'))) {
                if (!this.#bindings.has(b.stateKey)) {
                    this.#bindings.set(b.stateKey, []);
                }
                this.#bindings.get(b.stateKey).push({ element: el, type: b.type, target: b.target });
            }
        }
        for (const el of this.#element.querySelectorAll('[data-action]')) {
            for (const a of BindingParser.parseActions(el.getAttribute('data-action'))) {
                const handler = (e) => {
                    if (typeof this[a.method] === 'function') this[a.method](e);
                };
                el.addEventListener(a.domEvent, handler);
                this.#actionCleanups.push({ element: el, event: a.domEvent, handler });
            }
        }
        for (const el of this.#element.querySelectorAll('[data-gateway]')) {
            const name = el.getAttribute('data-gateway');
            const type = el.getAttribute('data-gateway-type');
            if (type) {
                const options = this.#readGatewayAttributes(el);
                const gw = new InputGateway(type, options);
                gw.mount(el);
                this.#gateways.set(name, gw);
            } else {
                this.#gateways.set(name, null);
            }
        }
        for (const el of this.#element.querySelectorAll('[data-widget]')) {
            this.#slots.set(el.getAttribute('data-widget'), el);
        }
    }

    /**
     * Reads gateway attributes from an element.
     * @param {HTMLElement} el - The element.
     * @returns {object} The options object.
     */
    #readGatewayAttributes(el) {
        const options = {};
        if (el.hasAttribute('data-gateway-placeholder')) options.placeholder = el.getAttribute('data-gateway-placeholder');
        // Add more if needed, but for simplicity, assume options are set in code
        return options;
    }

    /**
     * Adds a child widget.
     * @param {Widget} widget - The child widget.
     * @param {string} slotName - The slot name.
     * @returns {Widget} The added widget.
     */
    addChild(widget, slotName = 'default') {
        if (this.#children.includes(widget)) return widget;
        if (widget.#parent) {
            widget.#parent.removeChild(widget);
        }
        widget.#parent = this;
        this.#children.push(widget);
        const container = this.#slots.get(slotName) ?? this.#element;
        if (this.#mounted) {
            widget.mount(container);
            this.#checkReady();
        }
        return widget;
    }

    /**
     * Removes a child widget.
     * @param {Widget} widget - The child widget.
     */
    removeChild(widget) {
        const idx = this.#children.indexOf(widget);
        if (idx === -1) return;
        this.#children.splice(idx, 1);
        widget.#parent = null;
        widget.destroy();
    }

    /**
     * Gets all children.
     * @returns {Array<Widget>} The children.
     */
    getChildren() {
        return [...this.#children];
    }

    /**
     * Gets children in a specific slot.
     * @param {string} slotName - The slot name.
     * @returns {Array<Widget>} The children in the slot.
     */
    getChildrenInSlot(slotName) {
        const slotEl = this.#slots.get(slotName);
        if (!slotEl) return [];
        return this.#children.filter(child => slotEl.contains(child.#element));
    }

    /**
     * Emits an event.
     * @param {string} type - The event type.
     * @param {object} detail - Event detail.
     */
    emit(type, detail = {}) {
        const event = new WidgetEvent(type, this, detail);
        const handlers = this.#listeners.get(type);
        if (!handlers) return;
        for (const fn of [...handlers]) {
            event.currentTarget = this;
            fn(event);
            if (event.propagationStopped) break;
        }
    }

    /**
     * Adds an event listener.
     * @param {string} type - The event type.
     * @param {function} handler - The handler.
     */
    on(type, handler) {
        if (!this.#listeners.has(type)) this.#listeners.set(type, []);
        this.#listeners.get(type).push(handler);
    }

    /**
     * Removes an event listener.
     * @param {string} type - The event type.
     * @param {function} handler - The handler.
     */
    off(type, handler) {
        const list = this.#listeners.get(type);
        if (!list) return;
        const idx = list.indexOf(handler);
        if (idx !== -1) list.splice(idx, 1);
    }

    /**
     * Broadcasts an event to children.
     * @param {string} type - The event type.
     * @param {object} detail - Event detail.
     */
    broadcast(type, detail = {}) {
        const event = new WidgetEvent(type, this, detail);
        this.#broadcastDown(event);
    }

    /**
     * Broadcasts an event down the tree.
     * @param {WidgetEvent} event - The event.
     */
    #broadcastDown(event) {
        // Construct handler name dynamically from event type
        const handlerName = 'on' + event.type[0].toUpperCase() + event.type.slice(1);
        for (const child of this.#children) {
            event.currentTarget = child;
            if (typeof child[handlerName] === 'function') {
                child[handlerName](event);
            }
            child.onBroadcast(event);
            child.#broadcastDown(event);
        }
    }

    /**
     * Mounts the widget to a parent element.
     * @param {HTMLElement} parentElement - The parent.
     * @param {HTMLElement} anchor - The anchor element.
     */
    mount(parentElement, anchor = null) {
        if (this.#mounted || this.#destroyed) return;
        parentElement.insertBefore(this.#element, anchor);
        this.#mounted = true;
        this.onMount(parentElement);
        for (const child of this.#children) {
            if (!child.#mounted) {
                const slot = this.#findSlotFor(child) ?? this.#element;
                child.mount(slot);
            }
        }
        this.#checkReady();
    }

    /**
     * Finds the slot for a child.
     * @param {Widget} child - The child widget.
     * @returns {HTMLElement|null} The slot element.
     */
    #findSlotFor(child) {
        // For simplicity, assume default slot
        return this.#element;
    }

    /**
     * Unmounts the widget.
     */
    unmount() {
        if (!this.#mounted) return;
        for (const child of this.#children) {
            child.unmount();
        }
        if (this.#element.parentNode) {
            this.#element.parentNode.removeChild(this.#element);
        }
        this.#mounted = false;
        this.#ready = false;
    }

    /**
     * Destroys the widget.
     */
    destroy() {
        if (this.#destroyed) return;
        this.onDestroy();
        for (const child of [...this.#children]) {
            child.destroy();
        }
        for (const [name, gw] of this.#gateways) {
            if (gw) gw.destroy();
        }
        for (const { element, event, handler } of this.#actionCleanups) {
            element.removeEventListener(event, handler);
        }
        this.#listeners.clear();
        if (this.#element.parentNode) {
            this.#element.parentNode.removeChild(this.#element);
        }
        this.#mounted = false;
        this.#destroyed = true;
        if (this.#parent) {
            const idx = this.#parent.#children.indexOf(this);
            if (idx !== -1) this.#parent.#children.splice(idx, 1);
            this.#parent = null;
        }
    }

    /**
     * Gets the root element.
     * @returns {HTMLElement} The element.
     */
    getElement() {
        return this.#element;
    }

    /**
     * Applies a CSS property.
     * @param {string} property - The property.
     * @param {string} value - The value.
     */
    applyStyle(property, value) {
        this.#element.style.setProperty(property, value);
    }

    /**
     * Applies multiple CSS properties.
     * @param {object} map - Property-value map.
     */
    applyStyles(map) {
        for (const [prop, val] of Object.entries(map)) {
            this.#element.style.setProperty(prop, val);
        }
    }

    /**
     * Removes a CSS property.
     * @param {string} property - The property.
     */
    removeStyle(property) {
        this.#element.style.removeProperty(property);
    }

    /**
     * Clears all styles.
     */
    clearStyles() {
        this.#element.style.cssText = '';
    }

    /**
     * Adds a CSS class.
     * @param {string} name - The class name.
     */
    addCSSClass(name) {
        this.#element.classList.add(name);
    }

    /**
     * Removes a CSS class.
     * @param {string} name - The class name.
     */
    removeCSSClass(name) {
        this.#element.classList.remove(name);
    }

    /**
     * Toggles a CSS class.
     * @param {string} name - The class name.
     * @param {boolean} force - Force state.
     */
    toggleCSSClass(name, force) {
        this.#element.classList.toggle(name, force);
    }

    /**
     * Creates a gateway.
     * @param {string} name - The gateway name.
     * @param {string} type - The input type.
     * @param {object} options - Options.
     * @returns {InputGateway} The gateway.
     */
    createGateway(name, type, options = {}) {
        const gw = new InputGateway(type, options);
        const el = this.#element.querySelector(`[data-gateway="${name}"]`);
        if (el) gw.mount(el);
        this.#gateways.set(name, gw);
        return gw;
    }

    /**
     * Gets a gateway.
     * @param {string} name - The gateway name.
     * @returns {InputGateway|null} The gateway.
     */
    getGateway(name) {
        return this.#gateways.get(name) ?? null;
    }

    /**
     * Destroys a gateway.
     * @param {string} name - The gateway name.
     */
    destroyGateway(name) {
        const gw = this.#gateways.get(name);
        if (gw) {
            gw.destroy();
            this.#gateways.delete(name);
        }
    }

    /**
     * Checks if the widget is ready.
     */
    #checkReady() {
        if (this.#ready) return;
        for (const child of this.#children) {
            if (!child.#ready) return;
        }
        this.#ready = true;
        this.onReady();
        if (this.#parent) {
            this.#parent.#checkReady();
        }
    }
}