import { Injectable } from '@angular/core';
import { AppConfigService } from './app-config.service';
declare var mapsindoors: any;

@Injectable({
	providedIn: 'root'
})
export class SolutionService {
	solution: any;
	solutionName: string = "";

	constructor(
		private appConfigService: AppConfigService,
	) { }


	// #region || SOLUTION NAME
	setSolutionName() {
		this.solutionName = location.pathname.split('/')[1];
	}

	getSolutionName() {
		return this.solutionName;
	}
	// #endregion

	// #region || GET SOLUTION
	async getSolution() {
		let self = this;
		if (!this.solution) {
			await mapsindoors.SolutionsService.getSolution().then(s => {
				self.solution = s
			})
			return this.solution;
		}
		else {
			return this.solution;
		}
	}
	// #endregion

	// #region || GET SOLUTION ID
	async getSolutionId() {
		if (this.solution) {
			return this.solution.id
		}
		else {
			await this.getSolution()
			return this.solution.id
		}
	}
	// #endregion

	// #region || GET SOLUTION TYPES
	async getSolutionTypes() {
		if (this.solution) {
			return this.solution.types
		}
		else {
			await this.getSolution()
			return this.solution.types
		}
	}
	// #endregion
}
