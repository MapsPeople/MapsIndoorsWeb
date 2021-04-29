import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { UserAgentService } from './../services/user-agent.service';
import { environment } from 'src/environments/environment';

@Component({
    selector: 'app-set-solution',
    templateUrl: './set-solution.component.html',
    styleUrls: ['./set-solution.component.scss']
})
export class SetSolutionComponent {
    public isInternetExplorer: boolean;
    public solutionId = '';
    public submitError = false;
    public initError = false;

    constructor(
        public router: Router,
        public userAgentService: UserAgentService,
    ) {
        this.isInternetExplorer = this.userAgentService.IsInternetExplorer();
        const originUri = this.userAgentService.localStorage.getItem('mi:originUri');
        // If there is a "guard" property in the extras object, it means that the solution guard prevented access.
        const currNav = this.router.getCurrentNavigation();
        if (currNav.extras.state && currNav.extras.state.guard) {
            this.initError = true;
            return;
        }

        // Set a suggested solutionId to help users get started.
        this.solutionId = this.userAgentService.localStorage.getItem('MI:suggestedSolutionId') || environment.suggestedSolutionId;

        //If the app is loaded after a login redirect read the apiKey from the query paramters and navigate to that solution.
        if (originUri > '') {
            this.router.navigate([originUri], { queryParamsHandling: 'preserve' }).then(success => {

                if (!success) {
                    this.submitError = true;
                }

                const originUri = this.userAgentService.localStorage.getItem('mi:originUri');
                window.history.replaceState(null, null, originUri);
                this.userAgentService.localStorage.removeItem('mi:apiKey');
                this.userAgentService.localStorage.removeItem('mi:originUri');
            });
        }
    }

    /**
     * Attempt navigating to the requested solution when submitting form.
     */
    onSubmit(): void {
        this.router.navigate([this.solutionId]).then(success => {
            if (!success) {
                this.submitError = true;
            }
        });
    }

    /**
     * Whenever input field content changes, clear all errors to avoid confusing users.
     */
    inputChanged(): void {
        this.submitError = false;
        this.initError = false;
    }
}
