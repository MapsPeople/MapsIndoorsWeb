import { Injectable } from '@angular/core';

@Injectable({
    providedIn: 'root'
})
export class ImageService {

    constructor() { }

    /**
     * Check if string is a valid URL.
     * @private
     * @param {string} urlString
     * @returns {boolean}
     */
    private isUrlValid(urlString): boolean {
        try {
            new URL(urlString);

            return true;
        } catch (err) {
            return false;
        }
    }

    /**
     * Append query parameters to image URL to request with specific size or scale depending on hostname.
     * @param {string} imageURL - URL for image
     * @param {HTMLElement} element - the element that renders the image
     * @returns string
     */
    public appendQueryParameters(imageURL, element: HTMLElement): string {
        if (this.isUrlValid(imageURL) === false) {
            return;
        }

        const url = new URL(imageURL);
        const hostname = url.hostname;

        if (hostname === 'image.mapsindoors.com') {
            // Add query parameters for image size and fitMode
            const devicePixelRatio = Math.max(2, window.devicePixelRatio || 1); // Forced minimum of 2 to circumvent poor scaling quality delivered from the image API (see MIBAPI-2566)
            const imageRequestWidth = element.offsetWidth * devicePixelRatio;
            const imageRequestHeight = element.offsetHeight * devicePixelRatio;
            url.searchParams.set('width', imageRequestWidth.toString());
            url.searchParams.set('height', imageRequestHeight.toString());
            url.searchParams.set('fitMode', 'cover');
        }

        if (['app.mapsindoors.com', 'v2.mapsindoors.com'].includes(hostname)) {
            // For legacy reason, add a scale parameter
            url.searchParams.set('scale', '2');
        }

        return url.toString();
    }

}
