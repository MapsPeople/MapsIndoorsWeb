import { Injectable } from '@angular/core';

declare const mapsindoors: any;

@Injectable({
    providedIn: 'root'
})
export class MiLiveDataService {

    private liveDataManager: any;

    constructor() { }

    /**
     * Enable live data on the map for all live data domain types.
     * @param mapsIndoorsInstance - The instance of the MapsIndoors.
     */
    enableAll(mapsIndoorsInstance): void {
        if (!this.liveDataManager) {
            this.liveDataManager = new mapsindoors.LiveDataManager(mapsIndoorsInstance);
        }

        this.liveDataManager.enableLiveData(mapsindoors.LiveDataManager.LiveDataDomainTypes.POSITION);
        this.liveDataManager.enableLiveData(mapsindoors.LiveDataManager.LiveDataDomainTypes.OCCUPANCY);
        this.liveDataManager.enableLiveData(mapsindoors.LiveDataManager.LiveDataDomainTypes.AVAILABILITY);
    }
}
