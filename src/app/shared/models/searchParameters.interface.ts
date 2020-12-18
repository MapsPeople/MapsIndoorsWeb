export interface SearchParameters {
    q?: string,
    fields?: string,
    room?: string,
    take?: number,
    skip?: number,
    orderBy?: string,
    near?: string | Object,
    venue?: string,
    categories?: string[],
    getGoogleResults?: boolean,
    countryCodeRestrictions?: string
}