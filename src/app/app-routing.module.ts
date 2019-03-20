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
		path: ':venueId/search/:category',
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
		path: 'venueId/route/from/:from/to/:to',
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
