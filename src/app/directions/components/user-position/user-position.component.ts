import { Component, OnInit, Output, EventEmitter } from '@angular/core';
import { UserAgentService } from 'src/app/services/user-agent.service';

interface UserPosition {
	name: string,
	coordinates: any[]
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
		private userAgentService: UserAgentService
	) { }

	async ngOnInit() {
		const options = { enableHighAccuracy: false, maximumAge: 300000, timeout: 15000 };
		this.loading = true;
		await this.userAgentService.getCurrentPosition(options)
			.then((position: Position): void => {
				this.userPosition = {
					name: 'My Position',
					coordinates: [position.coords.longitude, position.coords.latitude]
				};
				this.loading = false;
			}).catch((): void => {
				this.error.emit(true);
				this.disabledInBrowser = true;
				this.loading = false;
			});
	}

	handleClick() {
		if (!this.loading) this.originPosition.emit(this.userPosition);
	}
}