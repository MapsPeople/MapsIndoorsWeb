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
        this.liveDataManager.enableLiveData(mapsindoors.LiveDataManager.LiveDataDomainTypes.OCCUPANCY, this.customLiveUpdateCallback.bind(this));
        this.liveDataManager.enableLiveData(mapsindoors.LiveDataManager.LiveDataDomainTypes.AVAILABILITY, this.customLiveUpdateCallback.bind(this));
    }

    /**
     * Custom callback for handling badge rendering. Overrides the default callback in the SDK with one that can render the occupancy badge with
     * a percentage value of utilization instead of number of occupants.
     *
     * @param liveUpdateEvent {object}
     */
    private customLiveUpdateCallback(liveUpdateEvent): void {
        liveUpdateEvent.data.forEach(async (locations, domain): Promise<void> => {  // For some reason, this Angular app will not accept a for..of loop like we do in the kiosk project.
            if (![mapsindoors.LiveDataManager.LiveDataDomainTypes.OCCUPANCY, mapsindoors.LiveDataManager.LiveDataDomainTypes.AVAILABILITY].includes(domain)) {
                return;
            }

            for (const location of locations) {
                const availabilityUpdate = location.liveUpdates.get(mapsindoors.LiveDataManager.LiveDataDomainTypes.AVAILABILITY);
                const occupancyUpdate = location.liveUpdates.get(mapsindoors.LiveDataManager.LiveDataDomainTypes.OCCUPANCY);

                const displayRule = this.mapsIndoorsInstance.getDisplayRule(location, true);
                const icon = await displayRule.getIcon();

                if (!icon) {
                    continue;
                }

                let badgedIcon;

                if (occupancyUpdate && location.properties.fields.livedataRenderOccupancyAs && location.properties.fields.livedataRenderOccupancyAs.value && location.properties.fields.livedataRenderOccupancyAs.value.toLowerCase() === '% utilization') {
                    // Badge with percentage based on custom property
                    const badgeText = occupancyUpdate.properties.capacity > 0 ? `${Math.round(occupancyUpdate.properties.nrOfPeople / occupancyUpdate.properties.capacity * 100)}%` : '-';
                    badgedIcon = await mapsindoors.BadgeRenderer.TextBadge.overlay(icon, {
                        text: badgeText
                    });
                } else if (availabilityUpdate && occupancyUpdate) {
                    // Badge with combination of availability and occupancy
                    if (occupancyUpdate.properties.nrOfPeople > 0 && availabilityUpdate.properties.available === false) {
                        // Occupied + not available = Red bagde with x
                        badgedIcon = await mapsindoors.BadgeRenderer.UnavailableBadge.overlay(icon);
                    } else if (occupancyUpdate.properties.nrOfPeople > 0 && availabilityUpdate.properties.available === true) {
                        // Occupied + available: Orange badge with occupant count (1-n)
                        badgedIcon = await new mapsindoors.BadgeRenderer({
                            text: occupancyUpdate.properties.nrOfPeople.toString(),
                            backgroundColor: '#ad5f00' // MIDT $color-bronze-60
                            // TODO: Import midt and use variable from that
                        }).overlay(icon);
                    } else if (occupancyUpdate.properties.nrOfPeople === 0 && availabilityUpdate.properties.available === false) {
                        // Unoccupied + not available: Orange badge with "-"
                        badgedIcon = await new mapsindoors.BadgeRenderer({
                            text: '-',
                            backgroundColor: '#ad5f00' // MIDT $color-bronze-60
                        }).overlay(icon);
                    } else if (occupancyUpdate.properties.nrOfPeople === 0 && availabilityUpdate.properties.available === true) {
                        // Unoccupied + available: Green badge with ✓
                        badgedIcon = await mapsindoors.BadgeRenderer.AvailableBadge.overlay(icon);
                    }

                } else if (domain === mapsindoors.LiveDataManager.LiveDataDomainTypes.AVAILABILITY) {
                    // Badge with availability indicator (x, ✓)
                    if (availabilityUpdate.properties.available === true) {
                        badgedIcon = await mapsindoors.BadgeRenderer.AvailableBadge.overlay(icon);
                    } else if (availabilityUpdate.properties.available === false) {
                        badgedIcon = await mapsindoors.BadgeRenderer.UnavailableBadge.overlay(icon);
                    }

                } else if (domain === mapsindoors.LiveDataManager.LiveDataDomainTypes.OCCUPANCY) {
                    // Badge with nrOfPeople as text
                    badgedIcon = await mapsindoors.BadgeRenderer.TextBadge.overlay(icon, {
                        text: occupancyUpdate.properties.nrOfPeople.toString(),
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
