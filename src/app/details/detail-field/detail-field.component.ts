import { Component, Input } from '@angular/core';

@Component({
    selector: 'detail-field',
    templateUrl: './detail-field.component.html',
    styleUrls: ['./detail-field.component.scss']
})
export class DetailFieldComponent {
    @Input() heading: string;
    @Input() value: string;
    @Input() isUrl = false;
    @Input() iconName: string;
}
