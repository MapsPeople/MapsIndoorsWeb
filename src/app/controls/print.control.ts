export class PrintControl {
    map: google.maps.Map;
    position: google.maps.ControlPosition;
    printControlElement: HTMLButtonElement;

    /**
     * Create an instance of PrintControl.
     *
     * @param {google.maps.Map} map Map reference.
     * @param {string} buttonTitle Value for title attribute.
     */
    constructor(map: google.maps.Map, buttonTitle: string) {
        this.map = map;

        // Create control element
        this.printControlElement = document.createElement('button');
        this.printControlElement.type = 'button';
        this.printControlElement.draggable = false;
        this.printControlElement.title = buttonTitle;
        this.printControlElement.classList.add('mapsindoors', 'print-control');

        // Append printer icon
        const miIconElement: HTMLMiIconElement = document.createElement('mi-icon');
        miIconElement.iconName = 'printer';
        this.printControlElement.appendChild(miIconElement);

        // Add click listener to trigger print console when clicked.
        this.printControlElement.addEventListener('click', (): void => {
            window.print();
        });
    }

    /**
     * Add print control.
     *
     * @param {google.maps.ControlPosition} position
     */
    add(position: google.maps.ControlPosition): void {
        this.position = position;
        this.map.controls[this.position].push(this.printControlElement);
    }

    /**
     * Remove print control.
     */
    remove(): void {
        this.map.controls[this.position].clear();
    }
}