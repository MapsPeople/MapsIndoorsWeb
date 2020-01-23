import { Component, Input, Output, EventEmitter, OnDestroy } from '@angular/core';
import { ThemeService } from '../../../services/theme.service';
import { Subscription } from 'rxjs';

@Component({
    selector: 'button-round',
    templateUrl: './button-round.component.html',
    styleUrls: ['./button-round.component.scss']
})
export class ButtonRoundComponent implements OnDestroy {
    public colors;
    private subscriptions = new Subscription();

    @Input() public config: {
        label: string
        icon: string
    };
    @Output() public clickEvent: EventEmitter<boolean> = new EventEmitter();

    constructor(
        private themeService: ThemeService,
    ) {
        this.subscriptions.add(this.themeService.getThemeColors()
            .subscribe((appConfigColors): void => this.colors = appConfigColors)
        );
    }

    /**
     * @description Emit click event.
     * @memberof ButtonRoundComponent
     */
    public onBtnClick(): void {
        this.clickEvent.emit();
    }

    ngOnDestroy(): void {
        this.subscriptions.unsubscribe();
    }
}
