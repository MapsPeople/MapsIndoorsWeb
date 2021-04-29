import { ElementRef, Injectable } from '@angular/core';

@Injectable({
    providedIn: 'root'
})
export class MIComponentService {

    private components = {};

    /**
     * Register a component for easy reference.
     * @param {string} handle - A reference name for the component
     * @param {ElementRef} component - The component
     */
    public register(handle: string, component: ElementRef): void {
        if (component && handle) {
            this.components[handle] = component.nativeElement;
        }
    }


    /**
     * Get a component reference by the given name.
     * @param {string} handle
     * @returns HTMLElement
     */
    public get(handle: string): any {
        return this.components[handle] || null;
    }
}
