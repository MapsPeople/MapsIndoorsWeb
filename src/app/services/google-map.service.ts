import { Injectable } from '@angular/core';

@Injectable({
    providedIn: 'root'
})
export class GoogleMapService {

    googleMap: google.maps.Map;
    private infoWindow = new google.maps.InfoWindow;
    venue: any;

    mapOptions = {
        // center: new google.maps.LatLng(18.5793, 73.8143),
        zoom: 17,
        maxZoom: 21,
        mapTypeControl: false,
        streetViewControl: false
    }

    // #region || LOAD GOOGLE MAP
    initMap() {
        return new Promise(async (resolve) => {
            this.googleMap = await new google.maps.Map(document.getElementById('gmap'), this.mapOptions);
            resolve();
        });
    }
    // #endregion

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
        this.infoWindow.open(this.googleMap);
    }

    /**
     * @description Closes the info window.
     * @memberof GoogleMapService
     */
    public closeInfoWindow(): void {
        this.infoWindow.close();
    }
}