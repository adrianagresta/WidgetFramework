/**
 * Utility class for rewriting CSS to add scoping for widget isolation.
 */
export class CSSRewriter {
    /**
     * Rewrites CSS text by adding a scope class to selectors.
     * @param {string} cssText - The original CSS text.
     * @param {string} widgetName - The widget name to use as scope.
     * @returns {string} The rewritten CSS text.
     */
    static rewrite(cssText, widgetName) {
        const scope = '.' + widgetName;
        const sheet = new CSSStyleSheet();
        sheet.replaceSync(cssText);
        let output = '';
        for (const rule of sheet.cssRules) {
            output += this.#rewriteRule(rule, scope);
        }
        return output;
    }

    /**
     * Rewrites a single CSS rule by scoping selectors.
     * @param {CSSRule} rule - The CSS rule to rewrite.
     * @param {string} scope - The scope class.
     * @returns {string} The rewritten rule as string.
     */
    static #rewriteRule(rule, scope) {
        if (rule instanceof CSSStyleRule) {
            const newSelector = this.#rewriteSelector(rule.selectorText, scope);
            return newSelector + ' { ' + rule.style.cssText + ' }\n';
        }
        if (rule instanceof CSSMediaRule) {
            let inner = '';
            for (const child of rule.cssRules) {
                inner += this.#rewriteRule(child, scope);
            }
            return '@media ' + rule.conditionText + ' {\n' + inner + '}\n';
        }
        return rule.cssText + '\n'; // @keyframes, @font-face pass through
    }

    /**
     * Rewrites a CSS selector by adding scope to each selector part.
     * @param {string} selectorText - The original selector.
     * @param {string} widgetName - The widget name to use as scope.
     * @returns {string} The rewritten selector.
     */
    static #rewriteSelector(selectorText, scope) {
        return selectorText.split(',').map(sel => {
            sel = sel.trim();
            if (sel === ':host') return scope;
            // Split selector by combinators and spaces to scope each part except combinators
            const parts = sel.split(/(\s*[>+~]\s*|\s+)/);
            return parts.map(part => {
                part = part.trim();
                if (!part || /^[>+~]$/.test(part)) return part ? ' ' + part + ' ' : ' ';
                return part + scope;
            }).join('');
        }).join(', ');
    }
}