/*
 * ===========================
 * genericcollection.js 14.07.18 14:13
 * Kevin 'Extremo' Sekin
 * Copyright (c) 2018.
 * ===========================
 */

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

module.exports.GenericCollection = GenericCollection;