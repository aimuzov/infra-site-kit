export function pageTitle(title, { siteName, homeTitle = siteName, separator = ' — ', omitSameName = false }) {
	return title && !(omitSameName && title === siteName) ? `${title}${separator}${siteName}` : homeTitle
}
