import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatIconModule, MatButtonModule } from '@angular/material';
import { ReactiveFormsModule } from '@angular/forms';

import { ShareRouteDialogComponent } from './share-route-dialog/share-route-dialog.component';
import { ButtonRoundComponent } from 'src/app/shared/components/button-round/button-round.component';
import { NumericKeyboardComponent } from 'src/app/shared/components/numeric-keyboard/numeric-keyboard.component';
// Translations
import { HttpClientModule, HttpClient } from '@angular/common/http';
import { TranslateModule, TranslateLoader } from '@ngx-translate/core';
import { TranslateHttpLoader } from '@ngx-translate/http-loader';

@NgModule({
    declarations: [
        ShareRouteDialogComponent,
        ButtonRoundComponent,
        NumericKeyboardComponent,
    ],
    imports: [
        CommonModule,
        MatButtonModule,
        MatIconModule,
        ReactiveFormsModule,
        HttpClientModule,
        TranslateModule.forRoot({
            loader: {
                provide: TranslateLoader,
                useFactory: HttpLoaderFactory,
                deps: [HttpClient]
            }
        }),
    ],
    entryComponents: [
        ShareRouteDialogComponent
    ]
})
export class ShareRouteModule { }

export function HttpLoaderFactory(http: HttpClient): TranslateHttpLoader {
    return new TranslateHttpLoader(http);
}
