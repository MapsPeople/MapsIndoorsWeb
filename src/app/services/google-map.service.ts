import { Injectable } from '@angular/core';

@Injectable({
	providedIn: 'root'
})
export class GoogleMapService {

	googleMap: google.maps.Map;
	infoWindow = new google.maps.InfoWindow;
	venue: any;

	mapOptions = {
		// center: new google.maps.LatLng(18.5793, 73.8143),
		zoom: 17,
		maxZoom: 21,
		mapTypeControl: false,
		streetViewControl: false
	}

	constructor() { }

	// #region || LOAD GOOGLE MAP
	loadMap() {
		this.googleMap = new google.maps.Map(document.getElementById('gmap'), this.mapOptions);
	}
	// #endregion

	// #region || SET INFO WINDOW AT MAP
	setInfoWindow() {
		return new google.maps.InfoWindow({});
	}
	// #endregion
}

