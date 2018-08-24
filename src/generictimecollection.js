/*
 * ===========================
 * generictimecollection.js 02.08.18 15:53
 * Kevin 'Extremo' Sekin
 * Copyright (c) 2018
 * ===========================
 */

class GenericTimeCollection {
	
	constructor(db, name, settings) {
		this.db = db;
		this.name = name;
		this.collection = db._collection(name);
		this.settings = settings;
	}
	
	all() {
		return this.collection.all();
	}
	
	byExample(example) {
		return this.collection.byExample(example);
	}
	
	firstExample(example) {
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
		/**
		 * Section that validates parameters
		 */
		if (typeof handle !== 'string') {
			throw new Error('[TimeTravel] document received non-string as first parameter (handle)');
		}
		/**
		 * Begin of actual method
		 */
		try {
			return this.db._query(aqlQuery`
				FOR vertex IN ${this.collection}
				FILTER vertex.id==${handle} && vertex.expiresAt==8640000000000000
				RETURN vertex
			`).next();
		} catch (e) {
			return {};
		}
	}
	
	documents(handles) {
		/**
		 * Section that validates parameters
		 */
		if (handles.constructor !== Array) {
			throw new Error('[TimeTravel] documents received non-array as first parameter (handles)');
		}
		/**
		 * Begin of actual method
		 */
		let documents = [];
		handles.forEach((handle) => {
			documents.push(this.document(handle));
		});
		return documents;
	}
	
	type() {
		return this.collection.type();
	}
	
	iterate(iterator, options) {
		return this.collection.iterate(iterator, options);
	}
	
	exists(handle) {
		/**
		 * Section that validates parameters
		 */
		if (typeof handle !== 'string') {
			throw new Error('[TimeTravel] exists received non-string as first parameter (handle)');
		}
		/**
		 * Begin of actual method
		 */
		let documents = this.db._query(aqlQuery`
			FOR vertex IN ${this.collection}
			FILTER vertex.id==${handle} && vertex.expiresAt==8640000000000000
			RETURN vertex
		`).toArray();
		return documents.length !== 0;
	}
}

module.exports = GenericTimeCollection;