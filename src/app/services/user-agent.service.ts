import { Injectable } from '@angular/core';
import { BreakpointObserver, BreakpointState } from '@angular/cdk/layout';
import { BehaviorSubject, ReplaySubject, Observable } from 'rxjs';
import { TranslateService } from '@ngx-translate/core';
import { NotificationService } from './notification.service';
import { storageFactory } from 'storage-factory';

declare const mapsindoors: any;

@Injectable({
    providedIn: 'root'
})
export class UserAgentService {

    private isIe: boolean;
    private isDeviceHandset = new BehaviorSubject<boolean>(false);
    private currentPosition = new ReplaySubject<any>(1);
    private positionErrorSubject = new ReplaySubject<Object>(1);
    public positionControl;
    public localStorage: Storage;
    public sessionStorage: Storage;
    private positionErrorShown = false;
    private positionAutoPanned = false;

    constructor(
        private breakpointObserver: BreakpointObserver,
        private translateService: TranslateService,
        private notificationService: NotificationService
    ) {
        this.isIe = (navigator.userAgent.match(/Trident/g) || navigator.userAgent.match(/MSIE/g)) ? true : false;
        this.breakpointObserver
            .observe(['(min-width: 600px)'])
            .subscribe((state: BreakpointState) => this.isDeviceHandset.next(state.matches ? false : true));

        this.localStorage = storageFactory(() => localStorage);
    }

    /**
     * @description Returns a boolean based on user agent.
     * @returns {Boolean} Returns true if IE otherwise false.
     */
    IsInternetExplorer(): boolean {
        return this.isIe;
    }

    /**
     * @description Returns a boolean based on browser with.
     * @returns {Observable<boolean>} Returns true if browser with hits 600px or less.
     */
    isHandset(): Observable<boolean> {
        return this.isDeviceHandset.asObservable();
    }

    /**
     * Fired when position control reports a position error.
     *   1-3: GeolocationError code.
     *   10: Geolocation not available.
     *   11: Inaccurate position.
     * Will show a notification on the first receival if error is not about inaccuracy (this is handled elsewhere)
     */
    public positionError(error): void {
        this.positionErrorSubject.next(error);
        if (!this.positionErrorShown && error.code !== 11) { // 11: Inaccurate position
            this.notificationService.displayNotification(this.translateService.instant('Error.NoPosition'));
            this.positionErrorShown = true;
        }
    }

    /**
     * Fired when position control recevied a position.
     * Pans map to current position if requirements are met, and updates currentPosition.
     * @param eventPayload Object
     */
    public positionReceived(eventPayload): void {
        if (!this.positionAutoPanned && eventPayload.selfInvoked === true) {
            if (eventPayload.accurate === true) {
                this.positionControl.panToCurrentPosition();
            } else {
                this.notificationService.displayNotification(this.translateService.instant('Error.NoPosition'));
            }
            this.positionAutoPanned = true;
        }
        this.currentPosition.next(eventPayload.position);
    }

    /**
     * @description Uses the device position to determinate where the user are.
     * @returns {Promise} Gets and return the current position of the device.
     * @memberof UserAgentService
     */
    public getCurrentPosition(): Promise<any> {
        return new Promise((resolve, reject): void => {
            if (this.positionControl.currentPosition) {
                resolve(this.positionControl.currentPosition);
                return;
            }

            this.positionControl.watchPosition();
            this.currentPosition.subscribe((position): void => {
                resolve(position);
            });

            this.positionErrorSubject.subscribe((error): void => {
                reject(error);
            });
        });
    }

    /**
     * Pans to current position if:
     * a) there is a valid and accurate position
     * b) the position is within given bounds
     *
     * @param bounds google.maps.LatLngBounds
     */
    public panToPositionIfWithinBounds(bounds: google.maps.LatLngBounds): void {
        if (this.positionControl && this.positionControl.hasValidPosition() && this.positionControl.positionState !== mapsindoors.PositionState.POSITION_INACCURATE) {
            const posLatLng = new google.maps.LatLng({ lat: this.positionControl.currentPosition.coords.latitude, lng: this.positionControl.currentPosition.coords.longitude });
            if (bounds.contains(posLatLng)) {
                this.positionControl.panToCurrentPosition();
            }
        }
    }
}
