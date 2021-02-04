import { Injectable } from '@angular/core';
import { throttle } from 'throttle-debounce';

// TODO: Move this to shared library: https://mapspeople.atlassian.net/browse/MIAJS-1401

declare const mapsindoors: any;

@Injectable({
    providedIn: 'root'
})
export class MiLiveDataService {

    private liveDataManager: any;
    private mapsIndoorsInstance: any;
    private displayRuleOverridesThrottler;
    private queuedDisplayRuleOverrides;

    constructor() {
        this.queuedDisplayRuleOverrides = new Map(); // Holding a map of display rules override that is only set periodically.

        // Set display rule overrides on map periodically for performance reasons
        this.displayRuleOverridesThrottler = throttle(2000, () => {
            this.mapsIndoorsInstance.overrideDisplayRule(this.queuedDisplayRuleOverrides);
            this.queuedDisplayRuleOverrides.clear();
        });
    }

    /**
     * Enable live data on the map for all live data domain types.
     * @param mapsIndoorsInstance - The instance of the MapsIndoors.
     */
    enableAll(mapsIndoorsInstance: typeof mapsindoors): void {
        this.mapsIndoorsInstance = mapsIndoorsInstance;
        if (!this.liveDataManager) {
            this.liveDataManager = new mapsindoors.LiveDataManager(mapsIndoorsInstance);
        }

        this.liveDataManager.enableLiveData(mapsindoors.LiveDataManager.LiveDataDomainTypes.POSITION);
        this.liveDataManager.enableLiveData(mapsindoors.LiveDataManager.LiveDataDomainTypes.OCCUPANCY, this.customOccupancyCallback.bind(this));
        this.liveDataManager.enableLiveData(mapsindoors.LiveDataManager.LiveDataDomainTypes.AVAILABILITY);
    }

    private customOccupancyCallback(liveUpdateEvent): void {
        liveUpdateEvent.data.forEach(async (locations, domain) => { // For some reason, this Angular app will not accept a for..of loop like we do in the kiosk project.
            if (domain !== mapsindoors.LiveDataManager.LiveDataDomainTypes.OCCUPANCY) {
                return;
            }

            for (const location of locations) {
                const update = location.liveUpdates.get(domain);
                const displayRule = this.mapsIndoorsInstance.getDisplayRule(location, true);
                const icon = await displayRule.getIcon();

                if (!icon) {
                    continue;
                }

                let badgedIcon;

                if (location.properties.fields.livedataRenderOccupancyAs && location.properties.fields.livedataRenderOccupancyAs.value && location.properties.fields.livedataRenderOccupancyAs.value.toLowerCase() === '% utilization') {
                    // Show badge with percentage of utilization (capacity) or "-" if invalid data
                    const badgeText = update.properties.capacity > 0 ? `${Math.round(update.properties.nrOfPeople / update.properties.capacity * 100)}%` : '-';
                    badgedIcon = await mapsindoors.BadgeRenderer.TextBadge.overlay(icon, {
                        text: badgeText
                    });
                } else {
                    // Show badge with nrOfPeople as text
                    badgedIcon = await mapsindoors.BadgeRenderer.TextBadge.overlay(icon, {
                        text: update.properties.nrOfPeople.toString(),
                    });
                }

                if (badgedIcon) {
                    const displayRuleOverrides = { iconSize: { width: badgedIcon.width, height: badgedIcon.height }, icon: badgedIcon };
                    this.queuedDisplayRuleOverrides.set(location.id, displayRuleOverrides);
                    this.displayRuleOverridesThrottler();
                }
            }
        });

    }
}
