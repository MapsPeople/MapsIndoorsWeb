import { Component, OnInit, OnDestroy } from '@angular/core';
import { DirectionService } from '../../services/direction.service';
import { ThemeService } from '../../services/theme.service';
import { Subscription } from 'rxjs';


@Component({
	selector: 'horizontal-directions',
	templateUrl: './horizontal-directions.component.html',
	styleUrls: ['./horizontal-directions.component.scss']
})
export class HorizontalDirectionsComponent implements OnInit, OnDestroy {
	colors: any;
	currentLegIndex: number = 0;
	legIndexSubscription: Subscription;

	constructor(
		public directionService: DirectionService,
		private themeService: ThemeService

	) {
		this.legIndexSubscription = this.directionService.getLegIndex().subscribe(index => {
			this.currentLegIndex = index;
			this.setHorizontalSegment(index);
		});
	}

	async ngOnInit() {
		this.colors = await this.themeService.getThemeColors();
	}

	// #region || NAVIGATE SEGMENTS
	prevSegment() {
		let index = (this.currentLegIndex - 1);
		this.directionService.setLegIndex(index);
	};

	nextSegment() {
		let index = (this.currentLegIndex + 1);
		this.directionService.setLegIndex(index);
	};

	segmentClick(index) {
		this.directionService.setLegIndex(index);
	}

	setHorizontalSegment(index) {
		let jump = ((150 * index) - 75);
		document.getElementById("hz-scroll").scrollLeft = jump;
	};
	// #endregion

	ngOnDestroy() { 
		this.legIndexSubscription.unsubscribe();
	}
}
