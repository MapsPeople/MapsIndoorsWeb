import { Injectable } from '@angular/core';
import { BreakpointObserver, BreakpointState } from '@angular/cdk/layout';
import { GoogleMapService } from './google-map.service';
import { AppConfigService } from './app-config.service'
import { Subject, Observable } from 'rxjs';
import { SolutionService } from './solution.service';
// import { VenueService } from './venue.service';

declare var mapsindoors: any;

@Injectable({
	providedIn: 'root'
})
export class MapsIndoorsService {
	mapsIndoors: any;
	private pageTitle = new Subject<any>();
	appConfig: any;
	floorSelectorIsSet: boolean = false;
	floorSelectorListener: any;
	isMapDirty: boolean = false;
	returnTo: any = {
		name: '',
		latLng: null,
		venue: false
	}

	constructor(
		public breakpointObserver: BreakpointObserver,
		private solutionService: SolutionService,
		private googleMapService: GoogleMapService,
		private appConfigService: AppConfigService,
	) { }

	// #region || SET MAPS INDOORS
	setMapsIndoors() {
		this.mapsIndoors = new mapsindoors.MapsIndoors({
			map: this.googleMapService.googleMap,
			buildingOutlineOptions: {
				visible: true,
				strokeWeight: 3,
				strokeColor: '#43aaa0',
				fillOpacity: 0,
				clickable: false
			}
		});

		// Set tittle attribute for map POI's
		this.solutionService.getSolutionTypes().then(types => {
			for (let type of types) {
				this.mapsIndoors.setDisplayRule(type.name, { title: '{{name}}' })
			}
		})
	}
	// #endregion

	// #region || FLOOR SELECTOR
	async floorSelector(boolean) {
		let self = this;
		let googleMap = this.googleMapService.googleMap;

		if (this.floorSelectorIsSet == boolean) {
			return
		}
		else if (boolean == true) {
			let div = await document.createElement('div')
			new mapsindoors.FloorSelector(div, this.mapsIndoors);

			this.breakpointObserver
				.observe(['(max-width: 600px)'])
				.subscribe((state: BreakpointState) => {
					if (state.matches) {
						googleMap.controls[google.maps.ControlPosition.RIGHT_CENTER].clear()
						googleMap.controls[google.maps.ControlPosition.LEFT_CENTER].push(div);
					}
					else {
						googleMap.controls[google.maps.ControlPosition.LEFT_CENTER].clear()
						googleMap.controls[google.maps.ControlPosition.RIGHT_CENTER].push(div);
					}
				});
			this.floorSelectorIsSet = true;
		}
		else {
			this.breakpointObserver
				.observe(['(max-width: 600px)'])
				.subscribe((state: BreakpointState) => {
					if (state.matches) {
						googleMap.controls[google.maps.ControlPosition.LEFT_CENTER].clear()
						this.floorSelectorIsSet = false;
					}
					else {
						googleMap.controls[google.maps.ControlPosition.RIGHT_CENTER].clear()
						this.floorSelectorIsSet = false;
					}
				});
			google.maps.event.removeListener(this.floorSelectorListener);
		}
	}

	async setFloor(floor) {
		const currentFloor = await this.mapsIndoors.getFloor();
		if (floor != currentFloor) {
			await this.mapsIndoors.setFloor(floor)
		}
		return
	}
	// #endregion

	// #region || RETURN
	setReturnToValues(name, latLng, boolean) {
		this.returnTo.name = name;
		this.returnTo.latLng = latLng;
		this.returnTo.venue = boolean;
	}

	getReturnToValues() {
		return this.returnTo
	}
	// #endregion

	// #region || PAGE TITLE
	// Don't belong in here
	async setPageTitle(title?) {
		if (title) {
			this.pageTitle.next(title);
		}
		else {
			this.appConfig = this.appConfig ? this.appConfig : await this.appConfigService.appConfig;
			this.pageTitle.next(this.appConfig.appSettings.title);
		}
	}

	getCurrentPageTitle(): Observable<any> {
		return this.pageTitle.asObservable();
	}
	// #endregion



}