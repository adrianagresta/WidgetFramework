import { WidgetRegistry } from './WidgetRegistry.js';
import { WidgetEvent } from './WidgetEvent.js';
import { BindingParser } from './BindingParser.js';
import { InputGateway } from './InputGateway.js';

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

    constructor(initialState = {}) {
        this.#state = { ...this.constructor.defaultState(), ...initialState };
        this.#element = WidgetRegistry.getTemplate(this.constructor.widgetName);
        this.#element.classList.add(this.constructor.widgetName);
        this.#parseAllBindings();
        this.#updateBindings(Object.keys(this.#state));
        this.onInit();
    }

    static defaultState() {
        return {};
    }

    onInit() { }
    onMount(parentElement) { }
    onReady() { }
    onDestroy() { }
    onStateChange(changedKeys, previousState) { }
    onBroadcast(event) { }

    getState() {
        return { ...this.#state };
    }

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

    #readGatewayAttributes(el) {
        const options = {};
        if (el.hasAttribute('data-gateway-placeholder')) options.placeholder = el.getAttribute('data-gateway-placeholder');
        // Add more if needed, but for simplicity, assume options are set in code
        return options;
    }

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

    removeChild(widget) {
        const idx = this.#children.indexOf(widget);
        if (idx === -1) return;
        this.#children.splice(idx, 1);
        widget.#parent = null;
        widget.destroy();
    }

    getChildren() {
        return [...this.#children];
    }

    getChildrenInSlot(slotName) {
        const slotEl = this.#slots.get(slotName);
        if (!slotEl) return [];
        return this.#children.filter(child => slotEl.contains(child.#element));
    }

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

    broadcast(type, detail = {}) {
        const event = new WidgetEvent(type, this, detail);
        this.#broadcastDown(event);
    }

    #broadcastDown(event) {
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

    #findSlotFor(child) {
        // For simplicity, assume default slot
        return this.#element;
    }

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

    getElement() {
        return this.#element;
    }

    applyStyle(property, value) {
        this.#element.style.setProperty(property, value);
    }

    applyStyles(map) {
        for (const [prop, val] of Object.entries(map)) {
            this.#element.style.setProperty(prop, val);
        }
    }

    removeStyle(property) {
        this.#element.style.removeProperty(property);
    }

    clearStyles() {
        this.#element.style.cssText = '';
    }

    addCSSClass(name) {
        this.#element.classList.add(name);
    }

    removeCSSClass(name) {
        this.#element.classList.remove(name);
    }

    toggleCSSClass(name, force) {
        this.#element.classList.toggle(name, force);
    }

    createGateway(name, type, options = {}) {
        const gw = new InputGateway(type, options);
        const el = this.#element.querySelector(`[data-gateway="${name}"]`);
        if (el) gw.mount(el);
        this.#gateways.set(name, gw);
        return gw;
    }

    getGateway(name) {
        return this.#gateways.get(name) ?? null;
    }

    destroyGateway(name) {
        const gw = this.#gateways.get(name);
        if (gw) {
            gw.destroy();
            this.#gateways.delete(name);
        }
    }

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