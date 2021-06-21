import { Injectable } from '@angular/core';

declare const mapsindoors: any;

@Injectable({
    providedIn: 'root'
})
export class GoogleMapService {
    private infoWindow = new google.maps.InfoWindow;

    public googleMapView: any;
    public map: google.maps.Map;

    /**
     * Creates an instance of mapsindoors.mapView.GoogleMapsView, which
     * creates a Google map and attaches it to a DOM element.
     *
     * @returns {Promise<void>}
     */
    initMapView(): Promise<void> {
        return new Promise((resolve): void => {
            this.googleMapView = new mapsindoors.mapView.GoogleMapsView({
                element: document.getElementById('gmap'),
                zoom: 17,
                mapTypeControl: false,
                streetViewControl: false,
                fullscreenControl: true,
                clickableIcons: false
            });
            this.map = this.googleMapView.getMap();

            resolve();
        });
    }

    /**
     * Populates the info window with text and a position.
     *
     * @param {string} locationName - The location name.
     * @param {google.maps.LatLng} anchorPoint - The location coordinate.
     */
    public updateInfoWindow(locationName: string, anchorPoint: google.maps.LatLng): void {
        this.infoWindow.setContent(`<div class="infowindow text-link">${locationName}</div>`);
        this.infoWindow.setPosition(anchorPoint);
    }

    /**
     * Open info window.
     */
    public openInfoWindow(): void {
        this.infoWindow.open(this.map);
    }

    /**
     * Closes info window.
     */
    public closeInfoWindow(): void {
        this.infoWindow.close();
    }
}
