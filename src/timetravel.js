/*
 * ===========================
 * timetravel.js 14.07.18 14:02
 * Kevin 'Extremo' Sekin
 * Copyright (c) 2018.
 * ===========================
 */

function internalTimeTravelPresentName () {
	return '__timetravel__present';
}

function internalTimeTravelPastName () {
	return '__timetravel__past';
}

module.exports = function(db, settings) {
	return new function() {
		this.db = db;
		this.settings = settings;
		this.createDocumentCollection = (name) => {
			const collectionName = name+internalTimeTravelPresentName();
			const outdatedCollectionName = name+internalTimeTravelPastName();
			const edgeCollectionName = name+internalTimeTravelPresentName()+'__relations';
			const outdatedEdgeCollectionName = name+internalTimeTravelPastName()+'__relations';
			
			if (this.db._collection(collectionName) ||
				this.db._collection(edgeCollectionName) ||
				this.db._collection(outdatedCollectionName) ||
				this.db._collection(outdatedEdgeCollectionName)) {
				throw new Error('[TimeTravel] The document collection already exists');
			} else {
				this.db._createDocumentCollection(collectionName);
				this.db._createEdgeCollection(edgeCollectionName);
				this.db._createDocumentCollection(outdatedCollectionName);
				this.db._createEdgeCollection(outdatedEdgeCollectionName);
				return new TimeTravelCollection(db, name);
			}
		};
		this.createEdgeCollection = (name) => {
			const edgeCollectionName = name+internalTimeTravelPresentName();
			const outdatedEdgeCollectionName = name+internalTimeTravelPastName();
			if (this.db._collection(edgeCollectionName) ||
				this.db._collection(outdatedEdgeCollectionName)) {
				throw new Error('[TimeTravel] The edge collection already exists');
			} else {
				this.db._createEdgeCollection(edgeCollectionName);
				this.db._createEdgeCollection(outdatedEdgeCollectionName);
				return new TimeTravelEdgeCollection(db, name);
			}
		}
		this.documentCollection = (name) => {
			return new TimeTravelCollection(name);
		}
		this.edgeCollection = (name) => {
			return new TimeTravelEdgeCollection(name);
		}
	};
}

class GenericCollection {
	constructor(db, name) {
		this.db = db;
		this.collection = db._collection(name);
	}
	all () {
		return this.collection.all();
	}
	byExample (example) {
		return this.collection.byExample(example);
	}
	firstExample (example) {
		return this.collection.firstExample(example);
	}
	range(attribute, left, right) {
		return this.collection.range(attribute, left, right);
	}
	closedRange(attribute, left, right) {
		return this.collection.closedRange(attribute, left, right);
	}
	any() {
		return this.collection.any();
	}
	count() {
		return this.collection.count();
	}
	toArray() {
		return this.collection.toArray();
	}
	document(handle) {
		return this.collection.document(handle);
	}
	documents(handles) {
		return this.collection.documents(handles);
	}
	type() {
		return this.collection.type();
	}
	iterate(iterator, options) {
		return this.collection.iterate(iterator, options);
	}
	exists(handle) {
		return this.collection.exists(handle);
	}
}

class TimeTravelCollection extends GenericCollection{
	
	constructor(db, name) {
		super(db, internalRevisionCollectionName(name));
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
};
class TimeTravelEdgeCollection extends GenericCollection {
	constructor(db, name) {
		super(db, name);
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
};