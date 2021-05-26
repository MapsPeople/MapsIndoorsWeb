import { Component, OnInit, Output, EventEmitter } from '@angular/core';
import { UserAgentService } from 'src/app/services/user-agent.service';
import { TranslateService } from '@ngx-translate/core';

export interface UserPosition {
    geometry: GeolocationPosition,
    properties: {
        name: string,
        floor: string
    };
}

@Component({
    selector: 'user-position',
    templateUrl: './user-position.component.html',
    styleUrls: ['./user-position.component.scss']
})
export class UserPositionComponent implements OnInit {

    loading: boolean;
    disabledInBrowser: boolean;
    userPosition: UserPosition;

    @Output('eventTriggered') originPosition: EventEmitter<UserPosition> = new EventEmitter();
    @Output() error: EventEmitter<boolean> = new EventEmitter();

    constructor(
        private userAgentService: UserAgentService,
        private translateService: TranslateService
    ) { }

    ngOnInit(): void {
        this.loading = true;
        this.userAgentService.getCurrentPosition()
            .then((position: GeolocationPosition): void => {
                this.userPosition = {
                    geometry: position,
                    properties: {
                        name: this.translateService.instant('Direction.MyPosition'),
                        floor: '0'
                    }
                };
                this.loading = false;
            }).catch((): void => {
                this.error.emit(true);
                this.disabledInBrowser = true;
                this.loading = false;
            });
    }

    handleClick(): void {
        if (!this.loading) this.originPosition.emit(this.userPosition);
    }
}