import { Pipe, PipeTransform } from '@angular/core';

@Pipe({ name: 'distance' })
export class DistancePipe implements PipeTransform {
    private imperial = navigator.language === 'en-US' ? true : false;

    transform(meters: number): string {
        if (meters === undefined || meters === null) {
            return;
        }

        return this.imperial ? this.getImperialDistance(meters) : this.getMetricDistance(meters);
    }

    /**
     * @description Return the distance rounded in either feet or miles.
     * @private
     * @param {number} meters
     * @returns {string}
     */
    private getImperialDistance(meters: number): string {
        if (Math.abs(meters) < 160.9344) {
            const ft = meters * 3.2808;
            return Math.round(ft) + ' ft';
        }
        const miles = meters / 1609.344;
        return Math.round(miles * 10) / 10 + ' mi';
    }

    /**
     * @description Return the distance rounded in either meters or kilometers.
     * @private
     * @param {number} meters
     * @returns {string}
     */
    private getMetricDistance(meters: number): string {
        if (Math.abs(meters) < 1000) {
            return `${Math.round(meters)} m`;
        }
        return Math.round((meters / 1000) * 10) / 10 + ' km';
    }
}