/*
 * ===========================
 * generictimecollection.js 02.08.18 15:53
 * Kevin 'Extremo' Sekin
 * Copyright (c) 2018
 * ===========================
 */

const latest = require('./literals/latest');

class GenericTimeCollection {
	
	/**
	 * Establishes the GenericCollection
	 * @param {ArangoDatabase} db The arangoDB db constant to access arangoDB
	 * @param {String} name The name of the collection
	 * @param {Object} settings The settings related to the timetravel collection
	 */
	constructor(db, name, settings) {
		this.db = db;
		this.name = name;
		this.collection = this.db._collection(name);
		this.settings = settings;
	}
	
	/**
	 * Returns all the documents inside the collection
	 * @returns The documents inside the collection as a cursor
	 */
	all() {
		return this.collection.all()
	}
	
	/**
	 * Returns all documents matching the example
	 * @param {Object} example The example to match
	 * @returns {Array} The documents that matched the example
	 */
	byExample(example) {
		return this.collection.byExample(example).toArray();
	}
	
	/**
	 * Returns the first document matched by the example
	 * @param {Object} example The example to match against
	 * @returns {Object} The document that matched the first example
	 */
	firstExample(example) {
		return this.collection.firstExample(example).next();
	}
	
	/**
	 * Returns the documents matched by the range
	 * @param attribute The attribute to use for the range
	 * @param left The minimum of the range
	 * @param right The maximum of the range
	 * @returns {Array} The documents that match the range
	 */
	range(attribute, left, right) {
		return this.collection.range(attribute, left, right).toArray();
	}
	
	/**
	 * Returns the documents that match the closed range
	 * @param attribute The attribute to use for the range
	 * @param left The minimum of the range
	 * @param right The maximum of the range
	 * @returns {Array} The documents that match the range
	 */
	closedRange(attribute, left, right) {
		return this.collection.closedRange(attribute, left, right).toArray();
	}
	
	/**
	 * Returns a random document from the collection
	 * @returns {Object|null} The document or null if none exist
	 */
	any() {
		return this.collection.any();
	}
	
	/**
	 * Returns the count of documents inside the collection
	 * @returns {*|IDBRequest|void}
	 */
	count() {
		return this.collection.count();
	}
	
	/**
	 * Returns all documents inside the collection as an array
	 * @returns {Array} The documents inside the collection
	 */
	toArray() {
		return this.collection.toArray();
	}
	
	/**
	 * Returns a single timetravel document matched by the handle
	 * @param {String} handle The handle to match
	 * @returns {Object) The document that matched tbe handle
	 */
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
				FILTER vertex.id==${handle} && vertex.${latest}
				RETURN vertex
			`).next();
		} catch (e) {
			return {};
		}
	}
	
	/**
	 * Returns an array of documents that match the handles
	 * @param {Array} handles The handles to match
	 * @returns {Array} The documents that matched the handles
	 */
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
	
	/**
	 * Returns the type of the collection
	 * @return The type, document Collection(2) or edge Collection(3)
	 */
	type() {
		return this.collection.type();
	}
	
	/**
	 * Iterate over some elements of the collection and apply the function iterator to the elements.
	 * @param {Function} iterator The function that will take the document as first argument and the index as second argument
	 * @param {Object} options The options (limit, probability)
	 */
	iterate(iterator, options) {
		return this.collection.iterate(iterator, options);
	}
	
	/**
	 * Checks if a document exists inside the timetravel collection
	 * @param {String} handle The handle to check
	 * @returns {boolean} Whether the document exists
	 */
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
			FILTER vertex.id==${handle} && vertex.${latest}
			RETURN vertex
		`).toArray();
		return documents.length !== 0;
	}
}

module.exports = GenericTimeCollection;