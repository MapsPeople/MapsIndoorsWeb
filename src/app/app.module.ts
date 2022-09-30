import { BrowserModule } from '@angular/platform-browser';
import { NgModule, ErrorHandler, CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';

import { AppComponent } from './app.component';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { MatSnackBarModule } from '@angular/material/snack-bar';
import { LayoutModule } from '@angular/cdk/layout';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatRippleModule } from '@angular/material/core';
import { MatDialogModule } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatGridListModule } from '@angular/material/grid-list';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatListModule } from '@angular/material/list';
import { MatMenuModule } from '@angular/material/menu';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSidenavModule } from '@angular/material/sidenav';
import { MatToolbarModule } from '@angular/material/toolbar';
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
import { LocationImgComponent } from './shared/components/location-img/location-img.component';
import { DetailFieldComponent } from './details/detail-field/detail-field.component';
import { AppImageComponent } from './shared/components/app-image/app-image.component';
import { UserRolesComponent } from './search/user-roles/user-roles.component';
import { TimestampComponent } from './details/timestamp/timestamp.component';

// Modules
import { DirectionsModule } from './directions/directions.module';
import { OAuthModule } from 'angular-oauth2-oidc';

// Services
import { AppConfigService } from './services/app-config.service';
import { SolutionService } from './services/solution.service';
import { RoutingStateService } from './services/routing-state.service';

// Pipes
import { DistancePipe } from './pipes/distance.pipe';
import { errorHandlerFactory } from './app.error-handler';
import { LiveDataTogglesComponent } from './live-data-toggles/live-data-toggles.component';

@NgModule({
    declarations: [
        AppComponent,
        VenuesComponent,
        SearchComponent,
        DetailsComponent,
        InfoDialogComponent,
        ShareUrlDialogComponent,
        LocationImgComponent,
        SetSolutionComponent,
        MapComponent,
        SetupComponent,
        DistancePipe,
        DetailFieldComponent,
        AppImageComponent,
        UserRolesComponent,
        LiveDataTogglesComponent,
        TimestampComponent
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
        DirectionsModule,
        OAuthModule.forRoot()
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
    ],
    schemas: [CUSTOM_ELEMENTS_SCHEMA],
})
export class AppModule { }

export function HttpLoaderFactory(http: HttpClient): TranslateHttpLoader {
    return new TranslateHttpLoader(http, './assets/i18n/', `.json?v=${environment.version}`);
}
