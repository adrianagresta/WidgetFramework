export class TemplateLoader {
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