# Widget Framework

Framework Developer Primer

For contributors and maintainers working on the framework internals

April 2026

**Before You Begin**

This primer is for **framework developers** - people modifying, extending, or debugging the Widget Framework itself. If you are building applications _with_ the framework, see the separate **User Primer**.

## Table of Contents

- Welcome - What You're Working On
- Codebase Map
- Module-by-Module Guide

Widget.js - The Core

WidgetEvent.js

WidgetRegistry.js

InputGateway.js

BindingParser.js

CSSRewriter.js

TemplateLoader.js

Framework.js

- How to Add a New Binding Type
- How to Add a New InputGateway Type
- How to Add a New Lifecycle Hook
- Testing Guidelines
- Common Pitfalls

# 1\. Welcome - What You're Working On

The Widget Framework is a class-based component system for building interactive web interfaces using standard JavaScript and HTML. Its fundamental building block is the **Widget**: one JavaScript class paired with one HTML fragment file.

Every piece of code in this repository exists to serve that abstraction - making Widgets easy to write, easy to compose, and fast enough that performance never becomes a concern for the app developer.

## Design Priorities

Every decision you make as a framework contributor must respect this priority order. When priorities conflict, the higher-numbered item always loses.

| **Priority** | **Principle**                    | **What It Means in Practice**                                                                                                                                                              |
| ------------ | -------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **1**        | Ease of use by the app developer | Small API surface, declarative bindings, predictable behavior. The app developer should never need to read framework internals to use it.                                                  |
| ---          | ---                              | ---                                                                                                                                                                                        |
| **2**        | Ease of subsequent modification  | Clear separation of concerns, overridable hooks, explicit data flow. Future contributors (including you, six months from now) should be able to change one module without breaking others. |
| ---          | ---                              | ---                                                                                                                                                                                        |
| **3**        | Performance                      | Targeted DOM writes, no waste - but _never_ at the expense of priorities 1 or 2.                                                                                                           |
| ---          | ---                              | ---                                                                                                                                                                                        |

## Language Constraints

All framework code must use only features widely supported by Chrome, Firefox, Safari, and Edge as of April 2026.

**Allowed:**

- ES2022 classes, static fields/methods, #private fields
- async/await, ES modules
- Map, Set, WeakMap, WeakSet
- Optional chaining (?.), nullish coalescing (??)
- structuredClone, queueMicrotask
- document.createTreeWalker, insertBefore, querySelectorAll

**⚠ Explicitly Forbidden**

• **Decorators** - not yet stable across all targets.

• **Proxy-based reactivity** - introduces hidden behavior.

• **Getter/setter interception** on state or DOM properties ("no property hijacking").

• **Synthetic event dispatch** (new Event / dispatchEvent) for framework communication.

# 2\. Codebase Map

The entire framework fits in eight files. Here is the directory structure with approximate line counts:

framework/ ├── Framework.js - Bootstrap entry point ├── Widget.js - The base class (~300 lines, the heart of the framework) ├── WidgetEvent.js - Event value object (~20 lines) ├── WidgetRegistry.js - Template/CSS/class cache (~30 lines) ├── InputGateway.js - Input element wrapper (~200 lines) ├── BindingParser.js - Attribute string parser (~40 lines) ├── CSSRewriter.js - Selector scoping transform (~60 lines) └── TemplateLoader.js - HTML fetch/parse/rewrite (~20 lines)

## Dependency Graph

Read the arrows as "imports from":

| **Module**        | **Imports From**                                         |
| ----------------- | -------------------------------------------------------- |
| Framework.js      | WidgetRegistry, TemplateLoader, CSSRewriter              |
| ---               | ---                                                      |
| Widget.js         | WidgetRegistry, WidgetEvent, BindingParser, InputGateway |
| ---               | ---                                                      |
| WidgetEvent.js    | _nothing_                                                |
| ---               | ---                                                      |
| WidgetRegistry.js | _nothing_                                                |
| ---               | ---                                                      |
| InputGateway.js   | _nothing_                                                |
| ---               | ---                                                      |
| BindingParser.js  | _nothing_                                                |
| ---               | ---                                                      |
| CSSRewriter.js    | _nothing_                                                |
| ---               | ---                                                      |
| TemplateLoader.js | _nothing_                                                |
| ---               | ---                                                      |

**❗ No Circular Dependencies**

The dependency graph is intentionally acyclic. **Keep it that way.** If you find yourself needing Module A to import Module B while Module B already imports Module A, stop and redesign.

# 3\. Module-by-Module Guide

## 3.1 Widget.js - The Core

This is where roughly 80% of framework behavior lives. If you're new to the codebase, read this file first - twice.

### Private Fields

The Widget base class manages the following private fields:

# state, #element, #children, #parent, #mounted, #ready, #destroyed, #bindings, #listeners, #gateways, #slots, #actionCleanups

### Responsibilities

| **Area**     | **Key Methods**                                 | **What It Does**                                                                                                                 |
| ------------ | ----------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------- |
| Construction | constructor()                                   | Merges defaultState with initialState, clones template from registry, parses all bindings, applies initial state, calls onInit() |
| ---          | ---                                             | ---                                                                                                                              |
| Lifecycle    | mount(), unmount(), destroy()                   | Manages DOM attachment/removal with idempotent guards                                                                            |
| ---          | ---                                             | ---                                                                                                                              |
| State        | setState()                                      | Strict-inequality diff, targeted DOM writes via #updateBindings / #applyBinding                                                  |
| ---          | ---                                             | ---                                                                                                                              |
| Events       | emit(), on(), off(), broadcast()                | Upward propagation via emit/on/off; downward via broadcast/#broadcastDown                                                        |
| ---          | ---                                             | ---                                                                                                                              |
| Children     | addChild(), removeChild()                       | Automatic mount/destroy cascading                                                                                                |
| ---          | ---                                             | ---                                                                                                                              |
| Gateways     | createGateway(), getGateway(), destroyGateway() | InputGateway lifecycle management                                                                                                |
| ---          | ---                                             | ---                                                                                                                              |

### Key Invariants - Do Not Break These

**⚠ Critical Invariants**

• **setState is synchronous.** Never introduce batching or microtask deferral.

• **#applyBinding is the ONLY place** DOM writes happen for state changes. All paths must go through it.

• **destroy() cascades depth-first.** Children are destroyed before the parent's DOM is removed.

• **The #children array is copied** in destroy() to prevent mutation-during-iteration bugs.

• **emit() copies the listener array** before iterating (same reason).

## 3.2 WidgetEvent.js

A simple value object. The #stopped private field backs stopPropagation(). The class is intentionally minimal - it exists to carry event data and allow propagation control, nothing more.

**Note**

Do not add methods like preventDefault() - this is _not_ a DOM event. Keep the surface area small.

## 3.3 WidgetRegistry.js

A static singleton Map. Stores { template: DocumentFragment, css: string, WidgetClass: class } per widget name.

getTemplate() always returns cloneNode(true) - never the original. If you modify this module, ensure the original template is **never** mutated. Returning the original fragment would cause all widget instances to share a single DOM tree.

## 3.4 InputGateway.js

Creates and wraps one native input element. This is the framework's boundary between the messy world of HTML form controls and the clean event model used by widgets.

### Key Responsibilities

- Creates the native element in the constructor based on a type string
- Normalizes native events into a consistent plain-object shape
- Distinguishes user input (source: 'user') from programmatic writes (source: 'program')
- Ensures programmatic writes fire 'update' events, never 'input' or 'change'
- Never auto-triggers validation on programmatic writes

### Event Envelope Shape

{ gatewayName, // string - the name assigned to this gateway gatewayType, // string - e.g., 'text', 'checkbox', 'select' type, // string - 'input', 'change', 'update', 'focus', 'blur', 'validate' value, // any - current value previousValue, // any - value before this event source, // string - 'user' or 'program' timestamp, // number - Date.now() nativeEvent // Event|null - the original DOM event, or null for programmatic writes }

### Programmatic Write Methods

setValue(), setChecked(), setOptions(), clear() - all fire 'update' events with source: 'program'.

## 3.5 BindingParser.js

Pure static utility. parseBindings() and parseActions() take raw attribute strings and return structured arrays. No side effects, no state. Easy to test in isolation.

**💡 Good to Know**

If you're adding a new binding type, the parser itself doesn't need to change - it already extracts arbitrary type strings. The new type is handled in Widget.js's #applyBinding switch statement.

## 3.6 CSSRewriter.js

Transforms CSS text by appending .WidgetName to every compound selector segment. Uses the CSSStyleSheet API (constructable stylesheets) to parse CSS, then iterates cssRules.

### Rewrite Rules

| **Input Pattern**                 | **Output**                                     | **Notes**                              |
| --------------------------------- | ---------------------------------------------- | -------------------------------------- |
| :host                             | .WidgetName                                    | Maps to the bare scope class           |
| ---                               | ---                                            | ---                                    |
| @keyframes                        | _unchanged_                                    | Passes through as-is                   |
| ---                               | ---                                            | ---                                    |
| @font-face                        | _unchanged_                                    | Passes through as-is                   |
| ---                               | ---                                            | ---                                    |
| @media (...)                      | Condition unchanged; inner selectors rewritten | Recursed into                          |
| ---                               | ---                                            | ---                                    |
| Comma-separated selectors         | Each part rewritten independently              | .a, .b → .a.W, .b.W                    |
| ---                               | ---                                            | ---                                    |
| Combinators (>, +, ~, whitespace) | Detected via regex, preserved                  | Each segment gets .WidgetName appended |
| ---                               | ---                                            | ---                                    |

## 3.7 TemplateLoader.js

Uses document.createTreeWalker to walk every element in the parsed HTML fragment and adds the widgetName class to each element.

This pairs directly with **CSSRewriter**: the rewriter makes selectors require the class, the loader ensures elements have it. If one changes, the other must stay in sync.

## 3.8 Framework.js

The bootstrap. Framework.init(config) runs the following sequence:

- Loads global CSS (optional)
- Iterates config.widgets array
- For each widget class:
  - Fetches HTML template file
  - Parses HTML into a DocumentFragment
  - Rewrites the fragment (adds widget class to every element)
  - Fetches CSS file
  - Rewrites CSS (appends scope class to selectors)
  - Injects a &lt;style&gt; element into &lt;head&gt;
  - Registers in WidgetRegistry

**Note**

Framework.init() is **async** (uses fetch). Everything after init completes is synchronous. This is the only async boundary in the entire framework.

# 4\. How to Add a New Binding Type

This walkthrough adds a hypothetical data binding type that sets a data-\* attribute on an element.

## Step 1: BindingParser.js - No Change Needed

The parser already extracts arbitrary type strings from binding expressions. It doesn't contain a whitelist of known types.

## Step 2: Widget.js - Add a Case to #applyBinding()

Open Widget.js and find the #applyBinding() method. Add a new case to the switch statement:

case 'data': if (value == null) { el.removeAttribute('data-' + binding.target); } else { el.setAttribute('data-' + binding.target, String(value)); } break;

## Step 3: Update Documentation

Add the new type to the binding types table in both the API docs and the User Primer.

## Step 4: Verify Usage

With the above changes, app developers can now write:

data-bind="data:itemId=selectedId"

This binds the selectedId state property to the data-itemId attribute on the element.

# 5\. How to Add a New InputGateway Type

This walkthrough adds support for contenteditable divs as an input type.

## Step 1: Add Element Creation

In the InputGateway constructor, add a case to the element-creation logic:

case 'contenteditable': this.#element = document.createElement('div'); this.#element.setAttribute('contenteditable', 'true'); break;

## Step 2: Attach Listeners

Add input and blur listeners on the contenteditable div, following the same pattern as existing input types.

## Step 3: Normalize getValue()

Return element.textContent or element.innerHTML depending on the desired behavior for this type.

## Step 4: Normalize setValue()

Set element.textContent or element.innerHTML. Remember: programmatic writes must fire 'update' events with source: 'program', never 'input' or 'change'.

## Step 5: Test All 6 Event Types

Ensure all of the following fire with the correct envelope shape:

| **Event Type** | **Trigger**                                            |
| -------------- | ------------------------------------------------------ |
| input          | User types in the contenteditable div                  |
| ---            | ---                                                    |
| change         | User finishes editing (e.g., on blur)                  |
| ---            | ---                                                    |
| update         | Programmatic write via setValue()                      |
| ---            | ---                                                    |
| focus          | Element receives focus                                 |
| ---            | ---                                                    |
| blur           | Element loses focus                                    |
| ---            | ---                                                    |
| validate       | Validation is triggered (never by programmatic writes) |
| ---            | ---                                                    |

# 6\. How to Add a New Lifecycle Hook

## Step 1: Define the Method

Add a no-op method on the Widget base class:

onNewHook() {}

## Step 2: Call It at the Correct Point

The current lifecycle order is:

constructor → onInit → mount → onMount → children mount → #checkReady → onReady → ... → destroy → onDestroy → cascade

Insert your call at the appropriate point in this sequence. Think carefully about what state is available at each stage.

## Step 3: Document It

For every new hook, document the following:

- **When it fires** - what has already happened, what hasn't yet
- **What's safe to do inside it** - can you call setState? Add children? Access the DOM?
- **Whether it fires once or multiple times** - e.g., onMount can fire more than once if the widget is unmounted and remounted

**⚠ Never Break the Existing Order**

• onInit always fires before onMount

• onMount always fires before onReady

• onDestroy always fires before teardown

You may add hooks _between_ existing ones, but you must never reorder the existing hooks.

# 7\. Testing Guidelines

Each module should be tested in isolation. The framework's small module count and acyclic dependency graph make this straightforward.

## Pure Function Tests (Easy Wins)

| **Module**    | **Approach**                                                                                                                                                                             |
| ------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| BindingParser | String input → structured array output. Test every binding expression format.                                                                                                            |
| ---           | ---                                                                                                                                                                                      |
| CSSRewriter   | CSS string input → rewritten CSS string output. Test every selector pattern from the rewrite rules table. Verify @keyframes passes through. Verify @media inner selectors are rewritten. |
| ---           | ---                                                                                                                                                                                      |

## Widget Lifecycle Tests

- Create a widget - verify onInit fires during construction
- Mount it - verify onMount fires
- Add children - verify onReady ordering (children before parent)
- Destroy - verify cascade ordering (depth-first, children before parent)

## State Tests

- setState with unchanged values should be a **no-op** - no DOM writes, no onStateChange
- setState with changed values should update **only the affected bindings**

## Event Tests

- Verify emit() calls subscribers in registration order
- Verify stopPropagation() stops iteration
- Verify broadcast() reaches all descendants
- Verify the named handler convention (onTypeName)

## InputGateway Tests

- Verify each input type creates the correct native element
- Verify getValue() normalization for each type
- Verify programmatic writes fire 'update', not 'change'
- Verify the source field is 'user' vs. 'program'

# 8\. Common Pitfalls

These are mistakes that framework contributors have made (or come close to making). Read them before you start writing code.

| **#** | **Pitfall**                   | **What Goes Wrong**                                                                                                                                                                                     | **How to Avoid It**                                                   |
| ----- | ----------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------- |
| 1     | **Mutation during iteration** | Calling off() during emit() modifies the listener array mid-loop. Same issue with destroy() cascading through #children.                                                                                | Always copy arrays before iterating if handlers can modify the array. |
| ---   | ---                           | ---                                                                                                                                                                                                     | ---                                                                   |
| 2     | **Template mutation**         | If WidgetRegistry.getTemplate() returns the original fragment instead of cloneNode(true), all widget instances share one DOM tree.                                                                      | Always return cloneNode(true). Never expose the original.             |
| ---   | ---                           | ---                                                                                                                                                                                                     | ---                                                                   |
| 3     | **Circular parent-child**     | If addChild doesn't detach from the old parent first, a widget ends up in two parents' #children arrays simultaneously.                                                                                 | Always detach from old parent before attaching to new parent.         |
| ---   | ---                           | ---                                                                                                                                                                                                     | ---                                                                   |
| 4     | **Ready check re-entrance**   | #checkReady cascades upward. If onReady modifies #children, you trigger re-entrant ready checks.                                                                                                        | Keep onReady free of child manipulation.                              |
| ---   | ---                           | ---                                                                                                                                                                                                     | ---                                                                   |
| 5     | **Gateway cleanup**           | Gateways attach native listeners. If destroy() doesn't call gateway.destroy(), those listeners leak.                                                                                                    | Ensure the cleanup cascade is complete - always destroy gateways.     |
| ---   | ---                           | ---                                                                                                                                                                                                     | ---                                                                   |
| 6     | **CSS specificity inflation** | Appending .WidgetName to every selector segment increases specificity. A rule like .header.SearchBar has specificity (0, 2, 0). This can surprise developers if global CSS uses single-class selectors. | This is a **known trade-off by design**. Document it, don't fight it. |
| ---   | ---                           | ---                                                                                                                                                                                                     | ---                                                                   |

# Summary - Your First Day Checklist

Here's what to do on your first day working on this codebase:

- **Read Widget.js** end to end. Understand the constructor, lifecycle methods, setState, and the #applyBinding switch.
- **Read InputGateway.js**. Understand the event envelope shape and the user vs. program source distinction.
- **Skim the remaining six files.** They are short and self-contained.
- **Run the test suite.** Make sure everything passes before you change anything.
- **Make a small change.** Adding a new binding type (Section 4) is a good first task - it touches only one file and one switch statement.
- **Re-read the design priorities.** Ease of use for the app developer comes first. Always.

**💡 Welcome Aboard**

The Widget Framework is small by design. Every line earns its place. When you add code, ask yourself: _does this make the app developer's life simpler?_ If the answer is yes, you're on the right track.