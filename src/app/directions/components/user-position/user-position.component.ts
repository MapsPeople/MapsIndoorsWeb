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


	constructor(
		private userAgentService: UserAgentService
	) { }

	async ngOnInit() {
		const options = { enableHighAccuracy: false, maximumAge: 300000, timeout: 15000 };
		await this.userAgentService.getCurrentPosition(options)
			.then((position: any) => {
				this.userPosition = {
					name: 'My Position',
					coordinates: [position.coords.longitude, position.coords.latitude]
				};
				this.loading = false;
			}).catch(() => {
				this.disabledInBrowser = true;
				this.loading = false;
			});
	}

	handleClick() {
		if (!this.loading) this.originPosition.emit(this.userPosition);
	}
}