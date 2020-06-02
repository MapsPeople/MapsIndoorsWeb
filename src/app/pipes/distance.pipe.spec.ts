import { DistancePipe } from './distance.pipe';

describe('DistancePipe', (): void => {

    describe('Bad Inputs', (): void => {
        const pipe = new DistancePipe();

        it('should return null as undefined', (): void => {
            expect(pipe.transform(null)).toEqual(undefined);
        });

        it('should return undefined as undefined', (): void => {
            expect(pipe.transform(undefined)).toEqual(undefined);
        });
    });

    describe('Converting distance to readable imperial units', () => {
        let pipe: DistancePipe;
        const languageGetter = jest.spyOn(window.navigator, 'language', 'get');

        beforeAll((): void => {
            languageGetter.mockReturnValue('en-US');
            pipe = new DistancePipe();
        });

        it('should calculate and return 1609.344 meters as a string in miles', (): void => {
            expect(pipe.transform(1609.344 as number)).toEqual('1 mi' as string);
        });

        it('should return 0 meters as a string in feet', (): void => {
            expect(pipe.transform(0 as number)).toEqual('0 ft' as string);
        });
    });

    describe('Converting distance to readable metric units', () => {
        let pipe: DistancePipe;
        const languageGetter = jest.spyOn(window.navigator, 'language', 'get');

        beforeAll((): void => {
            languageGetter.mockReturnValue('da');
            pipe = new DistancePipe();
        });

        it('should return 0 meters as a string in meters', (): void => {
            expect(pipe.transform(0 as number)).toEqual('0 m' as string);
        });

        it('should return 1200 meters as a string in kilometers', (): void => {
            expect(pipe.transform(1200 as number)).toEqual('1.2 km' as string);
        });
    });
});