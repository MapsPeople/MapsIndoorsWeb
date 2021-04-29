import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';

// Import all components for routing here
import { VenuesComponent } from './venues/venues.component';
import { SearchComponent } from './search/search.component';
import { DetailsComponent } from './details/details.component';
import { DirectionsComponent } from './directions/containers/directions.component';
import { SetSolutionComponent } from './set-solution/set-solution.component';
import { MapComponent } from './map/map.component';
import { SetupComponent } from './setup/setup.component';
import { SolutionGuard } from './solution.guard';

const routes: Routes = [
    {
        path: 'solution',
        component: SetupComponent,
        children: [
            {
                path: 'set',
                component: SetSolutionComponent
            }
        ]
    },
    {
        path: ':solutionName',
        component: MapComponent,
        canActivate: [SolutionGuard],
        children: [
            // Parent component defaults to AppComponent
            {
                path: '',
                redirectTo: 'venues',
                pathMatch: 'full'
            },
            {
                path: 'venues',
                component: VenuesComponent
            },
            {
                path: ':venueId/search',
                component: SearchComponent
            },
            {
                path: ':venueId/details/:id',
                component: DetailsComponent
            },
            {
                path: ':venueId/route/destination/:id',
                component: DirectionsComponent
            },
            {
                path: ':venueId/route/from/:from/to/:to',
                component: DirectionsComponent
            },
            {
                path: '**',
                redirectTo: 'venues',
            }
        ]
    },
    {
        path: '',
        pathMatch: 'full',
        redirectTo: 'solution/set'
    }
];

@NgModule({
    imports: [RouterModule.forRoot(routes, { relativeLinkResolution: 'legacy' })],
    exports: [RouterModule],
})
export class AppRoutingModule { }
