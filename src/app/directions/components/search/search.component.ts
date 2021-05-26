import { Component, Input, Output, EventEmitter, OnInit, OnDestroy, ViewChild, ElementRef } from '@angular/core';
import { Subject, Subscription } from 'rxjs';
import { debounceTime, filter, switchMap, distinctUntilChanged, tap, map } from 'rxjs/operators';
import { SearchService } from './search.service';
import { SearchData } from './searchData.interface';
import { Location, SearchParameters } from '@mapsindoors/typescript-interfaces';

@Component({
    selector: 'search-input',
    templateUrl: './search.component.html',
    styleUrls: ['./search.component.scss'],
    providers: [SearchService]
})
export class SearchComponent implements OnInit, OnDestroy {
    searchTerm = new Subject<string>();
    @ViewChild('searchInput', { static: true }) searchElement: ElementRef;

    @Input() query: string;
    @Input() parameters: SearchParameters;
    @Input() includeGooglePlaces = false;
    @Input() countryCodeRestrictions: string | string[] = '';
    @Input() placeHolder: string;

    @Output('update') searchResults: EventEmitter<SearchData> = new EventEmitter<SearchData>();
    @Output() error: EventEmitter<string> = new EventEmitter<string>();
    @Output() currentInputField: EventEmitter<string> = new EventEmitter<string>();
    @Output() blurred: EventEmitter<string> = new EventEmitter<string>();
    @Output() loading: EventEmitter<boolean> = new EventEmitter<boolean>();

    private searchTermSubscription: Subscription = new Subscription();

    constructor(
        private searchService: SearchService
    ) { }

    ngOnInit(): void {
        this.searchTermSubscription = this.searchTerm
            .pipe(
                debounceTime(400),
                map((term): string => term.trim()),
                distinctUntilChanged(),
                tap((query): void => {
                    if (query.length < 2) this.clearResults();
                }),
                filter((query): boolean => query.length > 1),
                tap((): void => this.loading.emit()),
                switchMap((term): Promise<Location[]> => this.searchService.searchEntries(term, this.parameters, this.includeGooglePlaces, this.countryCodeRestrictions))
            )
            .subscribe((results): void => {
                this.searchResults.emit({ query: this.query, results: results });
            });
    }

    /**
     * Clearing searchInput, all results and focuses afterwards.
     */
    public clearInput(): void {
        this.currentInputField.emit();
        this.query = '';
        this.clearResults();
        this.searchElement.nativeElement.focus();
    }

    /**
     * Clearing all results.
     * @private
     */
    private clearResults(): void {
        this.searchResults.emit({ query: '', results: [] });
    }

    ngOnDestroy(): void {
        this.searchTermSubscription.unsubscribe();
    }
}