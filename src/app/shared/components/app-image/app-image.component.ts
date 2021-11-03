import { Component, OnInit, Input, ElementRef } from '@angular/core';
import { ImageService } from 'src/app/services/image.service';

@Component({
    selector: 'app-image',
    templateUrl: './app-image.component.html',
    styleUrls: ['./app-image.component.scss']
})
export class AppImageComponent implements OnInit {
    @Input() src: string;
    @Input() alt: string;

    constructor(
        private imageService: ImageService,
        private element: ElementRef
    ) { }

    ngOnInit(): void {
        this.src = this.imageService.appendQueryParameters(this.src, this.element.nativeElement);
    }

    /**
     * Event that sets image source to a 1x1 transparent pixel image in case the original source cannot be rendered.
     */
    public onError(): void {
        const defaultSrcOnError = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=';
        this.src = defaultSrcOnError;
    }
}
