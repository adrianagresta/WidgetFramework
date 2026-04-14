/**
 * Utility class for parsing binding and action strings used in widget templates.
 */
export class BindingParser {
    /**
     * Parses a binding string into an array of binding objects.
     * @param {string} str - The binding string, e.g., "text:stateKey; attr:href=urlKey"
     * @returns {Array<{type: string, target: string|null, stateKey: string}>} Array of parsed bindings.
     */
    static parseBindings(str) {
        return str.split(';')
            .map(s => s.trim())
            .filter(Boolean)
            .map(segment => {
                const colonIdx = segment.indexOf(':');
                const type = segment.slice(0, colonIdx).trim();
                const rest = segment.slice(colonIdx + 1).trim();
                if (type === 'attr' || type === 'class' || type === 'style') {
                    const eqIdx = rest.indexOf('=');
                    return { type, target: rest.slice(0, eqIdx).trim(), stateKey: rest.slice(eqIdx + 1).trim() };
                }
                return { type, target: null, stateKey: rest };
            });
    }

    /**
     * Parses an action string into an array of action objects.
     * @param {string} str - The action string, e.g., "click:handleClick; change:handleChange"
     * @returns {Array<{domEvent: string, method: string}>} Array of parsed actions.
     */
    static parseActions(str) {
        return str.split(';')
            .map(s => s.trim())
            .filter(Boolean)
            .map(segment => {
                const colonIdx = segment.indexOf(':');
                return { domEvent: segment.slice(0, colonIdx).trim(), method: segment.slice(colonIdx + 1).trim() };
            });
    }
}