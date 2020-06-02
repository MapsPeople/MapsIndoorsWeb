import { BrowserModule } from '@angular/platform-browser';
import { NgModule, ErrorHandler } from '@angular/core';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';

import { AppComponent } from './app.component';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { MatSnackBarModule } from '@angular/material/snack-bar';
import { LayoutModule } from '@angular/cdk/layout';
import { MatToolbarModule, MatButtonModule, MatSidenavModule, MatIconModule, MatListModule, MatGridListModule, MatCardModule, MatMenuModule, MatFormFieldModule, MatInputModule, MatRippleModule, MatProgressSpinnerModule, MatDialogModule, MatCheckboxModule } from '@angular/material';
import { AppRoutingModule } from './/app-routing.module';
import { environment } from './../environments/environment';

// Translations
import { HttpClientModule, HttpClient } from '@angular/common/http';
import { TranslateModule, TranslateLoader } from '@ngx-translate/core';
import { TranslateHttpLoader } from '@ngx-translate/http-loader';
// Components
import { VenuesComponent } from './venues/venues.component';
import { SearchComponent } from './search/search.component';
import { DetailsComponent } from './details/details.component';
import { InfoDialogComponent } from './search/info-dialog/info-dialog.component';
import { ShareUrlDialogComponent } from './details/share-url-dialog/share-url-dialog.component';
import { SetSolutionComponent } from './set-solution/set-solution.component';
import { MapComponent } from './map/map.component';
import { SetupComponent } from './setup/setup.component';
import { HorizontalDirectionsComponent } from './directives/horizontal-directions/horizontal-directions.component';
import { LocationImgComponent } from './shared/components/location-img/location-img.component';

// Modules
import { DirectionsModule } from './directions/directions.module';

// Services
import { AppConfigService } from './services/app-config.service';
import { SolutionService } from './services/solution.service';
import { RoutingStateService } from './services/routing-state.service';

// Pipes
import { DistancePipe } from './pipes/distance.pipe';

import { errorHandlerFactory } from './app.error-handler';

@NgModule({
    declarations: [
        AppComponent,
        VenuesComponent,
        SearchComponent,
        DetailsComponent,
        InfoDialogComponent,
        ShareUrlDialogComponent,
        HorizontalDirectionsComponent,
        LocationImgComponent,
        SetSolutionComponent,
        MapComponent,
        SetupComponent,
        DistancePipe
    ],
    imports: [
        BrowserModule,
        BrowserAnimationsModule,
        MatSnackBarModule,
        FormsModule,
        ReactiveFormsModule,
        MatFormFieldModule,
        MatInputModule,
        LayoutModule,
        MatToolbarModule,
        MatButtonModule,
        MatSidenavModule,
        MatIconModule,
        MatListModule,
        MatGridListModule,
        MatCardModule,
        MatMenuModule,
        MatProgressSpinnerModule,
        MatDialogModule,
        MatCheckboxModule,
        AppRoutingModule,
        HttpClientModule,
        TranslateModule.forRoot({
            loader: {
                provide: TranslateLoader,
                useFactory: HttpLoaderFactory,
                deps: [HttpClient]
            }
        }),
        DirectionsModule
    ],
    exports: [
        MatButtonModule,
        MatFormFieldModule,
        MatInputModule,
        MatRippleModule,
        MatDialogModule,
    ],
    providers: [
        SolutionService,
        AppConfigService,
        RoutingStateService,
        { provide: ErrorHandler, useFactory: errorHandlerFactory }
    ],
    bootstrap: [
        AppComponent
    ],
    entryComponents: [
        InfoDialogComponent,
        ShareUrlDialogComponent
    ]
})
export class AppModule { }

export function HttpLoaderFactory(http: HttpClient) {
    return new TranslateHttpLoader(http, './assets/i18n/', `.json?v=${environment.version}`);
}
