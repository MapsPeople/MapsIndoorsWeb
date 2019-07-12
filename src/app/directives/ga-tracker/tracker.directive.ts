import { Directive, HostListener, Input } from '@angular/core';
declare const ga: Function;

@Directive({
	selector: '[eventTracker]'
})
export class TrackerDirective {

	@Input('eventTracker') option: any;

	@HostListener('click', ['$event']) onClick($event) {
		ga('send', 'event', this.option.category, this.option.action, this.option.label, {
			hitCallback: function () {

				// Tracking is successful

			}
		});
	}
}
