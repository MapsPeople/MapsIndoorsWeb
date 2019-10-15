import { Injectable } from '@angular/core';
import { BreakpointObserver, BreakpointState } from '@angular/cdk/layout';
import { BehaviorSubject, Observable } from 'rxjs';

@Injectable({
	providedIn: 'root'
})
export class UserAgentService {

	private isIe: boolean;
	private isDeviceHandset = new BehaviorSubject<boolean>(false);

	constructor(
		private breakpointObserver: BreakpointObserver,
	) {
		this.isIe = (navigator.userAgent.match(/Trident/g) || navigator.userAgent.match(/MSIE/g)) ? true : false;
		this.breakpointObserver
			.observe(['(min-width: 600px)'])
			.subscribe((state: BreakpointState) => this.isDeviceHandset.next(state.matches ? false : true));
	}

	/**
	 * @description Returns a boolean based on user agent.
	 * @returns {Boolean} Returns true if IE otherwise false.
	 */
	IsInternetExplorer() {
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
	 * @description Uses the device position to determinate where the user are.
	 * @returns {Promise} Gets and return the current position of the device.
	 * @memberof UserAgentService
	 */
	getCurrentPosition(options) {
		return new Promise((resolve, reject) => {
			navigator.geolocation.getCurrentPosition((position) => resolve(position),
				(err) => reject(err), options);
		});
	}


}
