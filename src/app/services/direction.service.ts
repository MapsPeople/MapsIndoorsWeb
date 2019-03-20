import { Injectable, NgZone } from '@angular/core';
import { Subject, Observable, Subscription } from 'rxjs';
import { MapsIndoorsService } from './maps-indoors.service';
import { GoogleMapService } from './google-map.service';

@Injectable({
	providedIn: 'root'
})
export class DirectionService {
	destinationQuery: string = "" // Used for horizontal legs
	directionsLegs = [] // All direction legs

	// NOTE: variables below are updated for each leg
	animatedPolyline: any; // Animated polyline
	animatedPolylineAnimation: any; // Polyline animation (calculated for each leg/polyline) 
	staticPolyline: any; // Instant drawn background for polyline
	polylinePath = [];  // Path for polyline property

	private legIndex = new Subject<any>();

	constructor(
		private mapsIndoorsService: MapsIndoorsService,
		private googleMapService: GoogleMapService,
		public _ngZone: NgZone,
	) { }


	// #region || DIRECTION LEGS
	setDirectionLegs(legs) {
		this.directionsLegs = legs;
	}

	setLegIndex(index) {
		this.legIndex.next(index);
		this.drawPolylines(index);
	}

	clearLegIndex() {
		this.legIndex.next(0);
	}

	getLegIndex(): Observable<any> {
		return this.legIndex.asObservable();
	}
	// #endregion

	// #region || POLYLINE
	async drawPolylines(index) {
		const steps = [];
		const coordinatesArray = [];

		// Dispose previous polyline
		if (this.staticPolyline && this.animatedPolyline) { 
			await this.disposePolylines() 
		}

		// Push steps to array
		if (this.directionsLegs[index].travel_mode && this.directionsLegs[index].travel_mode === "TRANSIT") {
			for (let step of [this.directionsLegs[index]]) {
				steps.push(step);
			}
		}
		else {
			for (let step of this.directionsLegs[index].steps) {
				steps.push(step);
			}
		}

		// Set correct floor for this step
		let legFloor = steps[0].end_location.zLevel ? steps[0].end_location.zLevel : 0;
		await this.mapsIndoorsService.setFloor(legFloor);

		// Push coordinates for each step to array
		for (let step of steps) {
			for (let coordinate of step.path) {
				coordinatesArray.push({ lat: coordinate.lat, lng: coordinate.lng })
			}
		}

		// Adjust map to fit all coordinates of this step
		await this.fitMap(coordinatesArray);

		// Set non animated polyline
		await this.setStaticPolyline(coordinatesArray);

		// Draw animated polyline
		await this.setAnimatedPolyline();
		await this.animatePolyline(coordinatesArray);
	}

	fitMap(coordinates) {
		let self = this;
		return new Promise(async (resolve, reject) => {
			const bounds = new google.maps.LatLngBounds();
			// Extend bounds with each point in array
			for (let latLng of coordinates) {
				bounds.extend(latLng);
			}
			// Pan and zoom map to fit polyline nicely
			await this.googleMapService.googleMap.fitBounds(bounds);

			await new Promise((resolve, reject) => {
				// google.maps.event.addListenerOnce(this.googleMapService.googleMap, 'bounds_changed', async function () {
				// NOTE: TilesLoaded doesn't work when it's just a new floor – maybe a fix would be to use the MI-floorChanged-listener
				// google.maps.event.addListenerOnce(self.googleMapService.googleMap, "tilesloaded", resolve);
				// console.log('tiles loaded')
				google.maps.event.addListenerOnce(self.googleMapService.googleMap, "idle", resolve);
				// });
			});

			resolve();
		});
	}

	async disposePolylines() {
		clearInterval(this.animatedPolylineAnimation);
		this.polylinePath = [];
		await this.staticPolyline.setMap(null);
		await this.animatedPolyline.setMap(null);
		return
	}

	// #region - Static Polyline
	setStaticPolyline(coordinatesArray) {
		this.staticPolyline = new google.maps.Polyline({
			path: coordinatesArray,
			geodesic: true,
			strokeColor: '#1E88E5',
			strokeOpacity: .5,
			strokeWeight: 6
		});
		this.staticPolyline.setMap(this.googleMapService.googleMap);
	}
	// #endregion

	// #region - Animated Polyline
	setAnimatedPolyline() {
		this.animatedPolyline = new google.maps.Polyline({
			path: [],
			geodesic: true,
			strokeColor: '#1E88E5',
			strokeOpacity: 1.0,
			strokeWeight: 3,
			map: this.googleMapService.googleMap,
			zIndex: 200
		});
		this.animatedPolyline.setVisible(true);
	}

	async animatePolyline(coordinatesArray) {
		let speed: number = 0;
		let distance: number = 0;
		let fps: number = 60;
		let duration: number = 5;
		let miles: boolean = false;

		for (let coordinate of coordinatesArray) {

			if (coordinate == coordinatesArray[0]) {
				let pointA: any = new google.maps.LatLng(coordinatesArray[0].lat, coordinatesArray[0].lng);
				pointA.distance = 0;
				this.polylinePath.push(pointA)
			}

			let pointA = this.polylinePath[this.polylinePath.length - 1];
			let pointB: any = coordinate instanceof google.maps.LatLng ? coordinate : new google.maps.LatLng(coordinate.lat, coordinate.lng);
			if (!pointA.equals(pointB)) {

				if (miles) {
					pointB.distance = await this.getDistanceInMiles(pointA, pointB);
				}
				else {
					pointB.distance = (pointA.distance + google.maps.geometry.spherical.computeDistanceBetween(pointA, pointB));
				}

				this.polylinePath.push(pointB);
			}
		}

		speed = this.polylinePath[this.polylinePath.length - 1].distance / duration;

		let self = this;
		this.animatedPolylineAnimation = setInterval(() => {
			// Stop looping when hitting end of path if the loop var is set to false
			if (distance > self.polylinePath[self.polylinePath.length - 1].distance) {
				distance = 0;
			}
			distance += (speed < 50 ? 15 : speed) / fps;
			self.animatedPolyline.setPath(self.getPath(distance));
		}, 1000 / fps);
	}

	getDistanceInMiles(pointA, pointB) {
		const distance_in_meters = google.maps.geometry.spherical.computeDistanceBetween(pointA, pointB);
		return distance_in_meters * 0.000621371; // convert meters to miles
	}

	getPath(distance) {
		if (distance <= 0) {
			// If getting a direction from and to the same point
			return [];
		}
		else if (distance >= this.polylinePath[this.polylinePath.length - 1].distance) {
			// Stops the animation when hitting end of path
			clearInterval(this.animatedPolylineAnimation);
			return this.polylinePath;
		}
		else {
			let index = this.findPolylinePathIndex(distance);
			let pointA = this.polylinePath[index];
			let pointB = this.polylinePath[index + 1];
			let heading = google.maps.geometry.spherical.computeHeading(pointA, pointB);
			let delta = distance - pointA.distance;
			let p = google.maps.geometry.spherical.computeOffset(pointA, delta, heading);
			let result = this.polylinePath.slice(0, index + 1);
			result.push(p);
			return result;
		}
	}

	findPolylinePathIndex(distance) {
		if (distance <= 0) {
			return 0;
		}
		for (var i = 0; i < this.polylinePath.length; i++) {
			if (this.polylinePath[i].distance > distance) {
				return i - 1;
			}
		}
		return this.polylinePath.length - 1;
	}
	// #endregion
	
	// #endregion
}