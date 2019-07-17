import { Injectable } from '@angular/core';
import { BreakpointObserver, BreakpointState } from '@angular/cdk/layout';
import { GoogleMapService } from './google-map.service';
import { AppConfigService } from './app-config.service';
import { Observable, BehaviorSubject } from 'rxjs';
import { SolutionService } from './solution.service';
// import { VenueService } from './venue.service';

declare const mapsindoors: any;
declare const ga: Function;

@Injectable({
	providedIn: 'root'
})
export class MapsIndoorsService {
	mapsIndoors: any;
	appConfig: any;
	floorSelectorIsSet: boolean = false;
	floorSelectorListener: any;
	isMapDirty: boolean = false;
	returnTo: any = {
		name: '',
		latLng: null,
		venue: false
	}

	private pageTitle = new BehaviorSubject<any>('');

	constructor(
		public breakpointObserver: BreakpointObserver,
		private solutionService: SolutionService,
		private googleMapService: GoogleMapService,
		private appConfigService: AppConfigService,
	) {
		this.appConfigService.getAppConfig().subscribe((appConfig) => this.appConfig = appConfig);
	}

	// #region || SET MAPS INDOORS
	initMapsIndoors() {
		return new Promise(async (resolve, reject) => {

			this.mapsIndoors = await new mapsindoors.MapsIndoors({
				map: this.googleMapService.googleMap,
				labelOptions: {
					style: {
						color: "rgba(82,82,82,1)",
						fontFamily: "Open Sans",
						fontSize: "12px",
						fontWeight: 300,
						shadowBlur: 3,
						shadowColor: "white"
					}
				}
			});

			// Set tittle attribute for map POI's
			this.solutionService.getSolutionTypes()
				.then((types) => {
					for (const type of types) {
						this.mapsIndoors.setDisplayRule(type.name, { title: '{{name}}' });
					}
				});

			// Hide Building Outline and FloorSelector if there are any 2.5D tiles available
			const buildingOutlineVisibleFrom: number = parseInt(this.appConfig.appSettings.buildingOutlineVisibleFrom);
			const floorSelectorVisibleFrom: number = parseInt(this.appConfig.appSettings.floorSelectorVisibleFrom);
			if (buildingOutlineVisibleFrom && floorSelectorVisibleFrom) {
				this.googleMapService.googleMap.addListener('zoom_changed', () => {
					const gmZoomLevel: number = this.googleMapService.googleMap.getZoom();
					// Building Outline
					gmZoomLevel >= buildingOutlineVisibleFrom ? this.showBuildingOutline() : this.mapsIndoors.setBuildingOutlineOptions({ visible: false });
					// Floor Selector
					this.floorSelector(gmZoomLevel >= floorSelectorVisibleFrom ? true : false);
				});
			}
			else this.showBuildingOutline();
			resolve();

		});
	}

	showBuildingOutline() {
		this.mapsIndoors.setBuildingOutlineOptions({
			visible: true,
			strokeWeight: 3,
			strokeColor: '#43aaa0',
			fillOpacity: 0,
			clickable: false
		});
	}
	// #endregion

	// #region || FLOOR SELECTOR
	async floorSelector(boolean) {
		const self = this;
		const googleMap = this.googleMapService.googleMap;

		if (this.floorSelectorIsSet === boolean) {
			return;
		}
		else if (boolean === true) {
			const div = await document.createElement('div');
			new mapsindoors.FloorSelector(div, this.mapsIndoors);

			this.breakpointObserver
				.observe(['(max-width: 600px)'])
				.subscribe((state: BreakpointState) => {
					if (state.matches) {
						googleMap.controls[google.maps.ControlPosition.RIGHT_CENTER].clear();
						googleMap.controls[google.maps.ControlPosition.LEFT_CENTER].push(div);
					}
					else {
						googleMap.controls[google.maps.ControlPosition.LEFT_CENTER].clear();
						googleMap.controls[google.maps.ControlPosition.RIGHT_CENTER].push(div);
					}
				});
			this.floorSelectorIsSet = true;
			// Google Analytics
			this.floorSelectorListener = google.maps.event.addListener(self.mapsIndoors, 'floor_changed', () => {
				ga('send', 'event', 'Floor selector', 'Floor was changed', `${self.mapsIndoors.getFloor()} th floor was set`);
			});
		}
		else {
			this.breakpointObserver
				.observe(['(max-width: 600px)'])
				.subscribe((state: BreakpointState) => {
					if (state.matches) {
						googleMap.controls[google.maps.ControlPosition.LEFT_CENTER].clear();
						this.floorSelectorIsSet = false;
					}
					else {
						googleMap.controls[google.maps.ControlPosition.RIGHT_CENTER].clear();
						this.floorSelectorIsSet = false;
					}
				});
			google.maps.event.removeListener(this.floorSelectorListener);
		}
	}

	setFloor(floor) {
		return new Promise(async (resolve, reject) => {
			const currentFloor = await this.mapsIndoors.getFloor();
			if (floor !== currentFloor) await this.mapsIndoors.setFloor(floor);
			resolve();
		}).catch((err) => {
			console.log(err);
		});
	}
	// #endregion

	// #region || RETURN
	setReturnToValues(name, latLng, boolean) {
		this.returnTo.name = name;
		this.returnTo.latLng = latLng;
		this.returnTo.venue = boolean;
	}

	getReturnToValues() {
		return this.returnTo;
	}
	// #endregion

	// #region || PAGE TITLE
	// Don't belong in here
	setPageTitle(title?) {
		if (title) this.pageTitle.next(title);
		else if (this.appConfig.appSettings) this.pageTitle.next(this.appConfig.appSettings.title);
	}

	getCurrentPageTitle(): Observable<any> {
		return this.pageTitle.asObservable();
	}
	// #endregion
}