import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { UserAgentService } from './../services/user-agent.service';

@Component({
    selector: 'app-set-solution',
    templateUrl: './set-solution.component.html',
    styleUrls: ['./set-solution.component.scss']
})
export class SetSolutionComponent {
    public isInternetExplorer: boolean;
    public solutionId: string = '';
    public submitError: boolean = false;
    public initError: boolean = false;

    constructor(
        public router: Router,
        public userAgentService: UserAgentService,
    ) {
        // If there is a "guard" property in the extras object, it means that the solution guard prevented access.
        const currNav = this.router.getCurrentNavigation();
        if (currNav.extras.state && currNav.extras.state.guard) {
            this.initError = true;
        }

        this.isInternetExplorer = this.userAgentService.IsInternetExplorer();
    }

    /**
     * Attempt navigating to the requested solution when submitting form.
     */
    onSubmit() {
        this.router.navigate([this.solutionId]).then(success => {
            if (!success) {
                this.submitError = true;
            }
        });
    }

    /**
     * Whenever input field content changes, clear all errors to avoid confusing users.
     */
    inputChanged() {
        this.submitError = false;
        this.initError = false;
    }
}
