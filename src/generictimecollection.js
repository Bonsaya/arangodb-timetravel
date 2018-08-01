/*
 * ===========================
 * genericcollection.js 14.07.18 14:13
 * Kevin 'Extremo' Sekin
 * Copyright (c) 2018.
 * ===========================
 */

class GenericTimeCollection {
	constructor(db, name, settings) {
		this.db = db;
		this.name = name;
		this.collection = db._collection(name);
		this.settings = settings;
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
		/**
		 * Section that validates parameters
		 */
		if (typeof handle !== 'string') {
			throw new Error('[TimeTravel] document received non-string as first parameter (handle)');
		}
		/**
		 * Begin of actual method
		 */
		return db._query(aqlQuery`
			FOR vertex IN ${this.collection}
			FILTER id==${handle} && expiresAt==8640000000000000
			RETURN vertex
		`).toArray()[0];
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
		let documents = db._query(aqlQuery`
			FOR vertex IN ${this.collection}
			FILTER id==${handle} && expiresAt==8640000000000000
			RETURN vertex
		`).toArray();
		return documents.size!==0;
	}
}

module.exports.GenericCollection = GenericCollection;