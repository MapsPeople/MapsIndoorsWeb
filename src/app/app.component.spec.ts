import { Spectator, createComponentFactory } from '@ngneat/spectator/jest';

import { AppComponent } from './app.component';
import { RouterTestingModule } from '@angular/router/testing';
import { TranslateModule } from '@ngx-translate/core';

describe('AppComponent', () => {
    let spectator: Spectator<AppComponent>;
    const createComponent = createComponentFactory({
        component: AppComponent,
        imports: [
            RouterTestingModule,
            TranslateModule.forRoot()
        ]
    });

    beforeEach(() => spectator = createComponent());

    it('should create the app', () => {
        expect(spectator.component).toBeDefined();
    });

    it('must have a router-outlet', () => {
        expect(spectator.query('router-outlet')).not.toBeNull();
    });
});
