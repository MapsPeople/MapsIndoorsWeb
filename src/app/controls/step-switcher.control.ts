export class StepSwitcherControl {
    map: google.maps.Map;
    position: google.maps.ControlPosition;
    miStepSwitcherElement: HTMLMiStepSwitcherElement;

    /**
     * Create an instance of StepSwitcherControl.
     *
     * @param {google.maps.Map} map Map reference.
     * @param {string} heading Heading to display.
     */
    constructor(map: google.maps.Map, heading: string) {
        this.map = map;

        // Create control element
        this.miStepSwitcherElement = document.createElement('mi-step-switcher');
        this.miStepSwitcherElement.classList.add('mapsindoors', 'step-switcher-control');
        this.miStepSwitcherElement.heading = heading;
    }

    /**
     * Add Step Switcher control.
     *
     * @param {google.maps.ControlPosition} position
     * @param {any[]} legs
     */
    add(position: google.maps.ControlPosition, legs: any[]): void {
        this.position = position;

        // Set attributes
        this.miStepSwitcherElement.steps = legs;
        this.miStepSwitcherElement.stepIndex = 0;

        // Push control element to map
        this.map.controls[this.position].push(this.miStepSwitcherElement);
    }

    /**
     * Remove Step Switcher control.
     */
    remove(): void {
        this.map.controls[this.position].clear();
    }
}