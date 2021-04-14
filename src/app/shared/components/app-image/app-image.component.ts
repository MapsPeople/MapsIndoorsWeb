import { Component, OnInit, Input } from '@angular/core';

@Component({
    selector: 'app-image',
    templateUrl: './app-image.component.html',
    styleUrls: ['./app-image.component.scss']
})
export class AppImageComponent implements OnInit {
    @Input() src: string;
    @Input() alt: string;

    constructor() { }

    ngOnInit() {
        this.appendScaleParamToSrc();
    }

    /**
     * @description Event that sets image source to a 1x1 transparent pixel image in case the original source cannot be rendered.
     * @public
     */
    public onError() {
        const defaultSrcOnError = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=';
        this.src = defaultSrcOnError;
    }

    /**
     * @description Check if src is a valid URL.
     * @private
     * @param {string} src
     * @returns {boolean}
     */
    private isUrlValid(): boolean {
        try {
            new URL(this.src);

            return true;
        } catch (err) {
            return false;
        }
    }

    /**
     * @description Add a scale parameter to icon URLs.
     * @private
     */
    private appendScaleParamToSrc(): void  {
        if (this.isUrlValid() === false) {

            return;
        }

        const subdomainsToUpscale: string[] = ['api', 'v2'];
        const url = new URL(this.src);
        const hostnamePrefix = url.hostname.split('.')[0];
        const shouldAppendScaleParam = subdomainsToUpscale.includes(hostnamePrefix);

        if (shouldAppendScaleParam === true) {
            url.searchParams.set('scale', '2');
            this.src = url.toString();
        }
    }
}
