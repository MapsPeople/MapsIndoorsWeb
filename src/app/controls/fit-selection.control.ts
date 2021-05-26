import { FitSelectionInfo } from '../services/maps-indoors.service';

declare const google: any;

/**
 * Fit current Location or Venue inside map bounds.
 *
 * @export
 * @class FitSelectionControl
 */
export class FitSelectionControl {
    map: google.maps.Map;
    mapsindoorsInstance;
    controlPosition = google.maps.ControlPosition.TOP_CENTER;
    buttonElement: HTMLButtonElement;
    selectionInfo: FitSelectionInfo;

    constructor(
        map: google.maps.Map,
        mapsindoors,
        venueBoundingBox: google.maps.LatLngBounds
    ) {
        // Save references
        this.map = map;
        this.mapsindoorsInstance = mapsindoors;

        // Create control element
        this.buttonElement = document.createElement('button');
        this.buttonElement.classList.add('mapsindoors', 'fit-selection-control');

        // Add click listener
        this.buttonElement.addEventListener('click', this.onFitSelectionInView.bind(this));

        // Add listener for toggling visibility of control when selection is in- or outside of bounds
        google.maps.event.addListener(this.map, 'idle', () => {
            // Remove control if inside view bounds
            const mapBounds = this.map.getBounds();
            if (mapBounds?.intersects(venueBoundingBox)) {
                this.remove();
                return;
            }

            this.add();
        });
    }

    /**
     * Add fit selection control.
     *
     * @param {google.maps.ControlPosition} position
     * @private
     */
    private add(): void {
        // Return if already visible
        if (this.getControlIndex() > -1) {
            return;
        }

        // Return if nothing is selected
        if (!this.selectionInfo) {
            return;
        }

        this.map.controls[this.controlPosition].push(this.buttonElement);
    }

    /**
     * Remove fit selection control.
     *
     * @private
     */
    private remove(): void {
        // Return if element isn't found
        if (this.getControlIndex() === -1) {
            return;
        }

        this.map.controls[this.controlPosition].removeAt(this.getControlIndex());
    }

    /**
     * Get index for Fit Selection Control.
     *
     * @private
     * @returns {number} Returns -1 when it doesn't exist.
     */
    private getControlIndex(): number {
        const controls = this.map.controls[this.controlPosition].getArray() as HTMLElement[];
        return controls.findIndex(control => control.classList.contains('fit-selection-control'));
    }

    /**
     * Fit selection in viewport.
     *
     * @private
     */
    private onFitSelectionInView(): void {
        // Pan to location
        if (this.selectionInfo.isVenue === false) {
            this.map.panTo(this.selectionInfo.coordinates);
            return;
        }

        // Fit venue
        this.mapsindoorsInstance.fitVenue();
    }

    /**
     * Update info about selection.
     *
     * @param {FitSelectionInfo} selectionInfo
     */
    public updateInfo(selectionInfo: FitSelectionInfo): void {
        if (!selectionInfo) {
            this.selectionInfo = null;
            this.remove();
            return;
        }

        this.buttonElement.innerText = selectionInfo.name;
        this.selectionInfo = selectionInfo;
    }
}