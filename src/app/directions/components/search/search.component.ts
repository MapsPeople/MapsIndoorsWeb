import { Component, Input, Output, EventEmitter, OnInit, OnDestroy, ViewChild, ElementRef } from '@angular/core';
import { Subject, Subscription } from 'rxjs';
import { debounceTime, filter, switchMap, distinctUntilChanged, tap, map } from 'rxjs/operators';
import { SearchService } from './search.service';
import { SearchData } from './searchData.interface';
import { SearchParameters } from '../../../shared/models/searchParameters.interface';


@Component({
    selector: 'search-input',
    templateUrl: './search.component.html',
    styleUrls: ['./search.component.scss'],
    providers: [SearchService]
})
export class SearchComponent implements OnInit, OnDestroy {
    searchTerm = new Subject<string>();
    @ViewChild('searchInput') searchElement: ElementRef;

    @Input() query: string;
    @Input() parameters: SearchParameters;
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

    ngOnInit() {
        this.searchTermSubscription = this.searchTerm
            .pipe(
                debounceTime(400),
                map((term) => term.trim()),
                distinctUntilChanged(),
                tap((query) => {
                    if (query.length < 2) this.clearResults();
                }),
                filter((query) => query.length > 1),
                tap(() => this.loading.emit()),
                switchMap((term) => this.searchService.searchEntries(term, this.parameters))
            )
            .subscribe((results) => {
                this.searchResults.emit({ query: this.query, results: results });
            });
    }

    /**
     * @description Clearing searchInput, all results and focuses afterwards.
     * @memberof SearchComponent
     */
    clearInput() {
        this.currentInputField.emit();
        this.query = '';
        this.clearResults();
        this.searchElement.nativeElement.focus();
    }

    /**
     * @description Clearing all results.
     * @memberof SearchComponent
     */
    clearResults() {
        this.searchResults.emit({ query: '', results: [] });
    }

    ngOnDestroy() {
        this.searchTermSubscription.unsubscribe();
    }
}