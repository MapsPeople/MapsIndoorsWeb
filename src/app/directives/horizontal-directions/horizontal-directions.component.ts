import { Component, OnDestroy } from '@angular/core';
import { DirectionService } from '../../services/direction.service';
import { ThemeService } from '../../services/theme.service';
import { Subscription } from 'rxjs';


@Component({
    selector: 'horizontal-directions',
    templateUrl: './horizontal-directions.component.html',
    styleUrls: ['./horizontal-directions.component.scss']
})
export class HorizontalDirectionsComponent implements OnDestroy {
    colors: any;
    currentLegIndex: number = 0;
    legIndexSubscription: Subscription;
    themeServiceSubscription: Subscription;

    constructor(
        public directionService: DirectionService,
        private themeService: ThemeService

    ) {
        this.themeServiceSubscription = this.themeService.getThemeColors().subscribe((appConfigColors) => this.colors = appConfigColors);
        this.legIndexSubscription = this.directionService.getLegIndex().subscribe((index) => {
            this.currentLegIndex = index;
            this.setHorizontalSegment(index);
        });
    }

    // #region || NAVIGATE SEGMENTS
    prevSegment() {
        // TODO: Move prev and next to service and same for direction component
        const index = (this.currentLegIndex - 1);
        this.directionService.setLegIndex(index);
    }

    nextSegment() {
        const index = (this.currentLegIndex + 1);
        this.directionService.setLegIndex(index);
    }

    segmentClick(index) {
        this.directionService.setLegIndex(index);
    }

    setHorizontalSegment(index) {
        const jump = ((150 * index) - 75);
        document.getElementById('hz-scroll').scrollLeft = jump;
    }
    // #endregion

    ngOnDestroy() {
        this.themeServiceSubscription.unsubscribe();
        this.legIndexSubscription.unsubscribe();
    }
}
