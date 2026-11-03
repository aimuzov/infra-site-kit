import globalData from '@csstools/postcss-global-data'
import customMedia from 'postcss-custom-media'
import nested from 'postcss-nested'

export default function postcss({ mediaFile = 'src/frontend/styles/media.css' } = {}) {
	return { plugins: [globalData({ files: [mediaFile] }), customMedia(), nested()] }
}
