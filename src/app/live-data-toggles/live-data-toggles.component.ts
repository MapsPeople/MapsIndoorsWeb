import { Component, OnInit } from '@angular/core';

import { LiveDataService } from '@mapsindoors/web-shared';
import { MapsIndoorsService } from '../services/maps-indoors.service';
import { SolutionService } from '../services/solution.service';

interface LiveDataDomainType {
    type: string,
    checked: boolean
}

@Component({
    selector: 'app-live-data-toggles',
    templateUrl: './live-data-toggles.component.html',
    styleUrls: ['./live-data-toggles.component.scss']
})
export class LiveDataTogglesComponent implements OnInit {
    public activeDomainTypes: LiveDataDomainType[] = [];

    private sessionStorageKey: string;

    constructor(
        private liveDataService: LiveDataService,
        private mapsindoorsService: MapsIndoorsService,
        private solutionService: SolutionService
    ) { }

    ngOnInit(): void {
        this.sessionStorageKey = `MI-LIVEDATA-TOGGLE-STATE-${this.solutionService.getSolutionName()}`;

        // If session is populated with values, use those otherwise enable all toggles.
        if (window.sessionStorage.getItem(this.sessionStorageKey)) {
            this.activeDomainTypes = JSON.parse(window.sessionStorage.getItem(this.sessionStorageKey));

            // Enable or disable domain types based on session.
            this.activeDomainTypes.forEach(domainType => {
                this.setLiveDataState(domainType.checked, domainType.type);
            });
        } else {
            this.liveDataService.liveDataManager.LiveDataInfo.activeDomainTypes()
                .then(activeDomainTypes => {
                    if (this.activeDomainTypes.length === 0) {
                        this.activeDomainTypes = activeDomainTypes?.map(domainType => ({ type: domainType, checked: true }));
                    }

                    window.sessionStorage.setItem(this.sessionStorageKey, JSON.stringify(this.activeDomainTypes));
                });
        }
    }

    /**
     * Enable or disable a live data domain type.
     *
     * @param {boolean} isChecked
     * @param {any[]} domain
     */
    private setLiveDataState(isChecked: boolean, domain: any):  void {
        isChecked ? this.liveDataService.enableLiveData(this.mapsindoorsService.mapsIndoors, [domain]) :
            this.liveDataService.disableLiveData([domain]);
    }

    /**
    * Enable or disable the live data domain type when toggling, and save the state in session storage.
    *
    * @param {any} event
    */
    public onToggleLiveData(event): void {
        const domain = event.srcElement.id;
        const isChecked: boolean = event.target.checked;

        this.activeDomainTypes.find(domainType => domainType.type === domain).checked = isChecked;
        this.setLiveDataState(isChecked, domain);

        window.sessionStorage.setItem(this.sessionStorageKey, JSON.stringify(this.activeDomainTypes));
    }
}
