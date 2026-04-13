# Widget Framework

Functional Design Document

Version 1.0 | April 12, 2026

Category: Technical Specification | Status: Reference

**Table of Contents**

- 1\. Introduction
- 2\. Design Priorities
- 3\. Core Concepts
  - 3.1 Widget
  - 3.2 InputGateway
  - 3.3 WidgetEvent
- 4\. Data Flow Model
  - 4.1 Upward Events (Child to Parent)
  - 4.2 Downward Events (Parent to Descendants)
  - 4.3 State Updates
- 5\. Lifecycle Model
  - 5.1 Construction / Init
  - 5.2 Mount
  - 5.3 Ready
  - 5.4 Destroy
  - 5.5 Unmount (Non-Destructive Removal)
- 6\. Binding System
  - 6.1 data-bind (State to DOM)
  - 6.2 data-action (DOM Events to Methods)
  - 6.3 data-gateway (InputGateway Mount Points)
  - 6.4 data-widget (Child Slots)
- 7\. CSS Architecture
  - 7.1 Global CSS
  - 7.2 Component CSS
  - 7.3 Instance CSS
- 8\. Child Composition
- 9\. InputGateway Capabilities
- 10\. File Conventions
- 11\. Design Decisions Log

# 1\. Introduction

The Widget Framework is a class-based component system for building interactive web interfaces using standard JavaScript and HTML. Its fundamental building block is the **Widget**: one JavaScript class paired with one HTML fragment file. Widgets own their state, lifecycle, DOM bindings, event emission, and child composition.

The framework targets the subset of object-oriented JavaScript widely supported by Chrome, Firefox, Safari, and Edge as of April 2026. Specifically, the following ES2022+ language features are assumed to be available:

- ES2022 classes and static fields
- #private fields
- async/await
- ES modules
- Map, Set, WeakMap, WeakSet
- Optional chaining (?.) and nullish coalescing (??)
- structuredClone
- queueMicrotask

The framework **explicitly avoids** the following language features and patterns:

- **Decorators** - not yet universally stable across all target browsers.
- **Proxy-based reactivity** - introduces hidden interception layers that complicate debugging.
- **Getter/setter interception on state or DOM properties** (termed "no property hijacking") - what you read is what was written; no magic transforms.
- **Synthetic event dispatch** (new Event / dispatchEvent) for framework-internal communication - the framework uses its own plain-object event system instead.

# 2\. Design Priorities

Three priorities govern all decisions in the Widget Framework. They are ranked in strict order; when two priorities conflict, the lower-numbered priority wins and the higher-numbered priority yields.

| **Rank** | **Priority**                    | **Description**                                                                                                                     |
| -------- | ------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------- |
| **1**    | Ease of use by the developer    | Small API surface, declarative bindings, convention-driven file layout, predictable synchronous updates.                            |
| ---      | ---                             | ---                                                                                                                                 |
| **2**    | Ease of subsequent modification | Clear separation of concerns, override-friendly lifecycle hooks, explicit data flow with no hidden magic.                           |
| ---      | ---                             | ---                                                                                                                                 |
| **3**    | Performance                     | Targeted DOM writes keyed to changed state properties, no virtual DOM diffing, no digest cycles, no unnecessary abstraction layers. |
| ---      | ---                             | ---                                                                                                                                 |

**Example of Priority Resolution**

Synchronous state updates (Priority 1: predictability) are chosen over batched updates (Priority 3: throughput). The developer always sees the immediate DOM effect of a setState call, even though batching could reduce total DOM writes.

# 3\. Core Concepts

## 3.1 Widget

The Widget is the fundamental building block of the framework. Each Widget is defined by exactly one JavaScript class and one paired HTML fragment file. A Widget manages six responsibilities:

- **Internal state** - a flat key-value object holding the widget's current data.
- **Lifecycle** - four ordered phases: init, mount, ready, and destroy.
- **DOM bindings** - declarative _data-bind_ attributes connecting state keys to DOM properties.
- **Event emission** - upward events to parents and downward broadcasts to descendants.
- **Child composition** - an ordered list of child Widgets mounted into named slots.
- **Instance-level CSS** - inline styles and ad-hoc CSS classes applied at runtime.

A Widget's root element receives the widget's class name as a CSS class. This class name is used for CSS scoping, ensuring that component styles do not leak into or collide with other widgets.

## 3.2 InputGateway

The framework never interacts directly with native input elements. All user-modifiable HTML is created and managed through **InputGateway**. InputGateway is a per-instance wrapper that performs the following functions:

- Creates the native input element (input, textarea, or select).
- Attaches native DOM listeners.
- Normalizes native events into a consistent framework event shape.
- Forwards reads and writes for both user interaction and programmatic modification.
- Emits six unified framework events: **input** (every keystroke/drag), **change** (committed value change), **update** (programmatic write), **focus**, **blur**, and **validate**.

No property hijacking or synthetic event systems are used. InputGateway listens to real DOM events and re-emits plain objects.

## 3.3 WidgetEvent

All framework events - both upward and downward - use a single value object called **WidgetEvent**. It carries the following properties:

| **Property**          | **Description**                                                                                  |
| --------------------- | ------------------------------------------------------------------------------------------------ |
| **type**              | The event name (string).                                                                         |
| ---                   | ---                                                                                              |
| **source**            | The Widget that created the event. This value never changes as the event moves through the tree. |
| ---                   | ---                                                                                              |
| **currentTarget**     | The Widget currently handling the event. Updated by the framework at each hop.                   |
| ---                   | ---                                                                                              |
| **detail**            | Arbitrary payload object provided by the emitter.                                                |
| ---                   | ---                                                                                              |
| **timestamp**         | Milliseconds since epoch at the time the event was created.                                      |
| ---                   | ---                                                                                              |
| **stopPropagation()** | Method that prevents remaining subscribers from being called. Effective only for upward events.  |
| ---                   | ---                                                                                              |

# 4\. Data Flow Model

## 4.1 Upward Events (Child to Parent)

Upward events propagate via explicit subscription. A parent subscribes to a child's events using **child.on(type, handler)**. The child emits events using **this.emit(type, detail)**.

The following rules govern upward event propagation:

- Events travel exactly **one hop** - from the emitting widget to its direct subscribers.
- There is **no automatic bubbling**. If the parent wants to relay an event further up, it must explicitly call this.emit() in its handler.
- Subscribers are called in **registration order**.
- Any subscriber may call **event.stopPropagation()** to prevent remaining subscribers from being called.

This design gives every level of the tree full control over whether, when, and how an event propagates further. There is no implicit coupling between distant ancestors and deeply nested children.

## 4.2 Downward Events (Parent to Descendants)

Downward events propagate automatically via broadcast. A parent calls **this.broadcast(type, detail)**, and the framework walks the entire subtree depth-first.

The following rules govern downward event propagation:

- Broadcast is **unconditional** - every descendant receives the event regardless of whether an ancestor handled it.
- **stopPropagation() has no effect** on broadcasts.
- Descendants handle broadcast events by defining a named handler method (convention: _onTypeName_) or by overriding the generic **onBroadcast(event)** catch-all.
- Typical uses include configuration changes, theme switches, locale changes, and global commands.

## 4.3 State Updates

The state update mechanism is the primary way a widget's DOM representation changes over time. The following rules define its behavior:

- **setState(partial)** merges the partial object into the widget's state using strict inequality comparison (===).
- Only changed keys trigger DOM updates.
- Updates are **synchronous** - each setState call immediately writes to the DOM. There is no batching and no microtask deferral.
- The framework only updates DOM bindings whose stateKey matches a changed key. All other DOM nodes are untouched.
- After DOM updates complete, the **onStateChange(changedKeys, previousState)** hook fires.
- **getState()** always returns a shallow copy. Direct mutation of the returned object has no effect on the widget's actual state.

# 5\. Lifecycle Model

Every Widget passes through four ordered lifecycle phases. The following subsections describe each phase, its trigger, and the operations that occur within it.

## 5.1 Construction / Init

**Triggered by:** new Widget(initialState)

During construction, the following operations occur in order:

- State is initialized by merging the class's **defaultState()** with the provided initialState.
- The HTML template is cloned from the registry.
- The scope CSS class is added to the root element.
- All _data-bind_, _data-action_, _data-gateway_, and _data-widget_ attributes are parsed.
- Initial state values are applied to all bindings (initial render).
- **onInit()** fires.

**Init Phase Context**

At the time onInit() fires, the widget has a fully parsed element tree with state applied. However, the element is **not** in the document DOM. It is safe to create gateways, subscribe to gateway events, and add children during this phase.

## 5.2 Mount

**Triggered by:** widget.mount(parentElement, anchor)

During the mount phase, the following operations occur:

- The root element is inserted into the document DOM.
- **onMount(parentElement)** fires. It is now safe to measure layout, start animations, and interact with the live DOM.
- Any children added before mount are now mounted into their respective slots.
- The ready check begins.

**Guard:** mount() silently no-ops if the widget is already mounted or destroyed.

## 5.3 Ready

**Triggered by:** all descendants have mounted.

The ready phase follows these rules:

- A **leaf widget** (no children) becomes ready immediately after its own mount.
- A **parent widget** becomes ready only after all of its children report ready.
- Ready propagates **bottom-up**: a parent's onReady() always fires after its children's.
- **onReady()** fires. The full subtree is live and interactive.

## 5.4 Destroy

**Triggered by:** widget.destroy()

During the destroy phase, the following operations occur in order:

- **onDestroy()** fires. The widget is still fully functional at this point. This is the appropriate place for cleanup logic, server notifications, and analytics.
- All children are destroyed recursively (depth-first).
- All InputGateways are destroyed.
- All DOM listeners are removed.
- All upward-event subscriptions are cleared.
- The root element is removed from the DOM.
- If the widget has a parent, it is removed from the parent's child list.

**Guard:** destroy() silently no-ops if the widget is already destroyed. Destruction is permanent and irreversible.

## 5.5 Unmount (Non-Destructive Removal)

**unmount()** removes the element from the DOM and resets mounted/ready state, but preserves all state, children, listeners, and gateways. The widget can be re-mounted later.

This contrasts with destroy(), which is permanent. Unmount supports hide/show patterns without the cost of rebuilding widget state and re-parsing templates.

# 6\. Binding System

The binding system is the declarative glue between a widget's HTML fragment and its state and behavior. It uses four _data-_ attributes, each serving a distinct purpose.

## 6.1 data-bind (State to DOM)

Connects a state key to a DOM property. The syntax is **type:stateKey** or **type:target=stateKey**. Multiple bindings on a single element are separated by semicolons.

The following binding types are supported:

| **Type**    | **Behavior**                                                     |
| ----------- | ---------------------------------------------------------------- |
| **text**    | Sets element.textContent to the state value.                     |
| ---         | ---                                                              |
| **html**    | Sets element.innerHTML to the state value.                       |
| ---         | ---                                                              |
| **visible** | Toggles display:none based on the truthiness of the state value. |
| ---         | ---                                                              |
| **attr**    | Sets or removes an HTML attribute based on the state value.      |
| ---         | ---                                                              |
| **class**   | Toggles a CSS class based on the truthiness of the state value.  |
| ---         | ---                                                              |
| **style**   | Sets or removes an inline CSS property based on the state value. |
| ---         | ---                                                              |

## 6.2 data-action (DOM Events to Methods)

Connects a native DOM event to a widget instance method. The syntax is **domEvent:methodName**. The handler receives the native DOM event object directly - no wrapping or transformation is applied.

If the named method does not exist at fire time, the call is silently skipped. This allows conditional behavior without requiring guard checks.

## 6.3 data-gateway (InputGateway Mount Points)

Marks an element as the mount point for an InputGateway instance. The attribute may be accompanied by optional **data-gateway-type** and **data-gateway-placeholder** attributes to enable auto-creation during the construction phase.

If no type is specified, the developer creates the gateway programmatically in the onInit() hook.

## 6.4 data-widget (Child Slots)

Marks an element as a named mount point for child widgets. When **addChild(widget, slotName)** is called, the child's root element is appended inside the slot element.

Multiple children can share one slot. The default slot, when no slotName is specified, is the widget's own root element.

# 7\. CSS Architecture

CSS in the Widget Framework exists at three levels with increasing specificity. Each level serves a distinct purpose and has clearly defined boundaries.

## 7.1 Global CSS

Global CSS is loaded at bootstrap time. It covers base resets, typography, and layout utilities. The file is located at **styles/global.css** and applies to the entire application.

## 7.2 Component CSS

Component CSS applies to all instances of one widget class. The file naming convention is **WidgetName.WidgetName.css**.

At registration time, the framework performs a double rewrite to guarantee collision-free scoping without Shadow DOM:

- Every selector in the CSS file is rewritten to append **.WidgetName** to each compound selector segment.
- Every element in the HTML template fragment receives the **WidgetName** class.

This double rewrite ensures that component styles are fully scoped and inspectable in DevTools.

**Rewrite exemptions:**

- **@keyframes** - animation names are global and are not rewritten.
- **@font-face** - inherently global and not rewritten.
- **Selectors inside @keyframes blocks** - not rewritten.
- **@media blocks** - are processed; inner selectors are rewritten, but the @media condition is untouched.

The pseudo-selector **:host** maps to the bare scope class (.WidgetName), providing a familiar authoring convention for targeting the widget's root element.

## 7.3 Instance CSS

Instance CSS is applied at runtime through widget methods. The following methods are available:

- **applyStyle / applyStyles / removeStyle / clearStyles** - operate on the root element's inline styles.
- **addCSSClass / removeCSSClass / toggleCSSClass** - operate on the root element's class list.

Instance classes are **not scoped** - they are raw class names intended for one-off overrides, theme variations, or integration with external CSS systems.

# 8\. Child Composition

The Widget Framework enforces a strict ownership model for parent-child relationships. The following rules govern child composition:

- A widget tracks an **ordered list** of its immediate children.
- A widget can have **at most one parent**. Adding a child to a new parent automatically detaches it from the old parent.
- If the parent is already mounted when **addChild** is called, the child is mounted immediately. If the parent is not yet mounted, the child is queued and mounted when the parent mounts.
- **Removing a child destroys it.** The parent owns its children; removal means the parent no longer wants the child to exist. There are no orphaned widgets.
- To **relocate** a widget without destroying it, call addChild on the new parent. The framework handles detachment from the previous parent without triggering destruction.
- Destruction cascades **depth-first** through children, then gateways, then DOM listeners.

# 9\. InputGateway Capabilities

InputGateway supports **17 input types**:

| **Category**      | **Types**                               |
| ----------------- | --------------------------------------- |
| Text              | text, password, email, url, tel, search |
| ---               | ---                                     |
| Numeric           | number, range                           |
| ---               | ---                                     |
| Date/Time         | date, time, datetime-local              |
| ---               | ---                                     |
| Selection         | color, checkbox, radio, file            |
| ---               | ---                                     |
| Multi-line / List | textarea, select                        |
| ---               | ---                                     |

For each type, InputGateway provides four categories of methods:

| **Category**      | **Methods**                                                                                        |
| ----------------- | -------------------------------------------------------------------------------------------------- |
| **Read**          | getValue(), isChecked(), getFiles(), getSelectedOptions()                                          |
| ---               | ---                                                                                                |
| **Write**         | setValue(), setChecked(), setOptions(), clear() - all fire an "update" event with source:"program" |
| ---               | ---                                                                                                |
| **Configuration** | setDisabled(), setReadOnly(), setPlaceholder(), setAttribute(), removeAttribute()                  |
| ---               | ---                                                                                                |
| **Validation**    | setValidator(fn), validate(), getValidationState(), clearValidation()                              |
| ---               | ---                                                                                                |

**Event subscription** is provided via on(type, handler) and off(type, handler) for the six event types: input, change, update, focus, blur, and validate.

All events share a common envelope containing: **gatewayName**, **gatewayType**, **type**, **value**, **previousValue**, **source** (user or program), **timestamp**, and **nativeEvent** (or null for programmatic writes).

**Validation Design Note**

Programmatic writes never auto-trigger validation. The developer calls validate() explicitly if needed. This deliberate design choice prevents feedback loops that can arise when setting a value programmatically triggers validation, which in turn attempts to correct the value.

# 10\. File Conventions

The Widget Framework enforces a predictable, convention-driven file layout. The following table describes the naming and organizational rules for all framework artifacts.

| **Item**            | **Convention**                          | **Example**                    |
| ------------------- | --------------------------------------- | ------------------------------ |
| Widget directory    | One directory per widget under widgets/ | widgets/SearchBar/             |
| ---                 | ---                                     | ---                            |
| JS class file       | WidgetName.js                           | SearchBar.js                   |
| ---                 | ---                                     | ---                            |
| HTML fragment       | WidgetName.html                         | SearchBar.html                 |
| ---                 | ---                                     | ---                            |
| Component CSS       | WidgetName.WidgetName.css               | SearchBar.SearchBar.css        |
| ---                 | ---                                     | ---                            |
| Class name in JS    | class WidgetName extends Widget         | class SearchBar extends Widget |
| ---                 | ---                                     | ---                            |
| static widgetName   | String matching directory/file name     | 'SearchBar'                    |
| ---                 | ---                                     | ---                            |
| Framework internals | All under framework/                    | framework/Widget.js            |
| ---                 | ---                                     | ---                            |
| Global CSS          | styles/global.css                       | styles/global.css              |
| ---                 | ---                                     | ---                            |

# 11\. Design Decisions Log

The following table records the key design decisions made during the creation of the Widget Framework, along with the rationale and the design priority each decision serves.

| **#** | **Decision**                                   | **Rationale**                                                                | **Priority Served**                                     |
| ----- | ---------------------------------------------- | ---------------------------------------------------------------------------- | ------------------------------------------------------- |
| 1     | One class + one HTML file per Widget           | Keeps the mapping between behavior and markup unambiguous.                   | Priority 1 (ease of use)                                |
| ---   | ---                                            | ---                                                                          | ---                                                     |
| 2     | Synchronous setState                           | Developer always sees immediate DOM effect, no timing surprises.             | Priority 1 (predictability)                             |
| ---   | ---                                            | ---                                                                          | ---                                                     |
| 3     | No automatic event bubbling (upward)           | Each tree level explicitly controls relay - no spooky action at a distance.  | Priority 2 (modifiability)                              |
| ---   | ---                                            | ---                                                                          | ---                                                     |
| 4     | Unconditional broadcast (downward)             | Simple mental model - broadcast always reaches everyone.                     | Priority 1 (ease of use)                                |
| ---   | ---                                            | ---                                                                          | ---                                                     |
| 5     | InputGateway as sole input interface           | Single place to normalize, validate, and intercept all user input.           | Priority 2 (modifiability)                              |
| ---   | ---                                            | ---                                                                          | ---                                                     |
| 6     | CSS scoping via class rewriting                | Works without Shadow DOM, inspectable in DevTools, no browser compat issues. | Priority 1 (ease of use), Priority 3 (performance)      |
| ---   | ---                                            | ---                                                                          | ---                                                     |
| 7     | removeChild destroys the child                 | Clear ownership semantics - parent owns children, no orphans.                | Priority 2 (modifiability)                              |
| ---   | ---                                            | ---                                                                          | ---                                                     |
| 8     | unmount() is non-destructive                   | Supports hide/show patterns without rebuilding state.                        | Priority 1 (ease of use)                                |
| ---   | ---                                            | ---                                                                          | ---                                                     |
| 9     | No property hijacking                          | No Proxies, no getters/setters on state - WYSIWYG debugging.                 | Priority 1 (predictability), Priority 2 (modifiability) |
| ---   | ---                                            | ---                                                                          | ---                                                     |
| 10    | Named handler convention for broadcasts        | onThemeChanged reads like documentation; no dispatcher boilerplate.          | Priority 1 (ease of use)                                |
| ---   | ---                                            | ---                                                                          | ---                                                     |
| 11    | Programmatic writes fire "update" not "change" | Distinct source signal prevents feedback loops.                              | Priority 1 (predictability)                             |
| ---   | ---                                            | ---                                                                          | ---                                                     |
| 12    | Targeted DOM writes only                       | Only bindings whose stateKey changed are touched - minimal DOM work.         | Priority 3 (performance)                                |
| ---   | ---                                            | ---                                                                          | ---                                                     |

_Widget Framework - Functional Design Document | Version 1.0 | April 2026_