class InputGateway {
    private element: HTMLElement;
    private elementTag: string;

    constructor(cssSelector: string) {
        let target = document.querySelector(cssSelector);
        if (!target) throw new Error("No such selector");
        this.element = <HTMLElement>target;
        this.elementTag = target.tagName.toLowerCase();
    }

    /**
     * Intelligently set the value of a data entry element. 
     * Could be input (any type), textarea, or select.
     * @param {string|number|boolean} value - The new value to assign
     */
    public set(value: string | number | boolean): void {
        // get tag name
        switch (this.elementTag) {
            case "input":
                this.setInput(value);
                break;
            case "textarea":
                this.setTextArea(value);
                break;
            case "select":
                this.setSelect(<string>value);
                break;
            default:
                throw new Error("Unsupported tag name: " + this.elementTag);
        }
    }

    /**
     * Like set() but for multiple value inputs
     * @param {string|number|boolean} values - The new value to assign
     */
    public setMulti(values: (string | number | boolean)[]): void {
        switch (this.elementTag) {
            case "select":
                this.setSelectMulti(values);
                break;
            default:
                console.warn("setMulti() not supported for element type:", this.elementTag);
        }
    }

    /**
     * Coerces element to input and sets its value.
     * @param value
     */
    private setInput(value: string | number | boolean): void {
        let type = (<HTMLInputElement>this.element).type;
        let field = <HTMLInputElement>this.element;
        switch (type) {
            case "text":
            case "email":
            case "password":
            case "tel":
            case "url":
            case "search":
            case "number":
            case "date":
            case "datetime-local":
            case "time":
            case "month":
            case "week":
                // For text-like inputs, set the value directly
                field.value = String(value);
                break;

            case "checkbox":
            case "radio":
                // For checkbox/radio buttons, we need to check if the current input matches the value or text
                const radioElement = <HTMLInputElement>this.element;
                // get children
                let options = radioElement.querySelectorAll<HTMLOptionElement>('option');
                for (let option of options) {
                    if (option.value === value || option.text.trim() === value) {
                        option.selected = true;
                    }
                }

                break;
            default:
                // For any other input type, set the value directly
                field.value = String(value);
        }
    }

    /**
     * Coerces element to text area and sets its value.
     * @param value new text input
     */
    private setTextArea(value: string | number | boolean): void {
        (<HTMLTextAreaElement>this.element).value = <string>value;
    }

    /**
     * Coerces element to select and sets its value
     * @param value
     */
    private setSelect(value: string): void {
        (<HTMLSelectElement>this.element).value = value;
    }

    /**
     * Sets multiple options in a select element to selected state based on matching values.
     * @param {string[]|number[]|boolean[]} values - Array of values to match and select
     */
    private setSelectMulti(values: (string | number | boolean)[]): void {
        const selectElement = <HTMLSelectElement>this.element;
        const options = selectElement.querySelectorAll<HTMLOptionElement>('option');

        options.forEach((option) => {
            let text = option.textContent.trim();
            let value = option.value;
            option.selected = values.includes(text) || values.includes(value);
        });
    }
}
