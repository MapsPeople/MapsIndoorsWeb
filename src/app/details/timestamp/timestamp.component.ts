import { Component, Input } from '@angular/core';

@Component({
    selector: 'app-timestamp',
    templateUrl: './timestamp.component.html',
    styleUrls: ['./timestamp.component.scss']
})
export class TimestampComponent {
    @Input() set time(value: string) {
        clearInterval(this.timeInterval);
        this.durationSinceLastLiveUpdate(value);
        this.absoluteTime = new Date(value).toLocaleDateString(window.navigator.language, {
            day: 'numeric',
            month: 'long',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    }

    public absoluteTime: string;
    public latestUpdate: string;
    private currentDate: Date;

    private timeInterval: any;

    ngOnDestroy(): void {
        clearInterval(this.timeInterval);
    }

    /**
     * Set interval to continuously update the time since a last Position domain type update was received.
     *
     * @param  {string} utcTime
     * @returns void
     */
    private durationSinceLastLiveUpdate(utcTime: string): void {
        const dateObject = new Date(utcTime);
        let result: string;

        let seconds: number;
        let minutes: number;
        let hours: number;
        let days: number;

        let remainingSeconds = seconds % 60;
        let remainingMinutes = minutes % 60;
        let remainingHours = hours % 60;

        this.timeInterval = setInterval(() => {
            this.currentDate = new Date();

            seconds = Math.round((this.currentDate?.getTime() - dateObject?.getTime()) / 1000);
            minutes = Math.floor(seconds / 60);
            hours = Math.floor(minutes / 60);
            days = Math.floor(hours / 24);

            remainingSeconds = seconds % 60;
            remainingMinutes = minutes % 60;
            remainingHours = hours % 60;

            if (days >= 1) {
                result = `${days} day(s) ago`;
            } else if (days <= 1 && hours >= 1) {
                result = `${remainingHours} hour(s) ${remainingMinutes} min ago`;
            } else if (remainingMinutes >= 5 && remainingHours < 1) {
                result = `${remainingMinutes} min ago`;
            } else if (remainingMinutes < 5 && remainingMinutes >= 1) {
                result = `${remainingMinutes} min ${remainingSeconds} second(s) ago`;
            } else {
                result = `${remainingSeconds} second(s) ago`;
            }

            this.latestUpdate = result;
        }, 1000);
    }
}
