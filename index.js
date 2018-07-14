/*
 * ===========================
 * index.js 13.07.18 04:48
 * Kevin 'Extremo' Sekin
 * Copyright (c) 2018.
 * ===========================
 */

const arangoDBTimeTravel = require('./src/timetravel');

module.exports = function(db, settings) {
	return arangoDBTimeTravel(db, settings);
}