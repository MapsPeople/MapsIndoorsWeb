import { Component, OnChanges, AfterViewInit, ViewEncapsulation, Input, Output, EventEmitter } from '@angular/core';
import Keyboard from 'simple-keyboard';

@Component({
    selector: 'numeric-keyboard',
    encapsulation: ViewEncapsulation.None,
    templateUrl: './numeric-keyboard.component.html',
    styleUrls: ['./numeric-keyboard.component.scss']
})

export class NumericKeyboardComponent implements AfterViewInit, OnChanges {
    @Input() private activeInput: string; // For managing multiple inputs.
    @Input() private activeInputValue: string; // For updating input changes made outside the component.
    @Output() private value: EventEmitter<string> = new EventEmitter();

    private keyboard: Keyboard;

    ngOnChanges(): void {
        if (this.keyboard) {
            this.keyboard.setOptions({ inputName: this.activeInput });
            this.keyboard.setInput(this.activeInputValue, this.activeInput);
        }
    }

    ngAfterViewInit(): void {
        this.keyboard = new Keyboard({
            onChange: (input: string): void => this.onChange(input),
            layout: { default: ['1 2 3', '4 5 6', '7 8 9', '0 {bksp}'] },
            display: { '{bksp}': '&#9003;' },
            theme: 'hg-theme-default hg-layout-numeric numeric-theme'
        });
    }

    /**
     * @description Emit the entered value.
     * @private
     * @param {string} input - The entered value.
     * @memberof NumericKeyboardComponent
     */
    private onChange(input: string): void {
        this.value.emit(input);
    }

}
