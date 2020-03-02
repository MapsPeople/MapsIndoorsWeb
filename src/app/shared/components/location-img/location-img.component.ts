import { Component, Input, OnChanges } from '@angular/core';
import { HttpClient } from '@angular/common/http';

declare const mapsindoors: any;

@Component({
    selector: 'location-img',
    templateUrl: './location-img.component.html',
    styleUrls: ['./location-img.component.scss']
})
export class LocationImgComponent implements OnChanges {
    @Input() imageURL: string;
    @Input() streetViewConfig: any;
    @Input() apiKey: string;

    image: string;
    panorama: google.maps.StreetViewPanorama;
    minimap: google.maps.Map;

    constructor(
        private http: HttpClient
    ) { }

    /**
     * Populate image variable with Street View if available otherwise use the standard imageURL
     */
    ngOnChanges() {
        if (this.streetViewConfig) {
            const parameters: string = `size=456x300&pano=${this.streetViewConfig.panoramaId}&heading=${this.streetViewConfig.povHeading}&pitch=${this.streetViewConfig.povPitch}&key=${this.apiKey}`;
            this.checkAvailability(parameters)
                .subscribe((complete: any) => {
                    if (complete.status === 'OK') {
                        this.image = 'https://maps.googleapis.com/maps/api/streetview?' + parameters;
                    } else this.useStaticImage();
                });
        } else this.useStaticImage();
    }

    /**
     * Determine if street view imagery is available for given parameters
     * @param {string} parameters	The Street View Id, POV and API Key
     */
    checkAvailability(parameters: string) {
        return this.http.get('https://maps.googleapis.com/maps/api/streetview/metadata?' + parameters);
    }

    /**
     * Sets the image URL
     */
    useStaticImage() {
        this.image = this.imageURL;
    }

    /**
     * Opens a new full size window showing the panorama image
     */
    initStreetView() {
        // Street View container
        const streetViewDiv: HTMLElement = document.createElement('div');
        streetViewDiv.id = 'panorama';
        streetViewDiv.style.width = '100vw';
        streetViewDiv.style.height = '100vh';
        streetViewDiv.style.position = 'absolute';
        streetViewDiv.style.top = '0';
        document.body.appendChild(streetViewDiv);

        // Street View configurations
        this.panorama = new google.maps.StreetViewPanorama(
            document.getElementById('panorama'),
            {
                pano: this.streetViewConfig.panoramaId,
                pov: {
                    heading: this.streetViewConfig.povHeading,
                    pitch: this.streetViewConfig.povPitch
                },
                zoom: 0,
                addressControl: false,
                enableCloseButton: false,
                fullscreenControl: false,
                visible: true
            });

        // Load minimap when panorama is ready
        this.panorama.addListener('position_changed', async () => {
            const position: google.maps.LatLng = await this.panorama.getPosition();
            const breakpoint: string = '(min-width: 600px)';
            if (!document.getElementById('mimiMap') && window.matchMedia(breakpoint).matches) {
                this.initMinimap(position);
            }
            if (window.matchMedia(breakpoint).matches) this.centerPegMan(position);
        });

        // Gets fired when PegMan is dragged outside the miniMap
        this.panorama.addListener('visible_changed', () => this.closeStreetView(streetViewDiv));

        // Create Close button
        this.createCloseButton(streetViewDiv);
    }

    /**
     * Creates a button element with a onClick event that removes the Street View container element
     * @param {HTMLElement} streetViewDiv	The Street View container element
     */
    createCloseButton(streetViewDiv: HTMLElement) {
        const closeBtn: HTMLButtonElement = document.createElement('button');
        closeBtn.className = 'mat-icon-button';
        closeBtn.style.marginTop = '13px';
        closeBtn.style.marginRight = '16px';
        closeBtn.onclick = () => {
            this.closeStreetView(streetViewDiv);
        };

        const closeIcon: HTMLElement = document.createElement('mat-icon');
        closeIcon.textContent = 'close';
        closeIcon.className = 'mat-icon material-icons mat-icon-no-color';
        closeIcon.setAttribute('aria-label', 'close');
        closeIcon.style.color = 'white';
        closeIcon.style.paddingTop = '8px';
        closeBtn.appendChild(closeIcon);

        this.panorama.controls[google.maps.ControlPosition.TOP_RIGHT].push(closeBtn);
    }

    /**
     * Removes the Street View window, all children's and listeners
     * @param {HTMLElement} streetViewDiv	The Street View container element
     */
    closeStreetView(streetViewDiv: HTMLElement) {
        streetViewDiv.parentNode.removeChild(streetViewDiv);
    }

    /**
     * Inits a mini map
     * @param {google.maps.LatLng} position	The Street View panorama position
     */
    initMinimap(position: google.maps.LatLng) {
        // MiniMap container
        const miniMapDiv = document.createElement('div');
        miniMapDiv.id = 'mimiMap';
        miniMapDiv.style.marginTop = '8px';
        miniMapDiv.style.marginLeft = '8px';
        miniMapDiv.style.width = '180px';
        miniMapDiv.style.height = '180px';
        miniMapDiv.style.transition = 'all .3s ease';

        miniMapDiv.onmouseenter = () => {
            miniMapDiv.style.width = '280px';
            miniMapDiv.style.height = '280px';
        };

        miniMapDiv.onmouseleave = () => {
            miniMapDiv.style.width = '180px';
            miniMapDiv.style.height = '180px';
        };

        // Minimap configurations
        this.minimap = new google.maps.Map(miniMapDiv,
            {
                disableDefaultUI: true,
                center: position,
                zoom: 18,
                streetViewControl: true,
                draggable: false,
            });

        // Init MapsIndoors on minimap
        new mapsindoors.MapsIndoors({ map: this.minimap });
        this.panorama.controls[google.maps.ControlPosition.LEFT_TOP].push(miniMapDiv);

        // Set PegMan
        this.minimap.setStreetView(this.panorama);
    }

    /**
     * Centering PegMan with given position
     * @param {google.maps.LatLng} position	Position for the current shown panorama image
     */
    centerPegMan(position: google.maps.LatLng) {
        this.minimap.panTo(position);
    }
}
