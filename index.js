/*
 * ===========================
 * index.js 13.07.18 04:48
 * Kevin 'Extremo' Sekin
 * Copyright (c) 2018.
 * ===========================
 */

let arangoRevisions = require('./src/revisions');

module.exports = function injectRevisions(arangoDB) {
	Object.assign(arangoDB, {arangoRevisions});
}
