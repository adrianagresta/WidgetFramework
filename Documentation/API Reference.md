# Widget Framework - API Reference

Complete Class, Method & Binding Reference for the Widget Component Framework

Version 1.0 | April 12, 2026

JavaScript / HTML Component Framework

# Table of Contents

**1\. Widget (Base Class)**

1.1 Static Members

1.2 Constructor

1.3 Lifecycle Hooks

1.4 State Methods

1.5 Child Management

1.6 Upward Event Methods

1.7 Downward Event Methods

1.8 DOM Methods

1.9 Instance Styling Methods

1.10 InputGateway Access Methods

**2\. WidgetEvent**

2.1 Constructor

2.2 Properties

2.3 Methods

**3\. InputGateway**

3.1 Constructor & Supported Types

3.2 Reading Methods

3.3 Writing Methods

3.4 Configuration Methods

3.5 Validation Methods

3.6 Event Methods

3.7 Event Detail Object Shape

3.8 DOM Methods

**4\. Framework (Bootstrap)**

4.1 Methods

**5\. WidgetRegistry (Internal)**

**6\. BindingParser (Internal)**

**7\. CSSRewriter (Internal)**

**8\. TemplateLoader (Internal)**

**9\. HTML Binding Attributes Quick Reference**

**10\. Binding Type Reference**

# 1\. Widget (Base Class)

framework/Widget.js

All application widgets extend this class. **Widget** provides the complete lifecycle, state management, child composition, event propagation, DOM management, styling, and input gateway APIs.

## 1.1 Static Members

### static widgetName

| **Aspect**  | **Detail**                                                                              |
| ----------- | --------------------------------------------------------------------------------------- |
| Type        | string                                                                                  |
| ---         | ---                                                                                     |
| Required    | **YES** - every subclass MUST set this                                                  |
| ---         | ---                                                                                     |
| Description | The unique name identifying this widget class. Must match the directory and file names. |
| ---         | ---                                                                                     |

**Example:**

static widgetName = 'SearchBar';

### static defaultState()

static defaultState() → Object

| **Aspect**  | **Detail**                                                                                                                                   |
| ----------- | -------------------------------------------------------------------------------------------------------------------------------------------- |
| Parameters  | None                                                                                                                                         |
| ---         | ---                                                                                                                                          |
| Returns     | Object - the default state for new instances                                                                                                 |
| ---         | ---                                                                                                                                          |
| Default     | Returns **{}**                                                                                                                               |
| ---         | ---                                                                                                                                          |
| Description | Override to define initial state keys and values. The returned object is shallow-merged with any **initialState** passed to the constructor. |
| ---         | ---                                                                                                                                          |

**Example:**

static defaultState() { return { count: 0, label: 'Items' }; }

## 1.2 Constructor

### constructor(initialState = {})

new Widget(initialState = {}) → Widget

| **Parameter** | **Type** | **Required** | **Description**                                                                       |
| ------------- | -------- | ------------ | ------------------------------------------------------------------------------------- |
| initialState  | Object   | No           | Key-value pairs to merge over defaultState(). Values in initialState win on conflict. |
| ---           | ---      | ---          | ---                                                                                   |

**Construction sequence:**

- Merges **defaultState()** with **initialState** (initialState wins on conflict).
- Clones the registered HTML template from WidgetRegistry.
- Adds the **widgetName** CSS class to the root element.
- Parses all **data-bind**, **data-action**, **data-gateway**, **data-widget** attributes.
- Applies initial state to all bindings (initial DOM render).
- Calls **this.onInit()**.

## 1.3 Lifecycle Hooks

**Note**

All hooks are **no-op by default**. Override in subclasses to add custom behavior.

### onInit()

onInit() → void

| **Aspect**      | **Detail**                                                                                      |
| --------------- | ----------------------------------------------------------------------------------------------- |
| Parameters      | None                                                                                            |
| ---             | ---                                                                                             |
| Returns         | void                                                                                            |
| ---             | ---                                                                                             |
| When            | Called **once**, at the end of construction. Element exists but is **NOT** in the document DOM. |
| ---             | ---                                                                                             |
| Safe operations | Create gateways, subscribe to gateway events, add children, read/write state.                   |
| ---             | ---                                                                                             |

### onMount(parentElement)

onMount(parentElement) → void

| **Parameter** | **Type**    | **Required** | **Description**                               |
| ------------- | ----------- | ------------ | --------------------------------------------- |
| parentElement | HTMLElement | Yes          | The DOM element the widget was inserted into. |
| ---           | ---         | ---          | ---                                           |

| **Aspect**      | **Detail**                                                                 |
| --------------- | -------------------------------------------------------------------------- |
| Returns         | void                                                                       |
| ---             | ---                                                                        |
| When            | Called **once**, after the root element is inserted into the document DOM. |
| ---             | ---                                                                        |
| Safe operations | Measure layout, start animations, interact with live DOM.                  |
| ---             | ---                                                                        |

### onReady()

onReady() → void

| **Aspect**      | **Detail**                                                                                                             |
| --------------- | ---------------------------------------------------------------------------------------------------------------------- |
| Parameters      | None                                                                                                                   |
| ---             | ---                                                                                                                    |
| Returns         | void                                                                                                                   |
| ---             | ---                                                                                                                    |
| When            | Called **once**, after this widget AND every descendant has mounted. Children's onReady fires **before** the parent's. |
| ---             | ---                                                                                                                    |
| Safe operations | Full subtree is live. Safe for any operation.                                                                          |
| ---             | ---                                                                                                                    |

### onDestroy()

onDestroy() → void

| **Aspect**      | **Detail**                                                                                   |
| --------------- | -------------------------------------------------------------------------------------------- |
| Parameters      | None                                                                                         |
| ---             | ---                                                                                          |
| Returns         | void                                                                                         |
| ---             | ---                                                                                          |
| When            | Called **once**, before teardown begins. The widget is still fully functional at this point. |
| ---             | ---                                                                                          |
| Safe operations | Cleanup logic, save state, server notifications, analytics.                                  |
| ---             | ---                                                                                          |

### onStateChange(changedKeys, previousState)

onStateChange(changedKeys, previousState) → void

| **Parameter** | **Type**   | **Required** | **Description**                              |
| ------------- | ---------- | ------------ | -------------------------------------------- |
| changedKeys   | string\[\] | Yes          | List of state keys that actually changed.    |
| ---           | ---        | ---          | ---                                          |
| previousState | Object     | Yes          | Shallow copy of the state before the update. |
| ---           | ---        | ---          | ---                                          |

| **Aspect** | **Detail**                                                                                                              |
| ---------- | ----------------------------------------------------------------------------------------------------------------------- |
| Returns    | void                                                                                                                    |
| ---        | ---                                                                                                                     |
| When       | Called after every setState() that results in at least one changed key. Fires **AFTER** DOM bindings have been updated. |
| ---        | ---                                                                                                                     |

### onBroadcast(event)

onBroadcast(event) → void

| **Parameter** | **Type**    | **Required** | **Description**      |
| ------------- | ----------- | ------------ | -------------------- |
| event         | WidgetEvent | Yes          | The broadcast event. |
| ---           | ---         | ---          | ---                  |

| **Aspect** | **Detail**                                                                                                                                  |
| ---------- | ------------------------------------------------------------------------------------------------------------------------------------------- |
| Returns    | void                                                                                                                                        |
| ---        | ---                                                                                                                                         |
| When       | Called for every downward broadcast that reaches this widget. Called **AFTER** any named handler (e.g., onThemeChanged) for the same event. |
| ---        | ---                                                                                                                                         |

## 1.4 State Methods

### getState()

getState() → Object

| **Aspect** | **Detail**                                                |
| ---------- | --------------------------------------------------------- |
| Parameters | None                                                      |
| ---        | ---                                                       |
| Returns    | Object - a **shallow copy** of the current state          |
| ---        | ---                                                       |
| Notes      | Mutating the returned object has no effect on the widget. |
| ---        | ---                                                       |

### setState(partial)

setState(partial) → void

| **Parameter** | **Type** | **Required** | **Description**                                  |
| ------------- | -------- | ------------ | ------------------------------------------------ |
| partial       | Object   | Yes          | Key-value pairs to merge into the current state. |
| ---           | ---      | ---          | ---                                              |

**Behavior:**

- For each key in **partial**, compares with current value using strict inequality (**!==**).
- If no keys changed, returns immediately (no DOM writes, no hook call).
- Updates internal state with changed values.
- Calls **#updateBindings(changedKeys)** - targeted DOM writes.
- Calls **this.onStateChange(changedKeys, previousState)**.

**Important**

Synchronous. No batching. Objects/arrays compared by reference - pass new references to trigger updates. Silently no-ops if widget is destroyed.

## 1.5 Child Management

### addChild(widget, slotName = 'default')

addChild(widget, slotName = 'default') → Widget

| **Parameter** | **Type** | **Required** | **Description**                                                       |
| ------------- | -------- | ------------ | --------------------------------------------------------------------- |
| widget        | Widget   | Yes          | The child widget to add.                                              |
| ---           | ---      | ---          | ---                                                                   |
| slotName      | string   | No           | Name of the slot to mount into. Defaults to 'default' (root element). |
| ---           | ---      | ---          | ---                                                                   |

| **Aspect** | **Detail**                                                                                                                                                                                                                                       |
| ---------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Returns    | Widget - the added child (for chaining)                                                                                                                                                                                                          |
| ---        | ---                                                                                                                                                                                                                                              |
| Behavior   | If the child already has a parent, detaches it from the old parent without destroying it. Adds the child to this widget's children list. If this widget is already mounted, mounts the child immediately into the slot. Re-runs the ready check. |
| ---        | ---                                                                                                                                                                                                                                              |
| Notes      | A widget can have at most one parent.                                                                                                                                                                                                            |
| ---        | ---                                                                                                                                                                                                                                              |

### removeChild(widget)

removeChild(widget) → void

| **Parameter** | **Type** | **Required** | **Description**             |
| ------------- | -------- | ------------ | --------------------------- |
| widget        | Widget   | Yes          | The child widget to remove. |
| ---           | ---      | ---          | ---                         |

**Warning**

Removal means **destruction**. The parent owns its children - removeChild() removes the child from the children list and **DESTROYS** it.

### getChildren()

getChildren() → Widget\[\]

| **Aspect** | **Detail**                                      |
| ---------- | ----------------------------------------------- |
| Parameters | None                                            |
| ---        | ---                                             |
| Returns    | Widget\[\] - shallow copy of the children array |
| ---        | ---                                             |

### getChildrenInSlot(slotName)

getChildrenInSlot(slotName) → Widget\[\]

| **Parameter** | **Type** | **Required** | **Description**             |
| ------------- | -------- | ------------ | --------------------------- |
| slotName      | string   | Yes          | The slot name to filter by. |
| ---           | ---      | ---          | ---                         |

| **Aspect** | **Detail**                                          |
| ---------- | --------------------------------------------------- |
| Returns    | Widget\[\] - children mounted in the specified slot |
| ---        | ---                                                 |

## 1.6 Upward Event Methods

### emit(type, detail = {})

emit(type, detail = {}) → void

| **Parameter** | **Type** | **Required** | **Description**    |
| ------------- | -------- | ------------ | ------------------ |
| type          | string   | Yes          | Event name.        |
| ---           | ---      | ---          | ---                |
| detail        | Object   | No           | Arbitrary payload. |
| ---           | ---      | ---          | ---                |

| **Aspect** | **Detail**                                                                                                                                                                                    |
| ---------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Returns    | void                                                                                                                                                                                          |
| ---        | ---                                                                                                                                                                                           |
| Behavior   | Creates a WidgetEvent and calls all subscribers registered via on() for this type, in registration order. If any subscriber calls event.stopPropagation(), remaining subscribers are skipped. |
| ---        | ---                                                                                                                                                                                           |

### on(type, handler)

on(type, handler) → void

| **Parameter** | **Type** | **Required** | **Description**                   |
| ------------- | -------- | ------------ | --------------------------------- |
| type          | string   | Yes          | Event name to subscribe to.       |
| ---           | ---      | ---          | ---                               |
| handler       | Function | Yes          | Callback receiving a WidgetEvent. |
| ---           | ---      | ---          | ---                               |

| **Aspect** | **Detail**                                                   |
| ---------- | ------------------------------------------------------------ |
| Returns    | void                                                         |
| ---        | ---                                                          |
| Notes      | Typically called by the parent widget on the child instance. |
| ---        | ---                                                          |

### off(type, handler)

off(type, handler) → void

| **Parameter** | **Type** | **Required** | **Description**                             |
| ------------- | -------- | ------------ | ------------------------------------------- |
| type          | string   | Yes          | Event name.                                 |
| ---           | ---      | ---          | ---                                         |
| handler       | Function | Yes          | The same function reference passed to on(). |
| ---           | ---      | ---          | ---                                         |

| **Aspect** | **Detail**                                               |
| ---------- | -------------------------------------------------------- |
| Returns    | void                                                     |
| ---        | ---                                                      |
| Notes      | Removes the first matching handler. No-ops if not found. |
| ---        | ---                                                      |

## 1.7 Downward Event Methods

### broadcast(type, detail = {})

broadcast(type, detail = {}) → void

| **Parameter** | **Type** | **Required** | **Description**    |
| ------------- | -------- | ------------ | ------------------ |
| type          | string   | Yes          | Event name.        |
| ---           | ---      | ---          | ---                |
| detail        | Object   | No           | Arbitrary payload. |
| ---           | ---      | ---          | ---                |

**Behavior:** Creates a WidgetEvent and walks the entire subtree depth-first. For each descendant:

- Checks for a named handler method: **'on' + capitalize(type)**. Calls it if it exists.
- Calls **onBroadcast(event)** (always, even if the named handler exists).
- Recurses into the descendant's children.

**Important**

Broadcast is **unconditional**. stopPropagation() has **no effect** on broadcasts.

## 1.8 DOM Methods

### mount(parentElement, anchor = null)

mount(parentElement, anchor = null) → void

| **Parameter** | **Type**    | **Required** | **Description**                                          |
| ------------- | ----------- | ------------ | -------------------------------------------------------- |
| parentElement | HTMLElement | Yes          | The DOM element to insert into.                          |
| ---           | ---         | ---          | ---                                                      |
| anchor        | Node        | No           | If provided, inserts before this node. If null, appends. |
| ---           | ---         | ---          | ---                                                      |

| **Aspect** | **Detail**                                                                                      |
| ---------- | ----------------------------------------------------------------------------------------------- |
| Returns    | void                                                                                            |
| ---        | ---                                                                                             |
| Behavior   | Inserts the root element into the DOM, calls onMount, mounts queued children, runs ready check. |
| ---        | ---                                                                                             |
| Guards     | No-ops if already mounted or destroyed.                                                         |
| ---        | ---                                                                                             |

### unmount()

unmount() → void

| **Aspect** | **Detail**                                                                                    |
| ---------- | --------------------------------------------------------------------------------------------- |
| Parameters | None                                                                                          |
| ---        | ---                                                                                           |
| Returns    | void                                                                                          |
| ---        | ---                                                                                           |
| Behavior   | Recursively unmounts children, removes root element from DOM, resets mounted and ready flags. |
| ---        | ---                                                                                           |

**Non-Destructive**

State, children, listeners, and gateways are preserved. The widget can be re-mounted.

### destroy()

destroy() → void

| **Aspect** | **Detail**                                                                                                                                                                          |
| ---------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Parameters | None                                                                                                                                                                                |
| ---        | ---                                                                                                                                                                                 |
| Returns    | void                                                                                                                                                                                |
| ---        | ---                                                                                                                                                                                 |
| Behavior   | Calls onDestroy, recursively destroys children (depth-first), destroys gateways, removes DOM listeners, clears event subscriptions, removes element from DOM, detaches from parent. |
| ---        | ---                                                                                                                                                                                 |
| Guards     | No-ops if already destroyed.                                                                                                                                                        |
| ---        | ---                                                                                                                                                                                 |

**Permanent**

Destruction is **irreversible**. The widget instance cannot be reused after destroy() is called.

### getElement()

getElement() → HTMLElement

| **Aspect** | **Detail**                                  |
| ---------- | ------------------------------------------- |
| Parameters | None                                        |
| ---        | ---                                         |
| Returns    | HTMLElement - the widget's root DOM element |
| ---        | ---                                         |

## 1.9 Instance Styling Methods

| **Method**         | **Signature**                                        | **Description**                                                                  |
| ------------------ | ---------------------------------------------------- | -------------------------------------------------------------------------------- |
| **applyStyle**     | applyStyle(property: string, value: string) → void   | Sets the inline style on the root element via style.setProperty().               |
| ---                | ---                                                  | ---                                                                              |
| **applyStyles**    | applyStyles(map: Object) → void                      | Calls applyStyle for each key-value entry in the map.                            |
| ---                | ---                                                  | ---                                                                              |
| **removeStyle**    | removeStyle(property: string) → void                 | Removes the specified inline style property.                                     |
| ---                | ---                                                  | ---                                                                              |
| **clearStyles**    | clearStyles() → void                                 | Removes the entire style attribute from the root element.                        |
| ---                | ---                                                  | ---                                                                              |
| **addCSSClass**    | addCSSClass(name: string) → void                     | Adds the class to the root element's classList. NOT scoped.                      |
| ---                | ---                                                  | ---                                                                              |
| **removeCSSClass** | removeCSSClass(name: string) → void                  | Removes the class from the root element's classList.                             |
| ---                | ---                                                  | ---                                                                              |
| **toggleCSSClass** | toggleCSSClass(name: string, force?: boolean) → void | Toggles the CSS class. If force is provided, adds when true, removes when false. |
| ---                | ---                                                  | ---                                                                              |

## 1.10 InputGateway Access Methods

### createGateway(name, type, options = {})

createGateway(name, type, options = {}) → void

| **Parameter** | **Type** | **Required** | **Description**                                                             |
| ------------- | -------- | ------------ | --------------------------------------------------------------------------- |
| name          | string   | Yes          | Unique name matching a data-gateway attribute in the template.              |
| ---           | ---      | ---          | ---                                                                         |
| type          | string   | Yes          | Input type (see InputGateway supported types in Section 3).                 |
| ---           | ---      | ---          | ---                                                                         |
| options       | Object   | No           | Configuration options - see InputGateway constructor options for full list. |
| ---           | ---      | ---          | ---                                                                         |

| **Aspect** | **Detail**                                                             |
| ---------- | ---------------------------------------------------------------------- |
| Returns    | void                                                                   |
| ---        | ---                                                                    |
| Behavior   | Creates an InputGateway, mounts it into the named mount point element. |
| ---        | ---                                                                    |

### getGateway(name)

getGateway(name) → InputGateway | undefined

| **Parameter** | **Type** | **Required** | **Description** |
| ------------- | -------- | ------------ | --------------- |
| name          | string   | Yes          | Gateway name.   |
| ---           | ---      | ---          | ---             |

### destroyGateway(name)

destroyGateway(name) → void

| **Parameter** | **Type** | **Required** | **Description** |
| ------------- | -------- | ------------ | --------------- |
| name          | string   | Yes          | Gateway name.   |
| ---           | ---      | ---          | ---             |

| **Aspect** | **Detail**                                                           |
| ---------- | -------------------------------------------------------------------- |
| Returns    | void                                                                 |
| ---        | ---                                                                  |
| Behavior   | Calls destroy() on the gateway and removes it from the gateways map. |
| ---        | ---                                                                  |

# 2\. WidgetEvent

framework/WidgetEvent.js

The value object used for all framework events - both upward (emit) and downward (broadcast).

## 2.1 Constructor

### new WidgetEvent(type, source, detail = {})

new WidgetEvent(type, source, detail = {}) → WidgetEvent

| **Parameter** | **Type** | **Required** | **Description**                    |
| ------------- | -------- | ------------ | ---------------------------------- |
| type          | string   | Yes          | Event name.                        |
| ---           | ---      | ---          | ---                                |
| source        | Widget   | Yes          | The widget that created the event. |
| ---           | ---      | ---          | ---                                |
| detail        | Object   | No           | Arbitrary payload.                 |
| ---           | ---      | ---          | ---                                |

## 2.2 Properties

| **Property**           | **Type**         | **Description**                                                                   |
| ---------------------- | ---------------- | --------------------------------------------------------------------------------- |
| **type**               | string           | Event name.                                                                       |
| ---                    | ---              | ---                                                                               |
| **source**             | Widget           | Widget that created the event. Never changes as the event propagates.             |
| ---                    | ---              | ---                                                                               |
| **currentTarget**      | Widget           | Widget currently handling the event. Updated by the framework during propagation. |
| ---                    | ---              | ---                                                                               |
| **detail**             | Object           | Arbitrary payload. Handlers may read and write this.                              |
| ---                    | ---              | ---                                                                               |
| **timestamp**          | number           | Date.now() at creation time.                                                      |
| ---                    | ---              | ---                                                                               |
| **propagationStopped** | boolean (getter) | Whether stopPropagation() has been called.                                        |
| ---                    | ---              | ---                                                                               |

## 2.3 Methods

### stopPropagation()

stopPropagation() → void

| **Aspect** | **Detail**                                                                                                                              |
| ---------- | --------------------------------------------------------------------------------------------------------------------------------------- |
| Parameters | None                                                                                                                                    |
| ---        | ---                                                                                                                                     |
| Returns    | void                                                                                                                                    |
| ---        | ---                                                                                                                                     |
| Behavior   | Prevents remaining subscribers from being called during upward (emit) event delivery. Has **NO effect** on downward (broadcast) events. |
| ---        | ---                                                                                                                                     |

# 3\. InputGateway

framework/InputGateway.js

Per-instance wrapper for native HTML input elements. The sole interface between the framework and user input.

## 3.1 Constructor & Supported Types

### new InputGateway(type, options = {})

new InputGateway(type, options = {}) → InputGateway

**Supported types:**

| **Category** | **Types**                               |
| ------------ | --------------------------------------- |
| Text         | text, password, email, url, tel, search |
| ---          | ---                                     |
| Numeric      | number, range                           |
| ---          | ---                                     |
| Date/Time    | date, time, datetime-local              |
| ---          | ---                                     |
| Selection    | color, checkbox, radio, select          |
| ---          | ---                                     |
| File         | file                                    |
| ---          | ---                                     |
| Multi-line   | textarea                                |
| ---          | ---                                     |

**Constructor options:**

| **Option**  | **Type**                                          | **Applicable Types**                    | **Description**                          |
| ----------- | ------------------------------------------------- | --------------------------------------- | ---------------------------------------- |
| placeholder | string                                            | Text types, textarea                    | Placeholder text.                        |
| ---         | ---                                               | ---                                     | ---                                      |
| disabled    | boolean                                           | All                                     | Initial disabled state.                  |
| ---         | ---                                               | ---                                     | ---                                      |
| readOnly    | boolean                                           | All                                     | Initial read-only state.                 |
| ---         | ---                                               | ---                                     | ---                                      |
| name        | string                                            | All                                     | Form element name attribute.             |
| ---         | ---                                               | ---                                     | ---                                      |
| id          | string                                            | All                                     | Element id attribute.                    |
| ---         | ---                                               | ---                                     | ---                                      |
| min         | string \| number                                  | number, range, date, time               | Minimum value.                           |
| ---         | ---                                               | ---                                     | ---                                      |
| max         | string \| number                                  | number, range, date, time               | Maximum value.                           |
| ---         | ---                                               | ---                                     | ---                                      |
| step        | string \| number                                  | number, range                           | Step interval.                           |
| ---         | ---                                               | ---                                     | ---                                      |
| pattern     | string                                            | text, password, email, url, tel, search | Validation regex pattern.                |
| ---         | ---                                               | ---                                     | ---                                      |
| accept      | string                                            | file                                    | Accepted file types.                     |
| ---         | ---                                               | ---                                     | ---                                      |
| multiple    | boolean                                           | file, select                            | Allow multiple selections/files.         |
| ---         | ---                                               | ---                                     | ---                                      |
| rows        | number                                            | textarea                                | Number of visible text rows.             |
| ---         | ---                                               | ---                                     | ---                                      |
| cols        | number                                            | textarea                                | Number of visible text columns.          |
| ---         | ---                                               | ---                                     | ---                                      |
| options     | Array&lt;{value, label, selected?, disabled?}&gt; | select                                  | Select option elements.                  |
| ---         | ---                                               | ---                                     | ---                                      |
| checked     | boolean                                           | checkbox, radio                         | Initial checked state.                   |
| ---         | ---                                               | ---                                     | ---                                      |
| value       | string                                            | All (except file)                       | Initial value.                           |
| ---         | ---                                               | ---                                     | ---                                      |
| cssClass    | string                                            | All                                     | CSS class for the native element.        |
| ---         | ---                                               | ---                                     | ---                                      |
| attributes  | Object                                            | All                                     | Arbitrary attributes as key-value pairs. |
| ---         | ---                                               | ---                                     | ---                                      |

## 3.2 Reading Methods

### getValue()

getValue() → string | number | null

**Return values by type:**

| **Type**                                | **Return Value**                                                |
| --------------------------------------- | --------------------------------------------------------------- |
| text, password, email, url, tel, search | string                                                          |
| ---                                     | ---                                                             |
| textarea                                | string                                                          |
| ---                                     | ---                                                             |
| number, range                           | number if parseable, otherwise null                             |
| ---                                     | ---                                                             |
| date, time, datetime-local              | ISO 8601 string if set, otherwise null                          |
| ---                                     | ---                                                             |
| color                                   | string (hex, e.g. '#ff0000')                                    |
| ---                                     | ---                                                             |
| checkbox, radio                         | string (the value attribute; use isChecked() for boolean state) |
| ---                                     | ---                                                             |
| file                                    | null (use getFiles())                                           |
| ---                                     | ---                                                             |
| select                                  | string for single-select; use getSelectedOptions() for multi    |
| ---                                     | ---                                                             |

### isChecked()

isChecked() → boolean

| **Aspect** | **Detail**                         |
| ---------- | ---------------------------------- |
| Returns    | boolean                            |
| ---        | ---                                |
| Notes      | For checkbox and radio types only. |
| ---        | ---                                |

### getFiles()

getFiles() → FileList

| **Aspect** | **Detail**          |
| ---------- | ------------------- |
| Returns    | FileList            |
| ---        | ---                 |
| Notes      | For file type only. |
| ---        | ---                 |

### getSelectedOptions()

getSelectedOptions() → string\[\]

| **Aspect** | **Detail**                                   |
| ---------- | -------------------------------------------- |
| Returns    | string\[\] - array of selected option values |
| ---        | ---                                          |
| Notes      | For select type with multiple attribute.     |
| ---        | ---                                          |

## 3.3 Writing Methods

### setValue(value)

setValue(value) → void

| **Parameter** | **Type**         | **Required** | **Description**                   |
| ------------- | ---------------- | ------------ | --------------------------------- |
| value         | string \| number | Yes          | New value for the native element. |
| ---           | ---              | ---          | ---                               |

| **Aspect** | **Detail**                                                                       |
| ---------- | -------------------------------------------------------------------------------- |
| Returns    | void                                                                             |
| ---        | ---                                                                              |
| Behavior   | Sets the native element's value. Fires an 'update' event with source: 'program'. |
| ---        | ---                                                                              |

### setChecked(bool)

setChecked(bool) → void

| **Parameter** | **Type** | **Required** | **Description**    |
| ------------- | -------- | ------------ | ------------------ |
| bool          | boolean  | Yes          | New checked state. |
| ---           | ---      | ---          | ---                |

| **Aspect** | **Detail**                                |
| ---------- | ----------------------------------------- |
| Returns    | void                                      |
| ---        | ---                                       |
| Notes      | For checkbox/radio. Fires 'update' event. |
| ---        | ---                                       |

### setOptions(opts)

setOptions(opts) → void

| **Parameter** | **Type**                                                                            | **Required** | **Description**      |
| ------------- | ----------------------------------------------------------------------------------- | ------------ | -------------------- |
| opts          | Array&lt;{value: string, label: string, selected?: boolean, disabled?: boolean}&gt; | Yes          | New option elements. |
| ---           | ---                                                                                 | ---          | ---                  |

| **Aspect** | **Detail**                                                           |
| ---------- | -------------------------------------------------------------------- |
| Returns    | void                                                                 |
| ---        | ---                                                                  |
| Notes      | For select type. Replaces all option elements. Fires 'update' event. |
| ---        | ---                                                                  |

### clear()

clear() → void

| **Aspect** | **Detail**                                                               |
| ---------- | ------------------------------------------------------------------------ |
| Parameters | None                                                                     |
| ---        | ---                                                                      |
| Returns    | void                                                                     |
| ---        | ---                                                                      |
| Behavior   | Resets to empty string / unchecked / no selection. Fires 'update' event. |
| ---        | ---                                                                      |

## 3.4 Configuration Methods

| **Method**          | **Signature**                                    | **Description**                                    |
| ------------------- | ------------------------------------------------ | -------------------------------------------------- |
| **setDisabled**     | setDisabled(bool: boolean) → void                | Sets the disabled state of the native element.     |
| ---                 | ---                                              | ---                                                |
| **setReadOnly**     | setReadOnly(bool: boolean) → void                | Sets the read-only state of the native element.    |
| ---                 | ---                                              | ---                                                |
| **setPlaceholder**  | setPlaceholder(text: string) → void              | Sets the placeholder attribute.                    |
| ---                 | ---                                              | ---                                                |
| **setAttribute**    | setAttribute(name: string, value: string) → void | Sets an arbitrary attribute on the native element. |
| ---                 | ---                                              | ---                                                |
| **removeAttribute** | removeAttribute(name: string) → void             | Removes an attribute from the native element.      |
| ---                 | ---                                              | ---                                                |

## 3.5 Validation Methods

### setValidator(fn)

setValidator(fn) → void

| **Parameter** | **Type** | **Required** | **Description**                                                              |
| ------------- | -------- | ------------ | ---------------------------------------------------------------------------- |
| fn            | Function | Yes          | Receives the current value, must return { valid: boolean, message: string }. |
| ---           | ---      | ---          | ---                                                                          |

### validate()

validate() → { valid: boolean, message: string, value: mixed }

| **Aspect** | **Detail**                                                    |
| ---------- | ------------------------------------------------------------- |
| Parameters | None                                                          |
| ---        | ---                                                           |
| Returns    | { valid: boolean, message: string, value: mixed }             |
| ---        | ---                                                           |
| Behavior   | Runs the validator function if set. Fires a 'validate' event. |
| ---        | ---                                                           |

### getValidationState()

getValidationState() → { valid: boolean, message: string, value: mixed } | null

| **Aspect** | **Detail**                                                   |
| ---------- | ------------------------------------------------------------ |
| Parameters | None                                                         |
| ---        | ---                                                          |
| Returns    | The last result from validate(), or null if never validated. |
| ---        | ---                                                          |

### clearValidation()

clearValidation() → void

| **Aspect** | **Detail**                           |
| ---------- | ------------------------------------ |
| Parameters | None                                 |
| ---        | ---                                  |
| Returns    | void                                 |
| ---        | ---                                  |
| Behavior   | Resets the validation state to null. |
| ---        | ---                                  |

## 3.6 Event Methods

### on(type, handler)

on(type, handler) → void

| **Parameter** | **Type** | **Required** | **Description**                                                   |
| ------------- | -------- | ------------ | ----------------------------------------------------------------- |
| type          | string   | Yes          | One of: 'input', 'change', 'update', 'focus', 'blur', 'validate'. |
| ---           | ---      | ---          | ---                                                               |
| handler       | Function | Yes          | Receives an event detail object (see Section 3.7).                |
| ---           | ---      | ---          | ---                                                               |

### off(type, handler)

off(type, handler) → void

| **Parameter** | **Type** | **Required** | **Description**                |
| ------------- | -------- | ------------ | ------------------------------ |
| type          | string   | Yes          | Event type.                    |
| ---           | ---      | ---          | ---                            |
| handler       | Function | Yes          | Same reference passed to on(). |
| ---           | ---      | ---          | ---                            |

## 3.7 Event Detail Object Shape

All six event types (**input**, **change**, **update**, **focus**, **blur**, **validate**) share this envelope:

| **Field**         | **Type**      | **Description**                                                                  |
| ----------------- | ------------- | -------------------------------------------------------------------------------- |
| **gatewayName**   | string        | The name from data-gateway.                                                      |
| ---               | ---           | ---                                                                              |
| **gatewayType**   | string        | The gateway type (e.g., 'text').                                                 |
| ---               | ---           | ---                                                                              |
| **type**          | string        | Framework event type: 'input', 'change', 'update', 'focus', 'blur', 'validate'.  |
| ---               | ---           | ---                                                                              |
| **value**         | mixed         | Current value (see getValue() return types).                                     |
| ---               | ---           | ---                                                                              |
| **previousValue** | mixed         | Value before this event.                                                         |
| ---               | ---           | ---                                                                              |
| **source**        | string        | 'user' for user interaction, 'program' for setValue/setChecked/setOptions/clear. |
| ---               | ---           | ---                                                                              |
| **timestamp**     | number        | Date.now().                                                                      |
| ---               | ---           | ---                                                                              |
| **nativeEvent**   | Event \| null | The native DOM event, or null for programmatic writes.                           |
| ---               | ---           | ---                                                                              |

The **'validate'** event adds these additional fields:

| **Field**   | **Type** | **Description**            |
| ----------- | -------- | -------------------------- |
| **valid**   | boolean  | Whether validation passed. |
| ---         | ---      | ---                        |
| **message** | string   | Validator's message.       |
| ---         | ---      | ---                        |

## 3.8 DOM Methods

| **Method**     | **Signature**                        | **Description**                                             |
| -------------- | ------------------------------------ | ----------------------------------------------------------- |
| **getElement** | getElement() → HTMLElement           | Returns the native input/textarea/select element.           |
| ---            | ---                                  | ---                                                         |
| **mount**      | mount(container: HTMLElement) → void | Appends the native element into the container.              |
| ---            | ---                                  | ---                                                         |
| **unmount**    | unmount() → void                     | Removes the native element from the DOM.                    |
| ---            | ---                                  | ---                                                         |
| **destroy**    | destroy() → void                     | Unmounts and removes all native event listeners. Permanent. |
| ---            | ---                                  | ---                                                         |

# 4\. Framework (Bootstrap)

framework/Framework.js

The top-level entry point that initializes the framework, loads templates, and registers widget classes.

## 4.1 Methods

### static async init(config)

static async Framework.init(config) → Promise

<

void

\>

| **Parameter** | **Type** | **Required** | **Description**                                  |
| ------------- | -------- | ------------ | ------------------------------------------------ |
| config        | Object   | Yes          | Configuration object (see sub-properties below). |
| ---           | ---      | ---          | ---                                              |

**Config properties:**

| **Property**   | **Type**           | **Required** | **Description**                                            |
| -------------- | ------------------ | ------------ | ---------------------------------------------------------- |
| **widgetRoot** | string             | Yes          | Base URL path to the widgets directory. Must end with '/'. |
| ---            | ---                | ---          | ---                                                        |
| **globalCSS**  | string             | No           | Path to the global CSS file.                               |
| ---            | ---                | ---          | ---                                                        |
| **widgets**    | Array&lt;class&gt; | Yes          | Array of Widget subclass references to register.           |
| ---            | ---                | ---          | ---                                                        |

**Initialization sequence:**

- Loads and injects global CSS (if specified).
- For each widget class:
  - Fetches its HTML template and CSS file.
  - Rewrites both for CSS scoping.
  - Injects the scoped CSS into **document.head**.
  - Registers the template and class in WidgetRegistry.

# 5\. WidgetRegistry (Internal)

framework/WidgetRegistry.js

Static singleton cache. Application developers don't typically use this directly.

| **Method**      | **Signature**                                                                                    | **Returns**      | **Description**                                                                                 |
| --------------- | ------------------------------------------------------------------------------------------------ | ---------------- | ----------------------------------------------------------------------------------------------- |
| **register**    | static register(widgetName: string, template: DocumentFragment, css: string, WidgetClass: class) | void             | Stores the template fragment, scoped CSS string, and class reference.                           |
| ---             | ---                                                                                              | ---              | ---                                                                                             |
| **getTemplate** | static getTemplate(widgetName: string)                                                           | DocumentFragment | Returns a cloneNode(true) of the stored template. Throws Error if widgetName is not registered. |
| ---             | ---                                                                                              | ---              | ---                                                                                             |
| **getClass**    | static getClass(widgetName: string)                                                              | class \| null    | Returns the registered Widget subclass, or null.                                                |
| ---             | ---                                                                                              | ---              | ---                                                                                             |
| **has**         | static has(widgetName: string)                                                                   | boolean          | Returns true if the widget name is registered.                                                  |
| ---             | ---                                                                                              | ---              | ---                                                                                             |

# 6\. BindingParser (Internal)

framework/BindingParser.js

Static utility. Application developers don't use this directly.

| **Method**        | **Signature**                     | **Returns**                                                             | **Description**                                                                 |
| ----------------- | --------------------------------- | ----------------------------------------------------------------------- | ------------------------------------------------------------------------------- |
| **parseBindings** | static parseBindings(str: string) | Array&lt;{ type: string, target: string \| null, stateKey: string }&gt; | Parses the value of a data-bind attribute into structured binding descriptors.  |
| ---               | ---                               | ---                                                                     | ---                                                                             |
| **parseActions**  | static parseActions(str: string)  | Array&lt;{ domEvent: string, method: string }&gt;                       | Parses the value of a data-action attribute into structured action descriptors. |
| ---               | ---                               | ---                                                                     | ---                                                                             |

# 7\. CSSRewriter (Internal)

framework/CSSRewriter.js

### static rewrite(cssText, widgetName)

static CSSRewriter.rewrite(cssText, widgetName) → string

| **Parameter** | **Type** | **Required** | **Description**                  |
| ------------- | -------- | ------------ | -------------------------------- |
| cssText       | string   | Yes          | Raw CSS text.                    |
| ---           | ---      | ---          | ---                              |
| widgetName    | string   | Yes          | Widget name used as scope class. |
| ---           | ---      | ---          | ---                              |

| **Aspect** | **Detail**                                   |
| ---------- | -------------------------------------------- |
| Returns    | string - rewritten CSS with scoped selectors |
| ---        | ---                                          |

**Rewrite rules:**

| **Input Pattern**     | **Rewrite Behavior**                                       |
| --------------------- | ---------------------------------------------------------- |
| Any compound selector | Gets **.WidgetName** appended to each segment.             |
| ---                   | ---                                                        |
| **:host**             | Becomes **.WidgetName**.                                   |
| ---                   | ---                                                        |
| **@keyframes**        | Passes through unchanged.                                  |
| ---                   | ---                                                        |
| **@font-face**        | Passes through unchanged.                                  |
| ---                   | ---                                                        |
| **@media**            | Inner selectors are rewritten; the condition is unchanged. |
| ---                   | ---                                                        |

# 8\. TemplateLoader (Internal)

framework/TemplateLoader.js

### static rewriteFragment(fragment, widgetName)

static TemplateLoader.rewriteFragment(fragment, widgetName) → void

| **Parameter** | **Type**         | **Required** | **Description**                     |
| ------------- | ---------------- | ------------ | ----------------------------------- |
| fragment      | DocumentFragment | Yes          | Parsed HTML template.               |
| ---           | ---              | ---          | ---                                 |
| widgetName    | string           | Yes          | Class name to add to every element. |
| ---           | ---              | ---          | ---                                 |

| **Aspect** | **Detail**                                                                                       |
| ---------- | ------------------------------------------------------------------------------------------------ |
| Returns    | void (mutates the fragment in place)                                                             |
| ---        | ---                                                                                              |
| Behavior   | Uses document.createTreeWalker to visit every element node and adds widgetName to its classList. |
| ---        | ---                                                                                              |

# 9\. HTML Binding Attributes Quick Reference

| **Attribute**                | **Syntax**                                                      | **Purpose**                                                    | **Processed By**                     |
| ---------------------------- | --------------------------------------------------------------- | -------------------------------------------------------------- | ------------------------------------ |
| **data-bind**                | "type:stateKey" or "type:target=stateKey" (semicolon-separated) | Connects state properties to DOM properties.                   | Widget constructor via BindingParser |
| ---                          | ---                                                             | ---                                                            | ---                                  |
| **data-action**              | "domEvent:methodName" (semicolon-separated)                     | Connects native DOM events to widget instance methods.         | Widget constructor via BindingParser |
| ---                          | ---                                                             | ---                                                            | ---                                  |
| **data-gateway**             | "gatewayName"                                                   | Marks element as InputGateway mount point.                     | Widget constructor                   |
| ---                          | ---                                                             | ---                                                            | ---                                  |
| **data-gateway-type**        | "text", "number", etc.                                          | Auto-creates an InputGateway of this type during construction. | Widget constructor                   |
| ---                          | ---                                                             | ---                                                            | ---                                  |
| **data-gateway-placeholder** | "placeholder text"                                              | Sets placeholder on auto-created gateway.                      | Widget constructor                   |
| ---                          | ---                                                             | ---                                                            | ---                                  |
| **data-gateway-disabled**    | "true"                                                          | Sets disabled on auto-created gateway.                         | Widget constructor                   |
| ---                          | ---                                                             | ---                                                            | ---                                  |
| **data-widget**              | "slotName"                                                      | Marks element as a named mount point for child widgets.        | Widget constructor                   |
| ---                          | ---                                                             | ---                                                            | ---                                  |

# 10\. Binding Type Reference

| **Binding Type** | **data-bind Syntax**     | **DOM Effect**                          | **null / undefined Behavior**             |
| ---------------- | ------------------------ | --------------------------------------- | ----------------------------------------- |
| **text**         | text:stateKey            | Sets element.textContent                | Sets textContent to ''                    |
| ---              | ---                      | ---                                     | ---                                       |
| **html**         | html:stateKey            | Sets element.innerHTML                  | Sets innerHTML to ''                      |
| ---              | ---                      | ---                                     | ---                                       |
| **visible**      | visible:stateKey         | Sets display:'' when truthy             | Sets display:none                         |
| ---              | ---                      | ---                                     | ---                                       |
| **attr**         | attr:attrName=stateKey   | Sets attribute to String(value)         | Removes attribute (also removes on false) |
| ---              | ---                      | ---                                     | ---                                       |
| **class**        | class:className=stateKey | Toggles CSS class via classList.toggle  | Removes the class                         |
| ---              | ---                      | ---                                     | ---                                       |
| **style**        | style:cssProp=stateKey   | Sets inline style via style.setProperty | Removes the style property                |
| ---              | ---                      | ---                                     | ---                                       |

Widget Framework - API Reference | Version 1.0 | April 12, 2026