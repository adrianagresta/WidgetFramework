import { WidgetRegistry } from './WidgetRegistry.js';
import { TemplateLoader } from './TemplateLoader.js';
import { CSSRewriter } from './CSSRewriter.js';

/**
 * Main framework class for initializing widgets.
 */
export class WidgetFramework {
    /**
     * Initializes the framework with configuration.
     * @param {object} config - Configuration object.
     * @param {string} config.globalCSS - URL to global CSS.
     * @param {Array<Function>} config.widgets - Array of widget classes.
     * @param {string} config.widgetRoot - Root path for widget files.
     */
    static async init(config) {
        if (config.globalCSS) {
            const css = await fetch(config.globalCSS).then(r => r.text());
            const style = document.createElement('style');
            style.setAttribute('data-widget-css', 'global');
            style.textContent = css;
            document.head.appendChild(style);
        }
        for (const WidgetClass of config.widgets) {
            const name = WidgetClass.widgetName;
            if (!name) throw new Error('Widget class missing static widgetName.');
            const base = config.widgetRoot + name + '/' + name;
            const htmlText = await fetch(base + '.html').then(r => r.text());
            const templateEl = document.createElement('template');
            templateEl.innerHTML = htmlText.trim();
            const fragment = templateEl.content;
            TemplateLoader.rewriteFragment(fragment, name);
            const cssText = await fetch(base + '.' + name + '.css').then(r => r.text());
            const scopedCSS = CSSRewriter.rewrite(cssText, name);
            const style = document.createElement('style');
            style.setAttribute('data-widget-css', name);
            style.textContent = scopedCSS;
            document.head.appendChild(style);
            WidgetRegistry.register(name, fragment, scopedCSS, WidgetClass);
        }
    }
}