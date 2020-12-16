import { Injectable } from '@angular/core';

declare const mapsindoors: any;

@Injectable({
    providedIn: 'root'
})
export class GoogleMapService {

    private infoWindow = new google.maps.InfoWindow;
    venue: any;
    googleMapView: any;
    map: any;

    mapOptions = {
        zoom: 17,
        maxZoom: 21,
        mapTypeControl: false,
        streetViewControl: false,
        fullscreenControl: true
    }

    /**
     * Creates an instance of mapsindoors.mapView.GoogleMapsView, which
     * creates a Google map and attaches it to a DOM element.
     *
     */
    initMapView(): Promise<void> {
        return new Promise((resolve): void => {
            this.googleMapView = new mapsindoors.mapView.GoogleMapsView({
                element: document.getElementById('gmap'),
                ...this.mapOptions
            });
            this.map = this.googleMapView.getMap();
            resolve();
        });
    }

    /**
     * @description Populates the info window with text and a position.
     * @param {string} locationName - The location name.
     * @param {google.maps.LatLng} anchor - The location coordinate.
     * @memberof GoogleMapService
     */
    public updateInfoWindow(locationName: string, anchor: google.maps.LatLng): void {
        this.infoWindow.setContent(`<div class="infowindow text-link">${locationName}</div>`);
        this.infoWindow.setPosition(anchor);
    }

    /**
     * @description Opens the info window.
     * @memberof GoogleMapService
     */
    public openInfoWindow(): void {
        this.infoWindow.open(this.map);
    }

    /**
     * @description Closes the info window.
     * @memberof GoogleMapService
     */
    public closeInfoWindow(): void {
        this.infoWindow.close();
    }

}
