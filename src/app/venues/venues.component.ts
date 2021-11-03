import { Component, OnInit, OnDestroy } from '@angular/core';
import { NotificationService } from '../services/notification.service';
import { TranslateService } from '@ngx-translate/core';
import { SolutionService } from '../services/solution.service';
import { AppConfigService } from '../services/app-config.service';
import { VenueService } from '../services/venue.service';
import { GoogleMapService } from '../services/google-map.service';
import { Router } from '@angular/router';
import { MapsIndoorsService } from '../services/maps-indoors.service';
import { ThemeService } from '../services/theme.service';
import { Subscription } from 'rxjs';
import { TrackerService } from '../services/tracker.service';
import { UserAgentService } from '../services/user-agent.service';
import { Venue } from '@mapsindoors/typescript-interfaces';


@Component({
    selector: 'venue-list',
    templateUrl: './venues.component.html',
    styleUrls: ['./venues.component.scss']
})
export class VenuesComponent implements OnInit, OnDestroy {
    colors: any;
    venues: any[] = [];
    appConfig: any;
    solutionId: string;
    themeServiceSubscription: Subscription;
    appConfigSubscription: Subscription;

    constructor(
        private router: Router,
        private notificationService: NotificationService,
        private translateService: TranslateService,
        private solutionService: SolutionService,
        private appConfigService: AppConfigService,
        private themeService: ThemeService,
        private venueService: VenueService,
        private mapsIndoorsService: MapsIndoorsService,
        private googleMapService: GoogleMapService,
        private trackerService: TrackerService,
        private userAgentService: UserAgentService
    ) {
        this.appConfigSubscription = this.appConfigService.getAppConfig().subscribe((appConfig) => this.appConfig = appConfig);
        this.themeServiceSubscription = this.themeService.getThemeColors().subscribe((appConfigColors) => this.colors = appConfigColors);
    }

    ngOnInit(): void {
        this.getPreviousVenue();
        this.mapsIndoorsService.setFitSelectionInfo(null);
    }

    // #region || GET PREVIOUS VENUE
    /**
     * @description Auto select previous visited venue if any
     * @returns {Promise<void>}
     */
    getPreviousVenue(): void {
        this.solutionService.getSolutionId()
            .then(async (id: string) => {
                this.solutionId = id;
                const storedSolution = JSON.parse(this.userAgentService.localStorage.getItem('MI:' + this.solutionId));

                if (storedSolution && storedSolution.lastVenue) {
                    const venue = await this.venueService.getVenueById(storedSolution.lastVenue);
                    this.setVenue(venue);
                } else {
                    this.mapsIndoorsService.setPageTitle();
                    this.getVenues();
                }
            })
            .catch(() => {
                this.notificationService.displayNotification(
                    this.translateService.instant('Error.IncorrectVenue')
                );

                this.getVenues();
            });
    }
    // #endregion

    // #region || GET ALL VENUES
    getVenues(): void {
        this.venueService.getVenues()
            .then((venues: Venue[]): void => {
                // Set Venue and navigate to search page if solution only has one venue
                if (venues && venues.length === 1) {
                    this.setVenue(venues[0]);
                } else if (this.venueService.fitVenues) {
                    this.fitVenuesInView(venues);
                }

                this.venues = venues;
            });
    }

    private async fitVenuesInView(venues): Promise<any> {
        // If the solution has multiple venues fit them all inside bbox
        let bounds = new google.maps.LatLngBounds();
        if (this.appConfig.appSettings && !this.appConfig.appSettings.defaultVenue) {
            if (venues && venues.length !== 0) {
                for (const venue of venues) {
                    for (const coordinates of venue.geometry.coordinates) {
                        for (const coordinate of coordinates) {
                            bounds.extend({ lat: coordinate[1], lng: coordinate[0] });
                        }
                    }
                }
            }
            this.googleMapService.map.fitBounds(bounds);
        } else if (this.appConfig.appSettings && this.appConfig.appSettings.defaultVenue && this.appConfig.appSettings.defaultVenue.length === 24) {
            // Zoom in to default venue if any
            const venueId = await this.appConfig.appSettings.defaultVenue;
            const venue = await this.venueService.getVenueById(venueId);
            if (venue) {
                const bbox = venue.geometry.bbox;
                bounds = new google.maps.LatLngBounds({ lat: bbox[1], lng: bbox[0] }, { lat: bbox[3], lng: bbox[2] });
                this.googleMapService.map.fitBounds(bounds);
            } else {
                console.log('Default venue ID is not correct'); /* eslint-disable-line no-console */ /* TODO: Improve error handling */
            }

            this.googleMapService.map.fitBounds(bounds);

            // If there is a position, and it is inside the venue bounds, pan to the position
            this.userAgentService.panToPositionIfWithinBounds(bounds);
        }
    }
    // #endregion

    // #region || SET VENUE
    // Set venue and go to search-page
    async setVenue(venue): Promise<void> {
        this.venueService.setVenue(venue, this.appConfig);
        this.userAgentService.localStorage.setItem('MI:' + this.solutionId, JSON.stringify({ lastVenue: venue.id }));
        this.mapsIndoorsService.setPageTitle();
        this.mapsIndoorsService.showFloorSelectorAfterUserInteraction();
        const solutionName = await this.solutionService.getSolutionName();
        this.router.navigate([`${solutionName}/${venue.id}/search`]);
        this.trackerService.sendEvent('Venues page', 'Venue selected', `${venue.venueInfo.name} was selected`, true);
    }
    // #endregion

    ngOnDestroy(): void {
        this.appConfigSubscription.unsubscribe();
        this.themeServiceSubscription.unsubscribe();
    }
}
