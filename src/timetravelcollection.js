/*
 * ===========================
 * timetravelcollection.js 14.07.18 14:13
 * Kevin 'Extremo' Sekin
 * Copyright (c) 2018.
 * ===========================
 */

import {GenericTimeCollection} from 'src/generictimecollection';

class TimeTravelCollection extends GenericTimeCollection {
	
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
			action: function({doc, edge, object, options}) {
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
					documentCollection.update(documentAndEdge['document']._key, {expiresAt: dateNow});
					edgeCollection.update(documentAndEdge['edge']._key, {expiresAt: dateNow});
				});
				// Insert new document
				let newDocument = documentCollection.insert(Object.assign(object, {
					createdAt: dateNow,
					expiresAt: 8640000000000000
				}), options);
				// Check if there were previous documents and edges
				if (oldDocumentsAndEdges.size) {
					// We have previous documents and edges, meaning the inbound proxy already exists
					// And the insert command was used by accident instead of the update command!
					// So we simply insert the new edge!
					edgeCollection.insert(inboundProxyKey, newDocument._id, {
						createdAt: dateNow,
						expiresAt: 8640000000000000
					}, options);
				} else {
					// There are no previous documents or edges, so we need to create the inbound and outbound proxies!
					let inboundProxy = documentCollection.insert({
						_key: inboundProxyKey,
						createdAt: dateNow,
						expiresAt: 8640000000000000
					}, options);
					let outboundProxy = documentCollection.insert({
						_key: outboundProxyKey,
						createdAt: dateNow,
						expiresAt: 8640000000000000
					}, options);
					// And now we need to tie them together with the first document
					// By inserting the edges from the inbound proxy to the document and from the document to the outbound proxy
					edgeCollection.insert(inboundProxy._key, newDocument._id, {
						createdAt: dateNow,
						expiresAt: 8640000000000000
					}, options);
					edgeCollection.insert(newDocument._id, outboundProxy._id, {
						createdAt: dateNow,
						expiresAt: 8640000000000000
					}, options);
				}
			},
			params: {
				doc: this.name,
				edge: this.name + this.settings.edgeAppendix,
				object: object,
				options: options
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
		/**
		 * Section that validates parameters
		 */
		if (typeof handle !== 'string') {
			throw new Error('[TimeTravel] update received non-string as first parameter (handle)');
		}
		if (object !== Object(object)) {
			throw new Error('[TimeTravel] update received non-object as second parameter (object)');
		}
		if (options !== Object(options)) {
			throw new Error('[TimeTravel] update received non-object as third parameter (options)');
		}
		/**
		 * Begin of actual method
		 */
		// Let us first check if the handle exists!
		if (this.exists(handle)) {
			this.db._executeTransaction({
				collections: {
					write: [this.name, this.name + this.settings.edgeAppendix]
				},
				action: function({doc, edge, object, options}) {
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
					// Let us build the current version of the document
					let document = {};
					// Expire the old edges and documents
					oldDocumentsAndEdges.forEach((documentAndEdge) => {
						document = Object.assign(document, documentAndEdge['document']);
						documentCollection.update(documentAndEdge['document']._key, {expiresAt: dateNow});
						edgeCollection.update(documentAndEdge['edge']._key, {expiresAt: dateNow});
					});
					// Insert the updated document
					let newDocument = documentCollection.insert(Object.assign(document, object, {
						createdAt: dateNow,
						expiresAt: 8640000000000000
					}), options);
					// We have previous documents and edges, meaning the inbound proxy already exists
					// So we simply insert the new edge!
					edgeCollection.insert(inboundProxyKey, newDocument._id, {
						createdAt: dateNow,
						expiresAt: 8640000000000000
					}, options);
				},
				params: {
					doc: this.name,
					edge: this.name + this.settings.edgeAppendix,
					object: object,
					options: options
				}
			});
		} else {
			// Because if it does not exist, we simply redirect to the insert method
			this.insert(Object.assign(object, {id: handle}), options);
		}
	}
	
	remove(handle, options = {}) {
		/**
		 * Section that validates parameters
		 */
		if (typeof handle !== 'string') {
			throw new Error('[TimeTravel] remove received non-string as first parameter (handle)');
		}
		if (options !== Object(options)) {
			throw new Error('[TimeTravel] remove received non-object as second parameter (options)');
		}
		/**
		 * Begin of actual method
		 */
		this.db._executeTransaction({
			collections: {
				write: [this.name, this.name + this.settings.edgeAppendix]
			},
			action: function({doc, edge, handle, options}) {
				// Import arangoDB database driver
				const db = require('@arangodb').db;
				// Open up the collections to be inserted into
				let documentCollection = db._collection(doc);
				let edgeCollection = db._collection(edge);
				// Generate the Inbound Proxy Key
				let inboundProxyKey = edge + '/' + handle + '_INBOUNDPROXY';
				// Generate the Outbound Proxy Key
				let outboundProxyKey = edge + '/' + handle + '_OUTBOUNDPROXY';
				// Fetch the recent unexpired vertex and the edge to it
				let oldDocumentsAndEdges = db._query(aqlQuery`
					FOR vertex, edge IN OUTBOUND ${inboundProxyKey} ${edge}
					FILTER edge.expiresAt == 8640000000000000
					RETURN { 'document': vertex, 'edge': edge }
				`).toArray();
				// Establish current Date
				let dateNow = Date.now();
				// Expire the old edges and documents
				oldDocumentsAndEdges.forEach((documentAndEdge) => {
					documentCollection.update(documentAndEdge['document']._key, {expiresAt: dateNow});
					edgeCollection.update(documentAndEdge['edge']._key, {expiresAt: dateNow});
				});
				// TODO: Do we have to expire all edges pointing to the inbound and outbound proxy or is expiring
				// TODO: them enough?
				// Fetch all the edges to the inbound proxy
				let inboundEdges = db._query(aqlQuery`
					FOR v, edge IN INBOUND ${inboundProxyKey} ${edge}
					FILTER edge.expiresAt == 8640000000000000
					RETURN edge
				`).toArray()
				// Expire all the edges to the inbound proxy
				inboundEdges.forEach((edge) => {
					edgeCollection.update(edge._key, {expiresAt: dateNow});
				});
				// Fetch all the edges to the outbound proxy
				let outboundEdges = db._query(aqlQuery`
					FOR v, edge IN OUTBOUND ${outboundProxyKey} ${edge}
					FILTER edge.expiresAt == 8640000000000000
					RETURN edge
				`).toArray()
				// Expire all the edges to the outbound proxy
				outboundEdges.forEach((edge) => {
					edgeCollection.update(edge._key, {expiresAt: dateNow});
				});
				// Expire the inbound and outbound proxies
				documentCollection.update(inboundProxyKey, {expiresAt: dateNow});
				documentCollection.update(outboundProxyKey, {expiresAt: dateNow});
			},
			params: {
				doc: this.name,
				edge: this.name + this.settings.edgeAppendix,
				handle: handle,
				options: options
			}
		});
	}
	
	removeByKeys(handles, options = {}) {
		/**
		 * Section that validates parameters
		 */
		if (handles.constructor !== Array) {
			throw new Error('[TimeTravel] removeByKeys received non-array as first parameter (handles)');
		}
		if (options !== Object(options)) {
			throw new Error('[TimeTravel] removeByKeys received non-object as second parameter (options)');
		}
		/**
		 * Begin of actual method
		 */
		// We use the remove function on each individual handle to have the same source of origin for the functions
		handles.forEach((handle) => {
			this.remove(handle, options);
		})
	}
	
	removeByExample(example, options = {}) {
		/**
		 * Section that validates parameters
		 */
		if (example !== Object(example)) {
			throw new Error('[TimeTravel] removeByExample received non-object as first parameter (example)');
		}
		if (options !== Object(options)) {
			throw new Error('[TimeTravel] removeByExample received non-object as second parameter (options)');
		}
		/**
		 * Begin of actual method
		 */
			// First, we must fetch all the documents that match the example
		let documents = this.byExample(example).toArray();
		// Then we delegate to the remove function for each of the documents
		documents.forEach((document) => {
			this.remove(document._key, options);
		})
	}
	
	replaceByKeys(handles, object, options = {}) {
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
	
	replaceByExample(example, object, options = {}) {
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
	
	updateByKeys(handles, object, options = {}) {
		/**
		 * Section that validates parameters
		 */
		if (handles.constructor !== Array) {
			throw new Error('[TimeTravel] updateByKeys received non-array as first parameter (handles)');
		}
		if (object !== Object(object)) {
			throw new Error('[TimeTravel] updateByKeys received non-object as second parameter (object)');
		}
		if (options !== Object(options)) {
			throw new Error('[TimeTravel] updateByKeys received non-object as third parameter (options)');
		}
		/**
		 * Begin of actual method
		 */
		// We handle each handle seperately so we can rely on a single method for all update functionality!
		handles.forEach((handle) => {
			// We simply redirect to the update method
			this.update(handle, object, options);
		});
	}
	
	updateByExample(example, object, options = {}) {
		/**
		 * Section that validates parameters
		 */
		if (example !== Object(example)) {
			throw new Error('[TimeTravel] updateByExample received non-object as first parameter (example)');
		}
		if (object !== Object(object)) {
			throw new Error('[TimeTravel] updateByExample received non-object as second parameter (object)');
		}
		if (options !== Object(options)) {
			throw new Error('[TimeTravel] updateByExample received non-object as third parameter (options)');
		}
		/**
		 * Begin of actual method
		 */
			// First, we must fetch all the documents that match the example
		let documents = this.byExample(example).toArray();
		// Then we need to update each one with the new object!
		documents.forEach((document) => {
			// By redirecting to the update method
			this.update(document.id, object, options);
		})
	}
	
	history(handle) {
	
	}
	
	previous(handle, revision) {
	
	}
	
	next(handle, revision) {
	
	}
	
	documentsByDate(dateOfInterest, excludeCurrent = false) {
		/**
		 * Section that validates parameters
		 */
		if (!(dateOfInterest instanceof Date && !isNaN(dateOfInterest))) {
			throw new Error('[TimeTravel] documentsByDate received non-date as first parameter (dateOfInterest)');
		}
		if (typeof excludeCurrent !== typeof true) {
			throw new Error('[TimeTravel] documentsByDate received non-boolean as second parameter (excludeCurrent)');
		}
		/**
		 * Begin of actual method
		 */
			// Open up the edge collection
		let edgeCollection = db._collection(this.name + this.settings.edgeAppendix);
		// Let us store all documents that are found for cleanup later
		let documents = [];
		// Do we want the currently active documents?
		if (excludeCurrent) {
			// If not, we populate the documents with all documents that were valid until the dateOfInterest but not beyond
			documents = db._query(aqlQuery`
				FOR vertex IN ${edgeCollection}
				FILTER expiresAt >= ${dateOfInterest} && expiresAt != 8640000000000000
				RETURN vertex
			`).toArray();
		} else {
			// Otherwise we populate the documents with all documents, even still valid ones beyond the date of interest
			documents = db._query(aqlQuery`
				FOR vertex IN ${edgeCollection}
				FILTER expiresAt >= ${dateOfInterest}
				RETURN vertex
			`).toArray();
		}
		// And now we want to clean them up into uniqueDocuments
		let uniqueDocuments = [];
		// So we use the ID of the documents and compare the createdAt dates to get the latest
		documents.forEach((document) => {
			// Do we have the document already?
			if (document.id in uniqueDocuments) {
				// Then let us compare the creation dates
				if (uniqueDocuments[document.id].createdAt < document.createdAt) {
					// And if it is, we overwrite the document with the newer one
					uniqueDocuments[document.id] = document;
				}
			} else {
				// If we document does not exist yet, we insert it immediately
				uniqueDocuments[document.id] = document;
			}
		});
		// And finally, we return all unique documents that are the newest still valid documents of the date of interest
		return uniqueDocuments;
	}
	
	documentsByDateRange(dateRangeMin, dateRangeMax) {
	
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
		// We use the Inbound Proxy, as that key remains unique and the same for each document and thus is predictable
		return this.collection.document(handle + '_INBOUNDPROXY');
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
			// We create an array to collect all documents
		let documents = [];
		// forEach is synchronous and causes locking!
		handles.forEach((handle) => {
			// And fetch them one by one to have one source of origin for the function
			documents.push(this.document(handle));
		});
		// Before returning the resulting array
		return documents;
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
		// We use the Inbound Proxy, as that key remains unique and the same for each document and thus is predictable
		return this.collection.exists(handle + '_INBOUNDPROXY');
	}
}

module.exports.TimeTravelCollection = TimeTravelCollection;