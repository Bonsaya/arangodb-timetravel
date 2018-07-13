/*
 * ===========================
 * revisions.js 13.07.18 18:47
 * Kevin 'Extremo' Sekin
 * Copyright (c) 2018.
 * ===========================
 */

function internalRevisionCollectionName (name) {
	return module.context.collectionName(name);
}

function internalRevisionCollectionHistoryName (name) {
	return module.context.collectionName(name + '__internal__history');
}

function internalRevisionCollectionEdgeName (name) {
	return module.context.collectionName(name + '__internal__history__edges');
}

module.exports = function(db) {
	return new function() {
		this.db = db;
		this.revisionCollectionName = (name) => {
			return internalRevisionCollectionName(name);
		};
		this.revisionCollectionHistoryName = (name) => {
			return internalRevisionCollectionHistoryName(name);
		};
		this.revisionCollectionEdgeName = (name) => {
			return internalRevisionCollectionEdgeName(name);
		};
		this.create = (name) => {
			const collectionName = this.revisionCollectionName(name);
			const collectionHistoryName = this.revisionCollectionHistoryName(name);
			const collectionEdgeName = this.revisionCollectionEdgeName(name);
			
			if (this.db._collection(collectionName) ||
				this.db._collection(collectionHistoryName) ||
				this.db._collection(collectionEdgeName)) {
				throw new Error('The revision already exists');
			} else {
				this.db._createDocumentCollection(collectionHistoryName);
				this.db._createEdgeCollection(collectionEdgeName);
				this.db._createDocumentCollection(collectionName);
				return new RevisionCollection(db, name);
			}
		};
		this.revisionCollection = (name) => {
			return new RevisionCollection(name);
		}
		this.revisionEdgeCollection = (name) => {
			return new RevisionEdgeCollection(name);
		}
	};
}
class RevisionCollection {
	
	constructor(db, name) {
		this.db = db;
		this.collection = db._collection(internalRevisionCollectionName(name));
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
	revisions(handle) {
	
	}
	previous(handle, revision) {
	
	}
	next(handle, revision) {
	
	}
	revisionByDate(dateOfInterest) {
	
	}
	revisionByDateRange(dateRangeMin, dateRangeMax) {
	
	}
};
class RevisionEdgeCollection extends RevisionCollection {
	constructor(db, name) {
		super(db, name);
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