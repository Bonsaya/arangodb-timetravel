/*
 * ===========================
 * index.js 13.07.18 04:48
 * Kevin 'Extremo' Sekin
 * Copyright (c) 2018.
 * ===========================
 */

const arangoDBRevisions = require('./src/revisions');

module.exports = function(db) {
	return arangoDBRevisions(db);
}