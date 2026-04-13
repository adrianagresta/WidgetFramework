export class BindingParser {
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