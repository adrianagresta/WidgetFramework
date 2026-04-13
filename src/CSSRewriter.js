export class CSSRewriter {
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

    static #rewriteSelector(selectorText, scope) {
        return selectorText.split(',').map(sel => {
            sel = sel.trim();
            if (sel === ':host') return scope;
            const parts = sel.split(/(\s*[>+~]\s*|\s+)/);
            return parts.map(part => {
                part = part.trim();
                if (!part || /^[>+~]$/.test(part)) return part ? ' ' + part + ' ' : ' ';
                return part + scope;
            }).join('');
        }).join(', ');
    }
}