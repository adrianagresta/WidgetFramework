/**
 * Utility class for processing widget templates.
 */
export class TemplateLoader {
    /**
     * Rewrites a document fragment by adding a class to all elements for scoping.
     * @param {DocumentFragment} fragment - The template fragment.
     * @param {string} widgetName - The widget name to add as class.
     */
    static rewriteFragment(fragment, widgetName) {
        const walker = document.createTreeWalker(fragment, NodeFilter.SHOW_ELEMENT);
        let node = walker.currentNode;
        while (node) {
            if (node.nodeType === Node.ELEMENT_NODE) {
                node.classList.add(widgetName);
            }
            node = walker.nextNode();
        }
    }
}