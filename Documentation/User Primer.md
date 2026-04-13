# Widget Framework - User Primer

A Getting-Started Guide for Application Developers

Difficulty: Intermediate | Estimated reading time: 25 minutes | April 2026

**Prerequisites**

• Comfortable with modern JavaScript (ES modules, classes, async/await)

• Basic HTML & CSS knowledge

• A local HTTP server (e.g., VS Code Live Server, npx serve) - ES modules require HTTP, not file://

• The Widget Framework files (the framework/ directory)

## Table of Contents

- **1\. What Is the Widget Framework?**
- **2\. Project Setup**
- 2.1 Directory Structure
- 2.2 Entry Point
- **3\. Your First Widget**
- 3.1 The HTML Fragment
- 3.2 The CSS File
- 3.3 The JavaScript Class
- 3.4 Register and Mount
- **4\. State Management**
- **5\. Binding System - Connecting State to the DOM**
- **6\. Handling User Input - InputGateway**
- **7\. Composing Widgets - Parents and Children**
- **8\. Events - Communicating Between Widgets**
- **9\. Lifecycle Hooks**
- **10\. CSS - Styling Your Widgets**
- **11\. Unmount vs. Destroy**
- **12\. Complete Worked Example - Counter Widget**
- **13\. File Naming Cheat Sheet**

# 1\. What Is the Widget Framework?

The Widget Framework is a class-based component system for building interactive web interfaces. If you've used React, Vue, or Lit, you'll feel right at home - but here the philosophy is simpler: you write standard JavaScript classes and HTML files. There's **no build step**, no JSX, no template compiler. Everything runs natively in the browser via ES modules.

Each component in the framework is called a **Widget**. A Widget is defined by exactly two files:

- **One JavaScript class** (e.g., SearchBar.js) that extends the base Widget class
- **One HTML fragment** (e.g., SearchBar.html) that contains the widget's markup

That's the whole contract. From those two files, your widget can:

- Manage its own state and update the DOM automatically when state changes
- Emit events upward to parent widgets
- Receive broadcasts from ancestor widgets
- Compose child widgets into named slots

Let's set up a project and build something.

# 2\. Project Setup

## 2.1 Directory Structure

Here's how a typical Widget Framework project is organized:

my-app/ ├── framework/ ← Framework files (don't modify these) │ ├── Framework.js │ ├── Widget.js │ ├── WidgetEvent.js │ ├── WidgetRegistry.js │ ├── InputGateway.js │ ├── BindingParser.js │ ├── CSSRewriter.js │ └── TemplateLoader.js │ ├── widgets/ ← Your widgets go here │ └── MyWidget/ │ ├── MyWidget.js │ ├── MyWidget.html │ └── MyWidget.MyWidget.css │ ├── styles/ │ └── global.css ← Global stylesheet │ ├── main.js ← Your app entry point └── index.html ← Host page

The framework/ directory is provided to you - treat it as read-only. All of your work happens in widgets/, main.js, and index.html.

## 2.2 Entry Point

Your index.html is minimal - just a mount target and a module script:

&lt;!-- index.html --&gt; &lt;!DOCTYPE html&gt; &lt;html&gt; &lt;head&gt;&lt;title&gt;My App&lt;/title&gt;&lt;/head&gt; &lt;body&gt; &lt;div id="app"&gt;&lt;/div&gt; &lt;script type="module" src="main.js"&gt;&lt;/script&gt; &lt;/body&gt; &lt;/html&gt;

Your main.js initializes the framework and mounts the root widget:

// main.js import { Framework } from './framework/Framework.js'; import { SearchBar } from './widgets/SearchBar/SearchBar.js'; import { ResultCard } from './widgets/ResultCard/ResultCard.js'; await Framework.init({ widgetRoot: '/widgets/', globalCSS: '/styles/global.css', widgets: \[SearchBar, ResultCard\] }); const app = new SearchBar({ query: '' }); app.mount(document.getElementById('app'));

Framework.init does three things: loads all widget templates and CSS, scopes the CSS so widgets don't conflict with each other, and registers everything in the internal registry. After init resolves, you create widget instances and mount them. That's it - you're running.

**Important**

Always await Framework.init() before creating any widgets. Templates and CSS aren't available until initialization completes.

# 3\. Your First Widget

Let's build a simple Greeting widget from scratch. You'll create three files - one HTML, one CSS, one JavaScript - and then wire them up.

## 3.1 The HTML Fragment

Create the file widgets/Greeting/Greeting.html:

&lt;!-- widgets/Greeting/Greeting.html --&gt; &lt;div class="greeting"&gt; &lt;h1 data-bind="text:message"&gt;&lt;/h1&gt; &lt;p data-bind="visible:showSubtitle"&gt;Welcome to Widget Framework&lt;/p&gt; &lt;button data-action="click:handleClick"&gt;Click me&lt;/button&gt; &lt;/div&gt;

Notice the two special attributes:

- data-bind="text:message" - tells the framework to set this element's text content to the value of the message state key
- data-action="click:handleClick" - wires the native click event to your widget's handleClick method

## 3.2 The CSS File

Create the file widgets/Greeting/Greeting.Greeting.css:

/\* widgets/Greeting/Greeting.Greeting.css \*/ :host { padding: 20px; font-family: sans-serif; } .greeting h1 { color: #333; } button { padding: 8px 16px; border: none; background: #0066cc; color: white; cursor: pointer; }

Use :host to style the widget's root element. All selectors are **automatically scoped** - your .greeting h1 will never leak into other widgets, and other widgets' styles won't bleed into yours.

## 3.3 The JavaScript Class

Create the file widgets/Greeting/Greeting.js:

// widgets/Greeting/Greeting.js import { Widget } from '../../framework/Widget.js'; export class Greeting extends Widget { static widgetName = 'Greeting'; static defaultState() { return { message: 'Hello, World!', showSubtitle: true }; } handleClick(domEvent) { this.setState({ message: 'You clicked!' }); } }

Three things every widget class needs:

- **Extend Widget** - this gives you state management, bindings, lifecycle hooks, and more
- **Set static widgetName** - must exactly match the directory and file name
- **Define static defaultState()** - returns the initial state object

## 3.4 Register and Mount

Update your main.js to register the Greeting widget and mount it:

// main.js import { Framework } from './framework/Framework.js'; import { Greeting } from './widgets/Greeting/Greeting.js'; await Framework.init({ widgetRoot: '/widgets/', widgets: \[Greeting\] }); const app = new Greeting(); app.mount(document.getElementById('app'));

That's a complete widget! When the user clicks the button, handleClick fires, setState updates the message, and the &lt;h1&gt; re-renders automatically. No manual DOM manipulation needed.

# 4\. State Management

State is at the heart of every widget. Here's how you define it, pass it, update it, and react to changes.

### Defining Default State

Override the static defaultState() method to declare initial values:

static defaultState() { return { count: 0, label: 'Items', isVisible: true }; }

### Passing Initial State

You can override any defaults at construction time:

const widget = new Counter({ count: 10, label: 'Products' });

Only the keys you pass are overridden - everything else falls back to defaultState().

### Updating State

Use setState(partial) to merge changes into the current state:

this.setState({ count: this.getState().count + 1 });

**Rules to Remember**

• **setState is synchronous** - the DOM updates immediately, right there in that line of code.

• **Only changed keys trigger DOM updates.** If you call setState({ count: 5 }) and count is already 5, nothing happens.

• **Comparison is strict equality (===).** For objects and arrays, pass a new reference to trigger an update.

• **There is no deep merge.** setState({ user: { name: 'A' } }) replaces the entire user object.

### Reading State

const current = this.getState(); // returns a shallow copy console.log(current.count);

getState() returns a **copy**. Mutating the returned object does nothing to the widget's actual state - you must use setState() to make changes.

### Reacting to State Changes

Override onStateChange to run logic after DOM updates:

onStateChange(changedKeys, previousState) { if (changedKeys.includes('count')) { console.log( 'Count changed from', previousState.count, 'to', this.getState().count ); } }

This hook fires _after_ the DOM has already been updated, so you can safely measure layout or trigger animations here.

# 5\. Binding System - Connecting State to the DOM

Bindings are the declarative glue between your state and your HTML. You write them as data-bind attributes - no manual querySelector or textContent assignments needed.

## 5.1 Binding Types

| **Type** | **Syntax**               | **What It Does**                    | **Example**                         |
| -------- | ------------------------ | ----------------------------------- | ----------------------------------- |
| text     | text:stateKey            | Sets textContent                    | data-bind="text:title"              |
| ---      | ---                      | ---                                 | ---                                 |
| html     | html:stateKey            | Sets innerHTML                      | data-bind="html:richContent"        |
| ---      | ---                      | ---                                 | ---                                 |
| visible  | visible:stateKey         | Toggles display:none                | data-bind="visible:isOpen"          |
| ---      | ---                      | ---                                 | ---                                 |
| attr     | attr:attrName=stateKey   | Sets/removes an HTML attribute      | data-bind="attr:href=profileUrl"    |
| ---      | ---                      | ---                                 | ---                                 |
| class    | class:className=stateKey | Toggles a CSS class                 | data-bind="class:active=isSelected" |
| ---      | ---                      | ---                                 | ---                                 |
| style    | style:cssProp=stateKey   | Sets/removes an inline CSS property | data-bind="style:color=textColor"   |
| ---      | ---                      | ---                                 | ---                                 |

## 5.2 Multiple Bindings

Separate multiple bindings with semicolons on a single element:

&lt;a data-bind="attr:href=url; text:linkLabel; class:disabled=isDisabled"&gt;&lt;/a&gt;

## 5.3 Action Bindings - Connecting DOM Events to Methods

Use data-action to wire native DOM events to your widget's methods:

&lt;button data-action="click:handleSave"&gt;Save&lt;/button&gt; &lt;div data-action="mouseenter:onHoverIn; mouseleave:onHoverOut"&gt;Hover me&lt;/div&gt;

Your method receives the native DOM event:

handleSave(domEvent) { domEvent.preventDefault(); // save logic here }

**Note**

If the named method doesn't exist at the time the event fires, it's silently skipped. This means you can conditionally define methods without worrying about errors.

# 6\. Handling User Input - InputGateway

The framework never lets you put raw &lt;input&gt; elements directly in your HTML fragments. Instead, all user input goes through **InputGateway** - a managed abstraction that gives you consistent value access, events, and validation across every input type.

## 6.1 Declarative (In HTML)

The simplest way - declare the gateway right in your template:

&lt;div data-gateway="username" data-gateway-type="text" data-gateway-placeholder="Enter name"&gt;&lt;/div&gt;

The framework creates the actual input element for you during construction. You never write &lt;input&gt; yourself.

## 6.2 Programmatic (In onInit)

For more control, declare a placeholder in HTML and create the gateway in code:

&lt;!-- In your .html file --&gt; &lt;div data-gateway="search"&gt;&lt;/div&gt;

// In your .js file onInit() { this.createGateway('search', 'search', { placeholder: 'Search...', attributes: { autocomplete: 'off' } }); }

## 6.3 Reading Values

const username = this.getGateway('username').getValue(); const isChecked = this.getGateway('agree').isChecked(); // checkbox/radio const files = this.getGateway('upload').getFiles(); // file input const selected = this.getGateway('country').getSelectedOptions(); // multi-select

## 6.4 Writing Values

this.getGateway('username').setValue('default_user'); this.getGateway('agree').setChecked(true); this.getGateway('country').setOptions(\[ { value: 'us', label: 'United States', selected: true }, { value: 'ca', label: 'Canada' } \]); this.getGateway('username').clear(); // reset to empty

**Tip**

Programmatic writes fire an 'update' event (not 'input' or 'change'), so you can always distinguish user action from code-driven updates.

## 6.5 Listening to Gateway Events

onInit() { this.getGateway('username').on('input', (e) => { // fires on every keystroke this.setState({ username: e.value }); }); this.getGateway('username').on('change', (e) => { // fires on blur (committed value) this.emit('usernameChanged', { username: e.value }); }); }

Every gateway event has the same shape, making event handling predictable:

{ gatewayName: 'username', gatewayType: 'text', type: 'input', value: 'current value', previousValue:'old value', source: 'user', // or 'program' for setValue/etc. timestamp: 1712952000000, nativeEvent: InputEvent // or null for programmatic writes }

## 6.6 Validation

this.getGateway('email').setValidator((value) => { const valid = value.includes('@'); return { valid, message: valid ? '' : 'Please enter a valid email' }; }); // Later, trigger validation: const result = this.getGateway('email').validate(); // result: { valid: true/false, message: '...', value: '...' }

## 6.7 Supported Input Types

InputGateway supports the following types: text, password, email, url, tel, search, number, range, date, time, datetime-local, color, checkbox, radio, file, textarea, and select.

# 7\. Composing Widgets - Parents and Children

Real applications aren't a single widget - they're trees of widgets. The framework makes composition straightforward with **named slots**.

## 7.1 Defining Slots

In your HTML, use data-widget to mark where children go:

&lt;!-- Dashboard.html --&gt; &lt;div class="dashboard"&gt; &lt;header data-widget="header"&gt;&lt;/header&gt; &lt;main data-widget="content"&gt;&lt;/main&gt; &lt;aside data-widget="sidebar"&gt;&lt;/aside&gt; &lt;/div&gt;

## 7.2 Adding Children

class Dashboard extends Widget { static widgetName = 'Dashboard'; onInit() { this.addChild(new NavBar(), 'header'); this.addChild(new MainContent(), 'content'); this.addChild(new Sidebar(), 'sidebar'); } }

Multiple children can share one slot - they're appended in order. If you call addChild without a slot name (or with 'default'), the child mounts directly inside the widget's root element.

## 7.3 Removing Children

this.removeChild(widget); // destroys the child

Removing a child **destroys** it. The parent owns its children. To move a widget to a new parent, just call addChild on the new parent - it handles the detachment automatically.

## 7.4 Accessing Children

const allChildren = this.getChildren(); // shallow copy of all children const sidebarKids = this.getChildrenInSlot('sidebar'); // just one slot

# 8\. Events - Communicating Between Widgets

Widgets communicate in two directions: **upward** (child to parent) via events, and **downward** (parent to all descendants) via broadcasts.

## 8.1 Upward Events (Child → Parent)

The child emits:

// Inside child widget: this.emit('itemSelected', { id: 42, name: 'Gadget' });

The parent subscribes (typically in onInit):

onInit() { const list = this.addChild(new ItemList(), 'content'); list.on('itemSelected', (event) => { this.setState({ selectedItem: event.detail }); }); }

**Important**

Events travel **exactly one hop**. There is no automatic bubbling. If the parent wants to relay the event further up, it must call this.emit() in its own handler.

## 8.2 Downward Events (Parent → All Descendants)

The parent broadcasts:

this.broadcast('themeChanged', { mode: 'dark' });

Any descendant handles it by defining a specially named method - on + the event type with a capital first letter:

// In any descendant widget: onThemeChanged(event) { this.applyStyles({ color: event.detail.mode === 'dark' ? '#fff' : '#000', backgroundColor: event.detail.mode === 'dark' ? '#222' : '#fff' }); }

You can also use the generic catch-all to handle every broadcast:

onBroadcast(event) { // catches ALL broadcasts, regardless of type }

**Note**

Broadcasts reach every descendant unconditionally. You cannot stop them.

# 9\. Lifecycle Hooks

Override these methods to hook into specific phases of a widget's life:

| **Hook**                         | **When It Fires**                                                                      | **Safe To Do**                                                       |
| -------------------------------- | -------------------------------------------------------------------------------------- | -------------------------------------------------------------------- |
| onInit()                         | After construction, before mount. Element exists but is **not** in the document.       | Create gateways, subscribe to events, add children, read/write state |
| ---                              | ---                                                                                    | ---                                                                  |
| onMount(parentElement)           | After the root element is inserted into the document DOM.                              | Measure layout, start animations, interact with live DOM             |
| ---                              | ---                                                                                    | ---                                                                  |
| onReady()                        | After this widget **and all descendants** are mounted. Children's onReady fires first. | Full subtree is live. Safe for anything.                             |
| ---                              | ---                                                                                    | ---                                                                  |
| onDestroy()                      | Before teardown begins. Widget is still fully functional.                              | Cleanup logic, save state, send notifications, log analytics         |
| ---                              | ---                                                                                    | ---                                                                  |
| onStateChange(changedKeys, prev) | After every setState that actually changes something.                                  | React to state transitions, trigger side effects                     |
| ---                              | ---                                                                                    | ---                                                                  |

All hooks fire exactly once per lifecycle phase - except onStateChange, which fires on every qualifying setState call.

**Tip - Choosing the Right Hook**

• Need to set up children and gateways? → onInit

• Need to measure element dimensions? → onMount

• Need everything in the subtree to be ready? → onReady

• Need to clean up timers or save data? → onDestroy

# 10\. CSS - Styling Your Widgets

## 10.1 Component CSS (Automatic Scoping)

Your CSS file (e.g., SearchBar.SearchBar.css) is automatically scoped by the framework. Every selector only matches elements inside your widget's own template. Two different widgets can both use .header without any collisions.

Use :host to style the root element itself:

:host { display: flex; border: 1px solid #ccc; } .title { font-weight: bold; } .content { padding: 16px; }

## 10.2 Instance Styling (Runtime Overrides)

You can manipulate styles and classes on the root element at runtime:

// Inline styles on the root element: this.applyStyle('backgroundColor', '#f0f0f0'); this.applyStyles({ color: 'red', fontSize: '14px' }); this.removeStyle('color'); this.clearStyles(); // remove ALL inline styles // CSS classes on the root element: this.addCSSClass('highlighted'); this.removeCSSClass('highlighted'); this.toggleCSSClass('active', isActive);

**Note**

Instance classes added via addCSSClass are **not** scoped - they're raw class names on the root element. Use them for theme variations, utility classes, or one-off overrides.

# 11\. Unmount vs. Destroy

These two methods sound similar but behave very differently:

| **Method** | **What It Does**                                                                                   | **Reversible?**                                       | **Use When**                                          |
| ---------- | -------------------------------------------------------------------------------------------------- | ----------------------------------------------------- | ----------------------------------------------------- |
| unmount()  | Removes the widget from the DOM but keeps everything alive - state, children, listeners, gateways. | **Yes** - call mount() again later.                   | Show/hide patterns, tab switching, temporary removal. |
| ---        | ---                                                                                                | ---                                                   | ---                                                   |
| destroy()  | Permanent teardown. Recursively destroys all children, gateways, listeners, and DOM.               | **No** - the widget cannot be used after destruction. | Widget is truly done and won't come back.             |
| ---        | ---                                                                                                | ---                                                   | ---                                                   |

**Rule of thumb:** use unmount for things that might come back. Use destroy when you're finished for good.

# 12\. Complete Worked Example - Counter Widget

Let's pull everything together into a single, fully-featured widget that uses state, bindings, gateways, events, broadcasts, and composition.

## HTML - Counter.html

&lt;div class="counter"&gt; &lt;span class="label" data-bind="text:label"&gt;&lt;/span&gt; &lt;span class="value" data-bind="text:count"&gt;&lt;/span&gt; &lt;div data-gateway="amount" data-gateway-type="number"&gt;&lt;/div&gt; &lt;button data-action="click:handleIncrement"&gt;+&lt;/button&gt; &lt;button data-action="click:handleDecrement"&gt;-&lt;/button&gt; &lt;div data-widget="extras"&gt;&lt;/div&gt; &lt;/div&gt;

## CSS - Counter.Counter.css

:host { display: flex; align-items: center; gap: 8px; } .label { font-weight: bold; } .value { font-size: 1.5rem; min-width: 3ch; text-align: center; } button { padding: 4px 12px; cursor: pointer; }

## JavaScript - Counter.js

import { Widget } from '../../framework/Widget.js'; export class Counter extends Widget { static widgetName = 'Counter'; static defaultState() { return { label: 'Count:', count: 0 }; } onInit() { // Set the default step amount in the number gateway this.getGateway('amount').setValue(1); } handleIncrement() { const step = this.getGateway('amount').getValue() ?? 1; this.setState({ count: this.getState().count + step }); this.emit('countChanged', { count: this.getState().count }); } handleDecrement() { const step = this.getGateway('amount').getValue() ?? 1; this.setState({ count: this.getState().count - step }); this.emit('countChanged', { count: this.getState().count }); } // Respond to a broadcast from any ancestor onThemeChanged(event) { if (event.detail.mode === 'dark') { this.applyStyles({ color: '#fff', backgroundColor: '#333' }); } else { this.clearStyles(); } } }

This single widget demonstrates:

- **State** - label and count with defaults
- **Bindings** - data-bind="text:label" and data-bind="text:count"
- **Actions** - data-action="click:handleIncrement"
- **Gateway** - a number input for the step amount
- **Upward events** - this.emit('countChanged', ...)
- **Broadcast handling** - onThemeChanged
- **Slot** - data-widget="extras" for child widgets

# 13\. File Naming Cheat Sheet

Getting names right matters - the framework uses naming conventions to auto-discover templates and CSS. Here's the complete reference:

| **What**          | **Naming Rule**                    | **Example**         |
| ----------------- | ---------------------------------- | ------------------- |
| Widget directory  | WidgetName/                        | Counter/            |
| ---               | ---                                | ---                 |
| JavaScript file   | WidgetName.js                      | Counter.js          |
| ---               | ---                                | ---                 |
| HTML file         | WidgetName.html                    | Counter.html        |
| ---               | ---                                | ---                 |
| CSS file          | WidgetName.WidgetName.css          | Counter.Counter.css |
| ---               | ---                                | ---                 |
| static widgetName | Must match directory and file name | 'Counter'           |
| ---               | ---                                | ---                 |

**Common Mistake**

The CSS file name uses a double-name pattern: Counter.Counter.css, not Counter.css. If your styles aren't loading, check this first!

# Summary & Next Steps

You now know everything you need to start building with the Widget Framework. Here's a quick recap of the core concepts:

| **Concept**        | **Key API**                                      |
| ------------------ | ------------------------------------------------ |
| Define state       | static defaultState()                            |
| ---                | ---                                              |
| Update state       | this.setState(partial)                           |
| ---                | ---                                              |
| Read state         | this.getState()                                  |
| ---                | ---                                              |
| Bind state to DOM  | data-bind="type:key"                             |
| ---                | ---                                              |
| Handle DOM events  | data-action="event:method"                       |
| ---                | ---                                              |
| Collect user input | data-gateway + this.getGateway(name)             |
| ---                | ---                                              |
| Compose children   | data-widget="slot" + this.addChild(widget, slot) |
| ---                | ---                                              |
| Events up          | this.emit(type, detail) + widget.on(type, fn)    |
| ---                | ---                                              |
| Broadcasts down    | this.broadcast(type, detail) + onType(event)     |
| ---                | ---                                              |
| Lifecycle          | onInit, onMount, onReady, onDestroy              |
| ---                | ---                                              |

Start with a single widget, get it rendering and responding to clicks, then layer on children, events, and gateways as your app grows. Happy building!