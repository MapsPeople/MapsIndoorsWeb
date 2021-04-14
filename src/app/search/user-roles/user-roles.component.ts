import { Component, OnInit, Input, Output, EventEmitter } from '@angular/core';
import { UserAgentService } from '../../services/user-agent.service';
import { NotificationService } from '../../services/notification.service';
import { TranslateService } from '@ngx-translate/core';
import { SolutionService } from '../../services/solution.service';
import { ThemeService } from '../../services/theme.service';
import { Subscription } from 'rxjs';
import { CategoryService } from '../../services/category.service';

declare const mapsindoors: any;

@Component({
    selector: 'app-user-roles',
    templateUrl: './user-roles.component.html',
    styleUrls: ['./user-roles.component.scss']
})
export class UserRolesComponent implements OnInit {
    @Input() userRolesList = [];
    @Output() onClose = new EventEmitter();

    private solutionId: string;
    private themeServiceSubscription: Subscription;
    public selectedUserRoleIds: string[] = [];
    public colors: any;

    constructor(
        private userAgentService: UserAgentService,
        private solutionService: SolutionService,
        private notificationService: NotificationService,
        private translateService: TranslateService,
        private themeService: ThemeService,
        private categoryService: CategoryService
    ) {
        this.themeServiceSubscription = this.themeService
            .getThemeColors()
            .subscribe((appConfigColors) => this.colors = appConfigColors);
    }

    ngOnInit(): void {
        this.solutionService.getSolutionId()
            .then((id: string): void => {
                this.solutionId = id;
                this.selectedUserRoleIds = JSON.parse(this.userAgentService.localStorage
                    .getItem(`MI:${this.solutionId}:APPUSERROLES`) || '[]');

            })
            .catch((): void => {
                this.notificationService.displayNotification(
                    this.translateService.instant('SetSolution.InitError')
                );
            });
    }

    ngOnDestroy(): void {
        this.themeServiceSubscription.unsubscribe();
    }

    /**
     * Sets the selected user roles on the MapsIndoors object and saves them into localStorage.
     */
    public setSelectedUserRoles(): void {
        const browserLocalStorage = this.userAgentService.localStorage;
        const selectedUserRoles = this.userRolesList
            .filter(userRole => this.selectedUserRoleIds.includes(userRole.id));

        // Set the selected user roles on SDK.
        mapsindoors.MapsIndoors.setUserRoles(selectedUserRoles);
        // Save selected user roles to local storage.
        browserLocalStorage.setItem(`MI:${this.solutionId}:APPUSERROLES`, JSON.stringify(this.selectedUserRoleIds));

        this.categoryService.updateCategoriesForVenue();

    }
}
