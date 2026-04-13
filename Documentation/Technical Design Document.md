# Widget Framework

Technical Design Document

**Version:** 1.0 | **Date:** April 12, 2026

**Author:** Adrian

**Status:** Internal Reference | **Category:** Technical Architecture

**Companion Document:** Widget Framework - Functional Design Document

**About This Document**

This Technical Design Document covers the **how** - algorithms, data structures, and internal implementation details of the Widget Framework. It is the companion to the Functional Design Document, which covers the **what** and **why**. All modules use ES module import/export with ES2022 private fields.

# Table of Contents

- 1\. Architecture Overview
- 2\. Widget Internal Data Structures
- 3\. Construction Sequence (Detailed)
- 4\. Binding Parser Implementation
- 4.1 parseBindings(str)
- 4.2 parseActions(str)
- 5\. Full Binding Scan (#parseAllBindings)
- 6\. State Update & DOM Write Algorithm
- 6.1 setState Implementation
- 6.2 #updateBindings Implementation
- 6.3 #applyBinding Implementation
- 7\. Event System Internals
- 7.1 WidgetEvent Class
- 7.2 Upward Event Implementation (emit/on/off)
- 7.3 Downward Broadcast Implementation
- 8\. Ready Check Algorithm
- 9\. Mount / Unmount / Destroy Implementation
- 9.1 mount
- 9.2 unmount
- 9.3 destroy
- 10\. Child Management Implementation
- 10.1 addChild
- 10.2 removeChild
- 11\. CSS Rewriting Pipeline
- 11.1 Selector Rewrite Rules
- 11.2 CSSRewriter Implementation
- 11.3 HTML Fragment Rewriting (TemplateLoader)
- 12\. CSS Injection
- 13\. Framework Bootstrap (Framework.init)
- 14\. WidgetRegistry Implementation
- 15\. State Matrix

# 1\. Architecture Overview

The framework consists of 8 internal modules, all under the framework/ directory:

| **Module**         | **File**          | **Responsibility**                                                            |
| ------------------ | ----------------- | ----------------------------------------------------------------------------- |
| **Framework**      | Framework.js      | Bootstrap, global CSS loading, widget registration loop                       |
| ---                | ---               | ---                                                                           |
| **Widget**         | Widget.js         | Base class for all widgets - state, lifecycle, bindings, events, children     |
| ---                | ---               | ---                                                                           |
| **WidgetEvent**    | WidgetEvent.js    | Immutable event value object used by both upward and downward events          |
| ---                | ---               | ---                                                                           |
| **WidgetRegistry** | WidgetRegistry.js | Template, CSS, and class cache. Singleton.                                    |
| ---                | ---               | ---                                                                           |
| **InputGateway**   | InputGateway.js   | Per-instance wrapper for native input elements                                |
| ---                | ---               | ---                                                                           |
| **BindingParser**  | BindingParser.js  | Static utility - parses data-bind and data-action attribute strings           |
| ---                | ---               | ---                                                                           |
| **CSSRewriter**    | CSSRewriter.js    | Static utility - rewrites CSS selectors to append scope class                 |
| ---                | ---               | ---                                                                           |
| **TemplateLoader** | TemplateLoader.js | Fetches HTML, parses into DocumentFragment, adds scope class to every element |
| ---                | ---               | ---                                                                           |

All modules use ES module import/export. No module has circular dependencies.

**Dependency graph** (A → B means A imports B):

- **Framework** → WidgetRegistry, TemplateLoader, CSSRewriter
- **Widget** → WidgetRegistry, WidgetEvent, BindingParser, InputGateway
- **WidgetEvent** → (none)
- **WidgetRegistry** → (none)
- **InputGateway** → (none)
- **BindingParser** → (none)
- **CSSRewriter** → (none)
- **TemplateLoader** → (none)

# 2\. Widget Internal Data Structures

All internal bookkeeping uses #private fields (ES2022). These are never part of the public contract.

**Private fields on every Widget instance:**

# state - Object: current state (flat key-value) #element - HTMLElement: root element cloned from template #children - Widget\[\]: ordered child list #parent - Widget | null: reference to parent widget #mounted - boolean: whether element is in the document DOM #ready - boolean: whether self + all descendants are mounted #destroyed - boolean: whether destroy() has been called #bindings - Map&lt;string, Binding\[\]&gt;: stateKey → array of binding descriptors #listeners - Map&lt;string, Function\[\]&gt;: event type → array of subscriber functions #gateways - Map&lt;string, InputGateway&gt;: gateway name → InputGateway instance #slots - Map&lt;string, HTMLElement&gt;: slot name → mount-point element #actionCleanups - Array&lt;{ element, event, handler }&gt;: for teardown of DOM listeners

A **Binding descriptor** is a plain object:

{ element: HTMLElement, type: string, target: string|null }

Where type is one of: 'text', 'html', 'visible', 'attr', 'class', 'style'.

And target is the attribute name, class name, or CSS property name (null for text/html/visible).

# 3\. Construction Sequence (Detailed)

When new MyWidget(initialState) is called, the Widget constructor executes these steps synchronously:

constructor(initialState = {}) { // 1. Merge default state with initial state this.#state = { ...this.constructor.defaultState(), ...initialState }; // 2. Clone the registered HTML template this.#element = WidgetRegistry.getTemplate(this.constructor.widgetName); // getTemplate returns documentFragment.cloneNode(true), then extracts firstElementChild // 3. Add scope CSS class to root element this.#element.classList.add(this.constructor.widgetName); // 4. Initialize all collections this.#children = \[\]; this.#parent = null; this.#mounted = false; this.#ready = false; this.#destroyed = false; this.#bindings = new Map(); this.#listeners = new Map(); this.#gateways = new Map(); this.#slots = new Map(); this.#actionCleanups = \[\]; // 5. Parse all bindings (full scan - see Section 4) this.#parseAllBindings(); // 6. Apply initial state to all bindings this.#updateBindings(Object.keys(this.#state)); // 7. Call lifecycle hook this.onInit(); }

# 4\. Binding Parser Implementation

BindingParser is a static utility class with no instances. All methods are pure functions.

## 4.1 parseBindings(str)

**Input:** the value of a data-bind attribute, e.g. "text:title; class:active=isActive; attr:href=url"

**Output:** array of binding descriptor objects.

**Algorithm:**

- Split on semicolons.
- Trim and discard empty segments.
- For each segment, find the first colon - everything before is the type, everything after is the rest.
- If the type is 'attr', 'class', or 'style', find the equals sign in the rest - left side is the target, right side is the stateKey.
- Otherwise (text, html, visible), the rest is the stateKey and target is null.

static parseBindings(str) { return str.split(';') .map(s => s.trim()) .filter(Boolean) .map(segment => { const colonIdx = segment.indexOf(':'); const type = segment.slice(0, colonIdx).trim(); const rest = segment.slice(colonIdx + 1).trim(); if (type === 'attr' || type === 'class' || type === 'style') { const eqIdx = rest.indexOf('='); return { type, target: rest.slice(0, eqIdx).trim(), stateKey: rest.slice(eqIdx + 1).trim() }; } return { type, target: null, stateKey: rest }; }); }

## 4.2 parseActions(str)

**Input:** the value of a data-action attribute, e.g. "click:handleSave; mouseenter:onHover"

**Output:** array of { domEvent, method } objects.

static parseActions(str) { return str.split(';') .map(s => s.trim()) .filter(Boolean) .map(segment => { const colonIdx = segment.indexOf(':'); return { domEvent: segment.slice(0, colonIdx).trim(), method: segment.slice(colonIdx + 1).trim() }; }); }

# 5\. Full Binding Scan (#parseAllBindings)

During construction, the widget scans its cloned template in a single pass per attribute type. This method uses querySelectorAll with attribute selectors.

# parseAllBindings() { // data-bind: build the #bindings map for (const el of this.#element.querySelectorAll('\[data-bind\]')) { for (const b of BindingParser.parseBindings(el.getAttribute('data-bind'))) { const entry = { element: el, type: b.type, target: b.target }; if (!this.#bindings.has(b.stateKey)) { this.#bindings.set(b.stateKey, \[\]); } this.#bindings.get(b.stateKey).push(entry); } } // data-action: attach DOM listeners and store cleanup references for (const el of this.#element.querySelectorAll('\[data-action\]')) { for (const a of BindingParser.parseActions(el.getAttribute('data-action'))) { const handler = (e) => { if (typeof this\[a.method\] === 'function') this\[a.method\](e); }; el.addEventListener(a.domEvent, handler); this.#actionCleanups.push({ element: el, event: a.domEvent, handler }); } } // data-gateway: create InputGateway instances or register placeholders for (const el of this.#element.querySelectorAll('\[data-gateway\]')) { const name = el.getAttribute('data-gateway'); const type = el.getAttribute('data-gateway-type'); if (type) { const options = this.#readGatewayAttributes(el); const gw = new InputGateway(type, options); gw.mount(el); this.#gateways.set(name, gw); } else { this.#gateways.set(name, null); // placeholder for programmatic creation } } // data-widget: register named slots for (const el of this.#element.querySelectorAll('\[data-widget\]')) { this.#slots.set(el.getAttribute('data-widget'), el); } }

# 6\. State Update & DOM Write Algorithm

## 6.1 setState Implementation

setState(partial) { if (this.#destroyed) return; const prev = { ...this.#state }; const changed = \[\]; for (const key of Object.keys(partial)) { if (this.#state\[key\] !== partial\[key\]) { // strict inequality this.#state\[key\] = partial\[key\]; changed.push(key); } } if (changed.length === 0) return; // no actual changes this.#updateBindings(changed); // targeted DOM writes this.onStateChange(changed, prev); // subclass hook }

## 6.2 #updateBindings Implementation

# updateBindings(changedKeys) { for (const key of changedKeys) { const bindings = this.#bindings.get(key); if (!bindings) continue; const value = this.#state\[key\]; for (const binding of bindings) { this.#applyBinding(binding, value); } } }

## 6.3 #applyBinding Implementation

# applyBinding(binding, value) { const el = binding.element; switch (binding.type) { case 'text': el.textContent = value ?? ''; break; case 'html': el.innerHTML = value ?? ''; break; case 'visible': el.style.display = value ? '' : 'none'; break; case 'attr': if (value == null || value === false) { el.removeAttribute(binding.target); } else if (value === true) { el.setAttribute(binding.target, ''); } else { el.setAttribute(binding.target, String(value)); } break; case 'class': el.classList.toggle(binding.target, !!value); break; case 'style': if (value == null) { el.style.removeProperty(binding.target); } else { el.style.setProperty(binding.target, String(value)); } break; } }

# 7\. Event System Internals

## 7.1 WidgetEvent Class

class WidgetEvent { #stopped; constructor(type, source, detail = {}) { this.type = type; this.source = source; this.currentTarget = source; this.detail = detail; this.timestamp = Date.now(); this.#stopped = false; } stopPropagation() { this.#stopped = true; } get propagationStopped() { return this.#stopped; } }

## 7.2 Upward Event Implementation (emit/on/off)

emit(type, detail = {}) { const event = new WidgetEvent(type, this, detail); const handlers = this.#listeners.get(type); if (!handlers) return; for (const fn of \[...handlers\]) { // copy to allow off() during iteration event.currentTarget = this; fn(event); if (event.propagationStopped) break; } } on(type, handler) { if (!this.#listeners.has(type)) this.#listeners.set(type, \[\]); this.#listeners.get(type).push(handler); } off(type, handler) { const list = this.#listeners.get(type); if (!list) return; const idx = list.indexOf(handler); if (idx !== -1) list.splice(idx, 1); }

## 7.3 Downward Broadcast Implementation

broadcast(type, detail = {}) { const event = new WidgetEvent(type, this, detail); this.#broadcastDown(event); } #broadcastDown(event) { const handlerName = 'on' + event.type\[0\].toUpperCase() + event.type.slice(1); for (const child of this.#children) { event.currentTarget = child; if (typeof child\[handlerName\] === 'function') { child\[handlerName\](event); } child.onBroadcast(event); // always called, even if named handler exists child.#broadcastDown(event); // always recurse into grandchildren } }

**Named handler convention:** for an event with type 'themeChanged', the framework computes the method name 'onThemeChanged' and checks whether the child has it.

# 8\. Ready Check Algorithm

# checkReady() { if (this.#ready) return; for (const child of this.#children) { if (!child.#ready) return; // at least one child not ready } this.#ready = true; this.onReady(); if (this.#parent) { this.#parent.#checkReady(); // cascade upward } }

# checkReady is called:

- At the end of mount(), after children have been mounted.
- Inside addChild(), after the child is mounted (to re-evaluate the parent).

This means ready propagates **bottom-up**: leaves become ready first, then their parents, up to the root.

# 9\. Mount / Unmount / Destroy Implementation

## 9.1 mount

mount(parentElement, anchor = null) { if (this.#mounted || this.#destroyed) return; parentElement.insertBefore(this.#element, anchor); this.#mounted = true; this.onMount(parentElement); // Mount queued children for (const child of this.#children) { if (!child.#mounted) { const slot = this.#findSlotFor(child) ?? this.#element; child.mount(slot); } } this.#checkReady(); }

## 9.2 unmount

unmount() { if (!this.#mounted) return; for (const child of this.#children) { child.unmount(); } if (this.#element.parentNode) { this.#element.parentNode.removeChild(this.#element); } this.#mounted = false; this.#ready = false; }

## 9.3 destroy

destroy() { if (this.#destroyed) return; this.onDestroy(); // fires while widget is still fully functional // Destroy children depth-first (copy array to avoid mutation during iteration) for (const child of \[...this.#children\]) { child.destroy(); } // Destroy gateways for (const \[name, gw\] of this.#gateways) { if (gw) gw.destroy(); } // Remove DOM listeners for (const { element, event, handler } of this.#actionCleanups) { element.removeEventListener(event, handler); } // Clear subscriptions this.#listeners.clear(); // Remove from DOM if (this.#element.parentNode) { this.#element.parentNode.removeChild(this.#element); } this.#mounted = false; this.#destroyed = true; // Detach from parent if (this.#parent) { const idx = this.#parent.#children.indexOf(this); if (idx !== -1) this.#parent.#children.splice(idx, 1); this.#parent = null; } }

# 10\. Child Management Implementation

## 10.1 addChild

addChild(widget, slotName = 'default') { if (this.#children.includes(widget)) return widget; if (widget.#parent) { widget.#parent.removeChild(widget); } widget.#parent = this; this.#children.push(widget); const container = this.#slots.get(slotName) ?? this.#element; if (this.#mounted) { widget.mount(container); this.#checkReady(); } return widget; }

## 10.2 removeChild

removeChild(widget) { const idx = this.#children.indexOf(widget); if (idx === -1) return; this.#children.splice(idx, 1); widget.#parent = null; widget.destroy(); }

**Ownership Rule**

removeChild always destroys the child. The parent owns its children.

# 11\. CSS Rewriting Pipeline

## 11.1 Selector Rewrite Rules

For a widget named SearchBar, the scope class is .SearchBar.

| **Input Selector** | **Output Selector**                | **Logic**                                   |
| ------------------ | ---------------------------------- | ------------------------------------------- |
| .header            | .header.SearchBar                  | Append scope class to single class selector |
| ---                | ---                                | ---                                         |
| .header .title     | .header.SearchBar .title.SearchBar | Append to every compound segment            |
| ---                | ---                                | ---                                         |
| p                  | p.SearchBar                        | Append to element selector                  |
| ---                | ---                                | ---                                         |
| .a > .b            | .a.SearchBar > .b.SearchBar        | Append to each side of child combinator     |
| ---                | ---                                | ---                                         |
| .a + .b            | .a.SearchBar + .b.SearchBar        | Adjacent sibling - same                     |
| ---                | ---                                | ---                                         |
| .a ~ .b            | .a.SearchBar ~ .b.SearchBar        | General sibling - same                      |
| ---                | ---                                | ---                                         |
| .a.b               | .a.b.SearchBar                     | Compound selector - append once at end      |
| ---                | ---                                | ---                                         |
| :host              | .SearchBar                         | Maps to bare scope class                    |
| ---                | ---                                | ---                                         |
| \*                 | \*.SearchBar                       | Universal - append scope class              |
| ---                | ---                                | ---                                         |

**Exemptions:** @keyframes rule bodies, @font-face. @media outer rules are processed (inner selectors rewritten, condition untouched).

## 11.2 CSSRewriter Implementation

class CSSRewriter { static rewrite(cssText, widgetName) { const scope = '.' + widgetName; const sheet = new CSSStyleSheet(); sheet.replaceSync(cssText); let output = ''; for (const rule of sheet.cssRules) { output += this.#rewriteRule(rule, scope); } return output; } static #rewriteRule(rule, scope) { if (rule instanceof CSSStyleRule) { const newSelector = this.#rewriteSelector(rule.selectorText, scope); return newSelector + ' { ' + rule.style.cssText + ' }\\n'; } if (rule instanceof CSSMediaRule) { let inner = ''; for (const child of rule.cssRules) { inner += this.#rewriteRule(child, scope); } return '@media ' + rule.conditionText + ' {\\n' + inner + '}\\n'; } return rule.cssText + '\\n'; // @keyframes, @font-face pass through } static #rewriteSelector(selectorText, scope) { return selectorText.split(',').map(sel => { sel = sel.trim(); if (sel === ':host') return scope; const parts = sel.split(/(\\s\*\[>+~\]\\s\*|\\s+)/); return parts.map(part => { part = part.trim(); if (!part || /^\[>+~\]\$/.test(part)) return part ? ' ' + part + ' ' : ' '; return part + scope; }).join(''); }).join(', '); } }

## 11.3 HTML Fragment Rewriting (TemplateLoader)

class TemplateLoader { static rewriteFragment(fragment, widgetName) { const walker = document.createTreeWalker(fragment, NodeFilter.SHOW_ELEMENT); let node = walker.currentNode; while (node) { if (node.nodeType === Node.ELEMENT_NODE) { node.classList.add(widgetName); } node = walker.nextNode(); } } }

# 12\. CSS Injection

Rewritten CSS is injected as a &lt;style&gt; element in document.head during widget registration. One style element per widget class, regardless of instance count. Each carries data-widget-css="WidgetName" for debugging.

# 13\. Framework Bootstrap (Framework.init)

class Framework { static async init(config) { // config shape: // { widgetRoot: '/widgets/', globalCSS: '/styles/global.css', widgets: \[SearchBar, ResultCard\] } // 1. Load global CSS if (config.globalCSS) { const css = await fetch(config.globalCSS).then(r => r.text()); const style = document.createElement('style'); style.setAttribute('data-widget-css', 'global'); style.textContent = css; document.head.appendChild(style); } // 2. Register each widget class for (const WidgetClass of config.widgets) { const name = WidgetClass.widgetName; if (!name) throw new Error('Widget class missing static widgetName.'); const base = config.widgetRoot + name + '/' + name; // 2a. Fetch and parse HTML template const htmlText = await fetch(base + '.html').then(r => r.text()); const templateEl = document.createElement('template'); templateEl.innerHTML = htmlText.trim(); const fragment = templateEl.content; // 2b. Rewrite HTML fragment (add scope class to every element) TemplateLoader.rewriteFragment(fragment, name); // 2c. Fetch and rewrite CSS const cssText = await fetch(base + '.' + name + '.css').then(r => r.text()); const scopedCSS = CSSRewriter.rewrite(cssText, name); // 2d. Inject scoped CSS into head const style = document.createElement('style'); style.setAttribute('data-widget-css', name); style.textContent = scopedCSS; document.head.appendChild(style); // 2e. Register in WidgetRegistry WidgetRegistry.register(name, fragment, scopedCSS, WidgetClass); } } }

# 14\. WidgetRegistry Implementation

class WidgetRegistry { static #entries = new Map(); static register(widgetName, template, css, WidgetClass) { this.#entries.set(widgetName, { template, css, WidgetClass }); } static getTemplate(widgetName) { const entry = this.#entries.get(widgetName); if (!entry) throw new Error('Widget "' + widgetName + '" is not registered.'); return entry.template.cloneNode(true); } static getClass(widgetName) { return this.#entries.get(widgetName)?.WidgetClass ?? null; } static has(widgetName) { return this.#entries.has(widgetName); } }

# 15\. State Matrix

The following table shows what operations are valid in each widget state:

| **Widget State**       | **#mounted** | **#destroyed** | **Can mount?** | **Can setState?** | **Can destroy?** | **Can addChild?** |
| ---------------------- | ------------ | -------------- | -------------- | ----------------- | ---------------- | ----------------- |
| **After construction** | false        | false          | Yes            | Yes               | Yes              | Yes               |
| ---                    | ---          | ---            | ---            | ---               | ---              | ---               |
| **After mount**        | true         | false          | No (no-op)     | Yes               | Yes              | Yes               |
| ---                    | ---          | ---            | ---            | ---               | ---              | ---               |
| **After unmount**      | false        | false          | Yes            | Yes               | Yes              | Yes               |
| ---                    | ---          | ---            | ---            | ---               | ---              | ---               |
| **After destroy**      | false        | true           | No (no-op)     | No (silent no-op) | No (no-op)       | No                |
| ---                    | ---          | ---            | ---            | ---               | ---              | ---               |

**Key Invariant**

A destroyed widget is permanently inert. All method calls on a destroyed widget are silent no-ops - they never throw. This guarantees safe teardown regardless of call order.