/*
 * ===========================
 * timetravelcollection.js 14.07.18 14:13
 * Kevin 'Extremo' Sekin
 * Copyright (c) 2018.
 * ===========================
 */

import {GenericCollection} from 'genericcollection';

class TimeTravelCollection extends GenericCollection{
	
	constructor(db, name, settings) {
		super(db, name, settings);
	}
	insert(object, options = {}) {
	
	}
	replace(handle, object, options = {}) {
	
	}
	update(handle, object, options = {}) {
	
	}
	remove(handle, options = {}) {
	
	}
	removeByKeys(handles) {
	
	}
	removeByExample(example) {
	
	}
	replaceByExample(example, object) {
	
	}
	updateByExample(example, object) {
	
	}
	history(handle) {
	
	}
	previous(handle, revision) {
	
	}
	next(handle, revision) {
	
	}
	documentByDate(dateOfInterest) {
	
	}
	documentByDateRange(dateRangeMin, dateRangeMax) {
	
	}
}

module.exports.TimeTravelCollection = TimeTravelCollection;