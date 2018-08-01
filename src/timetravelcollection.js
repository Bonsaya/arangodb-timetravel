/*
 * ===========================
 * timetravelcollection.js 14.07.18 14:13
 * Kevin 'Extremo' Sekin
 * Copyright (c) 2018.
 * ===========================
 */

import {GenericCollection} from 'genericcollection';

class TimeTravelCollection extends GenericCollection {
	
	constructor(db, name, settings) {
		super(db, name, settings);
	}
	
	insert(object, options = {}) {
		/**
		 * Section that validates parameters
		 */
		if (object !== Object(object)) {
			throw new Error('[TimeTravel] insert received non-object as first parameter (object)');
		}
		if (options !== Object(options)) {
			throw new Error('[TimeTravel] insert received non-object as second parameter (options)');
		}
		if (typeof object._key === 'string') {
			object.id = object._key;
			delete object._key;
		}
		if (typeof object._id === 'string') {
			object.id = object._id.split('/')[1];
			delete object._id;
		}
		if (typeof object.id !== 'string') {
			throw new Error('[TimeTravel] Attempted to insert document without id, _id or _key value');
		}
		/**
		 * Begin of actual method
		 */
		this.db._executeTransaction({
			collections: {
				write: [this.name, this.name + this.settings.edgeAppendix]
			},
			action: function({doc, edge, object}) {
				// Import arangoDB database driver
				const db = require('@arangodb').db;
				// Open up the collections to be inserted into
				let documentCollection = db._collection(doc);
				let edgeCollection = db._collection(edge);
				// Generate the Inbound Proxy Key
				let inboundProxyKey = edge + '/' + object.id + '_INBOUNDPROXY';
				// Generate the Outbound Proxy Key
				let outboundProxyKey = edge + '/' + object.id + '_OUTBOUNDPROXY';
				// Fetch the recent unexpired version of vertex and edge if any
				let oldDocumentsAndEdges = db._query(aqlQuery`
					FOR vertex, edge IN OUTBOUND ${inboundProxyKey} ${edge}
					FILTER edge.expiresAt == 8640000000000000
					RETURN { 'document': vertex, 'edge': edge }
				`).toArray();
				// Establish current Date
				let dateNow = Date.now();
				// Expire the old edges and documents
				oldDocumentsAndEdges.forEach((documentAndEdge) => {
					documentCollection.update(documentAndEdge['document'].key, {expiresAt: dateNow});
					edgeCollection.update(documentAndEdge['edge'].key, {expiresAt: dateNow});
				});
				// Insert new document
				let newDocument = documentCollection.insert(Object.assign(object, {
					createdAt: dateNow,
					expiresAt: 8640000000000000
				}));
				// Check if there were previous documents and edges
				if (oldDocumentsAndEdges.size) {
					// We have previous documents and edges, meaning the inbound proxy already exists
					// And the insert command was used by accident instead of the update command!
					// So we simply insert the new edge!
					edgeCollection.insert(inboundProxyKey, newDocument._id, {
						createdAt: dateNow,
						expiresAt: 8640000000000000
					});
				} else {
					// There are no previous documents or edges, so we need to create the inbound and outbound proxies!
					let inboundProxy = documentCollection.insert({
						_key: inboundProxyKey,
						createdAt: dateNow,
						expiresAt: 8640000000000000
					});
					let outboundProxy = documentCollection.insert({
						_key: outboundProxyKey,
						createdAt: dateNow,
						expiresAt: 8640000000000000
					});
					// And now we need to tie them together with the first document
					// By inserting the edges from the inbound proxy to the document and from the document to the outbound proxy
					edgeCollection.insert(inboundProxy._key, newDocument._id, {
						createdAt: dateNow,
						expiresAt: 8640000000000000
					});
					edgeCollection.insert(newDocument._id, outboundProxy._id, {
						createdAt: dateNow,
						expiresAt: 8640000000000000
					});
				}
			},
			params: {
				doc: name,
				edge: name + this.settings.edgeAppendix,
				object: object
			}
		});
	}
	
	replace(handle, object, options = {}) {
		/**
		 * Section that validates parameters
		 */
		if (typeof handle !== 'string') {
			throw new Error('[TimeTravel] replace received non-string as first parameter (handle)');
		}
		if (object !== Object(object)) {
			throw new Error('[TimeTravel] replace received non-object as second parameter (object)');
		}
		if (options !== Object(options)) {
			throw new Error('[TimeTravel] replace received non-object as third parameter (options)');
		}
		/**
		 * Begin of actual method
		 */
		// We simply redirect to the insert method, as this will expire old entries if they exist and thus "replace" it.
		this.insert(Object.assign(object, {id: handle}), options);
	}
	
	update(handle, object, options = {}) {
	
	}
	
	remove(handle, options = {}) {
	
	}
	
	removeByKeys(handles) {
	
	}
	
	removeByExample(example) {
	
	}
	
	replaceByKeys(handles, object, options) {
		/**
		 * Section that validates parameters
		 */
		if (handles.constructor !== Array) {
			throw new Error('[TimeTravel] replaceByKeys received non-array as first parameter (handles)');
		}
		if (object !== Object(object)) {
			throw new Error('[TimeTravel] replaceByKeys received non-object as second parameter (object)');
		}
		if (options !== Object(options)) {
			throw new Error('[TimeTravel] replaceByKeys received non-object as third parameter (options)');
		}
		/**
		 * Begin of actual method
		 */
		// We handle each handle seperately so we can rely on a single method for all replace functionality!
		handles.forEach((handle) => {
			// We simply redirect to the insert method, as this will expire old entries if they exist and thus "replace" it.
			this.insert(Object.assign(object, {id: handle}), options);
		});
	}
	
	replaceByExample(example, object, options) {
		/**
		 * Section that validates parameters
		 */
		if (example !== Object(example)) {
			throw new Error('[TimeTravel] replaceByExample received non-object as first parameter (example)');
		}
		if (object !== Object(object)) {
			throw new Error('[TimeTravel] replaceByExample received non-object as second parameter (object)');
		}
		if (options !== Object(options)) {
			throw new Error('[TimeTravel] replaceByExample received non-object as third parameter (options)');
		}
		/**
		 * Begin of actual method
		 */
		// First, we must fetch all the documents that match the example
		let documents = this.byExample(example).toArray();
		// Then we need to replace each one with the new object!
		documents.forEach((document) => {
			// We delete all the internal keys of ArangoDB, as we do not use them as indexes
			// And the insert method would use them to replace the "id" field, which we use as our real index
			delete document._key;
			delete document._rev;
			delete document._id;
			// Then we can redirect to the insert method, which expires old entries if they exist and thus "replaces"
			// our document in question. For efficiency's sake, we will only submit the "id" to the new object despite
			// having deleted all the internal ArangoDB indexes(which would not be passed anyway)
			this.insert(Object.assign(object, {id: document.id}), options);
		})
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