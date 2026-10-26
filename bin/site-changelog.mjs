#!/usr/bin/env node
// site-changelog verify          -- проверка ченжлога сайта или приложения (CI)
// site-changelog context         -- всё, что нужно для записи текущей версии, в Markdown
// site-changelog add <entry.json> -- запись в начало ченжлога с проверкой
import { readFileSync } from 'node:fs'

import { addRelease, changelogContext, readConfig, verifyChangelog } from '../changelog/node.mjs'

const [command, arg] = process.argv.slice(2)
const cwd = process.cwd()

const fail = (errors) => {
	for (const error of errors) console.error(`changelog: ${error}`)

	process.exit(1)
}

switch (command) {
	case 'verify': {
		if (!readConfig(cwd)) {
			console.log('changelog: no changelog is set up here, nothing to verify')
			break
		}

		const errors = verifyChangelog(cwd)

		if (errors.length) fail(errors)

		console.log('changelog: ok')
		break
	}

	case 'context':
		console.log(changelogContext(cwd))
		break

	case 'add': {
		if (!arg) fail(['usage: site-changelog add <entry.json>'])

		const errors = addRelease(cwd, JSON.parse(readFileSync(arg === '-' ? 0 : arg, 'utf8')))

		if (errors.length) fail(errors)

		console.log('changelog: entry added')
		break
	}

	default:
		fail(['usage: site-changelog verify | context | add <entry.json>'])
}
