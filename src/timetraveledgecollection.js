/*
 * ===========================
 * timetraveledgecollection.js 14.07.18 14:14
 * Kevin 'Extremo' Sekin
 * Copyright (c) 2018.
 * ===========================
 */

import {GenericCollection} from 'genericcollection';

class TimeTravelEdgeCollection extends GenericCollection {
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
	edgeByDate(dateOfInterest) {
	
	}
	edgeByDateRange(dateRangeMin, dateRangeMax) {
	
	}
	edges(handle) {
		return this.collection.edges(handle);
	}
	inEdges(handle) {
		return this.collection.inEdges(handle);
	}
	outEdges(handle) {
		return this.collection.outEdges(handle);
	}
}

module.exports.TimeTravelEdgeCollection = TimeTravelEdgeCollection;