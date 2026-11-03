export type PageTitleOptions = {
	siteName: string
	homeTitle?: string
	separator?: string
	omitSameName?: boolean
}
export function pageTitle(title: string | undefined, options: PageTitleOptions): string
