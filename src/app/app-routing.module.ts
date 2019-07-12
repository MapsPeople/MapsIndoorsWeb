import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';

// Import all components for routing here
import { VenuesComponent } from './venues/venues.component';
import { SearchComponent } from './search/search.component';
import { DetailsComponent } from './details/details.component';
import { DirectionsComponent } from './directions/directions.component';

const routes: Routes = [
	{
		path: '',
		redirectTo: ':solutionName/venues',
		pathMatch: 'full'
	},
	{
		path: ':solutionName/venues',
		component: VenuesComponent
	},
	{
		path: ':solutionName/:venueId/search',
		component: SearchComponent
	},
	{
		path: ':solutionName/:venueId/search/:category',
		component: SearchComponent
	},
	{
		path: ':solutionName/:venueId/details/:id',
		component: DetailsComponent
	},
	{
		path: ':solutionName/:venueId/route/destination/:id',
		component: DirectionsComponent
	},
	{
		path: ':solutionName/:venueId/route/from/:from/to/:to',
		component: DirectionsComponent
	},
	{
		path: '**',
		component: VenuesComponent,
	},
];

@NgModule({
	imports: [RouterModule.forRoot(routes)],
	exports: [RouterModule],
})
export class AppRoutingModule { }
