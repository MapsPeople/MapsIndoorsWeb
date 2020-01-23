import { Component, Input, OnDestroy } from '@angular/core';
import { MatDialog } from '@angular/material';
import { Subscription } from 'rxjs';
import { ShareRouteDialogComponent } from './share-route-dialog/share-route-dialog.component';
import { AppConfigService } from 'src/app/services/app-config.service';
import { ThemeService } from 'src/app/services/theme.service';

@Component({
    selector: 'share-route',
    templateUrl: './share-route.component.html',
    styleUrls: ['./share-route.component.scss']
})
export class ShareRouteComponent implements OnDestroy {
    @Input() private venueId: string;
    @Input() private originId: string;
    @Input() private destination: string;
    @Input() private travelMode: string;
    @Input() private totalTravelDuration: string;

    private phoneCountryCode: string;
    public colors;
    private subscriptions = new Subscription();

    constructor(
        private dialog: MatDialog,
        private appConfigService: AppConfigService,
        private themeService: ThemeService
    ) {
        this.subscriptions
            .add(this.appConfigService.getAppConfig()
                .subscribe((appConfig): void => {
                    this.phoneCountryCode = appConfig.appSettings.phoneCountryCode;
                })
            )
            .add(this.themeService.getThemeColors()
                .subscribe((appConfigColors): void => {
                    this.colors = appConfigColors;
                })
            );
    }

    /**
     * @description Get icon name for selected travel mode.
     * @private
     * @param {string} travelMode - Selected travel mode.
     * @returns {string} Name of icon.
     * @memberof ShareRouteComponent
     */
    private getTravelModeIcon(travelMode: string): string {
        const travelModes = [
            { mode: 'walking', icon: 'directions_walk' },
            { mode: 'bicycling', icon: 'directions_bike' },
            { mode: 'transit', icon: 'directions_transit' },
            { mode: 'driving', icon: 'drive_eta' }
        ];
        return travelModes.find((tMode): boolean => tMode.mode === travelMode.toLowerCase()).icon;
    }

    /**
     * @description Open share route dialog.
     * @memberof ShareRouteComponent
     */
    public openShareRouteDialog(): void {
        this.dialog.open(ShareRouteDialogComponent, {
            width: '528px',
            autoFocus: false,
            disableClose: true,
            data: {
                colors: this.colors,
                venueId: this.venueId,
                originId: this.originId,
                destination: this.destination,
                travelMode: this.getTravelModeIcon(this.travelMode),
                totalTravelDuration: this.totalTravelDuration,
                phoneCountryCode: this.phoneCountryCode
            },
        });
    }

    ngOnDestroy(): void {
        this.subscriptions.unsubscribe();
    }

}
