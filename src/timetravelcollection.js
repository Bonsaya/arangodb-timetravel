/*
 * ===========================
 * timetravelcollection.js 02.08.18 17:12
 * Kevin 'Extremo' Sekin
 * Copyright (c) 2018
 * ===========================
 */

const GenericTimeCollection = require('./generictimecollection');

class TimeTravelCollection extends GenericTimeCollection {
	
	/**
	 * Establishes the TimeTravelCollection
	 * @param {ArangoDatabase} db The arangoDB db constant to access arangoDB
	 * @param {string} name The name of the collection
	 * @param {Object} settings The settings related to the timetravel collection
	 */
	constructor(db, name, settings) {
		super(db, name, settings);
	}
	
	/**
	 * Inserts a new logical vertex (document) into the timetravel collection
	 * @param {Object} object The document to be inserted
	 * @param {Object} options The options to use for insertion
	 */
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
		// Check if there are previous documents and edges
		if (this.exists(object.id)) {
			// We have previous documents and edges, meaning the inbound proxy already exists
			// And the insert command was used by accident instead of the update command!
			// So we simply redirect to the update function!
			this.update(object.id, object, options);
		} else {
			this.db._executeTransaction({
				collections: {
					write: [this.name, this.name + this.settings.timeTravelEdgeAppendix]
				},
				action: function({doc, edge, object, options, settings}) {
					// Import arangoDB database driver
					const db = require('@arangodb').db;
					// Open up the collections to be inserted into
					let documentCollection = db._collection(doc);
					let edgeCollection = db._collection(edge);
					// Generate the Inbound Proxy Key
					let inboundProxyKey = object.id + settings.proxy.inboundAppendix;
					// Generate the Outbound Proxy Key
					let outboundProxyKey = object.id + settings.proxy.outboundAppendix;
					// Establish current Date
					let dateNow = Date.now();
					// Insert new document
					let newDocument = documentCollection.insert(Object.assign(object, {
						createdAt: dateNow,
						expiresAt: 8640000000000000
					}), options);
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
					edgeCollection.insert({
						_from: inboundProxy._id,
						_to: newDocument._id,
						createdAt: dateNow,
						expiresAt: 8640000000000000
					}, options);
					edgeCollection.insert({
						_from: newDocument._id,
						_to: outboundProxy._id,
						createdAt: dateNow,
						expiresAt: 8640000000000000
					}, options);
				},
				params: {
					doc: this.name,
					edge: this.name + this.settings.timeTravelEdgeAppendix,
					object: object,
					options: options,
					settings: this.settings
				}
			});
		}
	}
	
	/**
	 * Replaces a document in the logical vertex with a new document, ignoring any data in the previous documents
	 * @param {String} handle The handle of the document
	 * @param {Object} object The new data of the document
	 * @param {Object} options The options related to replacing the document
	 */
	replace(handle, object, options = {}) {
		/**
		 * Section that validates parameters
		 */
		if (typeof handle !== 'string') {
			throw new Error('[TimeTravel] replace received non-string as first parameter (handle)');
		}
		if (object !== Object(object)) {
			throw new Error('[TimeTravel] replace received non-object as first parameter (object)');
		}
		if (options !== Object(options)) {
			throw new Error('[TimeTravel] replace received non-object as second parameter (options)');
		}
		if (typeof object._key === 'string') {
			delete object._key;
		}
		if (typeof object._id === 'string') {
			delete object._id;
		}
		// Slip the handle into the object
		object = Object.assign(object, {id: handle});
		if (typeof object.id !== 'string') {
			throw new Error('[TimeTravel] Attempted to replace document without id, _id or _key value');
		}
		/**
		 * Begin of actual method
		 */
		if (this.exists(object.id)) {
			this.db._executeTransaction({
				collections: {
					write: [this.name, this.name + this.settings.timeTravelEdgeAppendix]
				},
				action: function({doc, edge, object, options, settings}) {
					// Import arangoDB database driver
					const db = require('@arangodb').db;
					// Open up the collections to be inserted into
					let documentCollection = db._collection(doc);
					let edgeCollection = db._collection(edge);
					// Generate the Inbound Proxy Key
					let inboundProxyKey = doc + '/' + object.id + settings.proxy.inboundAppendix;
					// Generate the Outbound Proxy Key
					let outboundProxyKey = doc + '/' + object.id + settings.proxy.outboundAppendix;
					// Fetch the recent unexpired version of vertex and edge if any
					let oldDocumentsAndEdges = db._query(aqlQuery`
						FOR vertex, edge IN OUTBOUND ${inboundProxyKey} ${edgeCollection}
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
					// Fetch unexpired edges to outbound proxy
					let oldOutboundEdges = db._query(aqlQuery`
						FOR v, edge IN INBOUND ${outboundProxyKey} ${edgeCollection}
						FILTER edge.expiresAt == 8640000000000000
						RETURN edge
					`).toArray()
					// Expire old outbound edges
					oldOutboundEdges.forEach((edge) => {
						edgeCollection.update(edge._key, {expiresAt: dateNow});
					});
					// Insert the updated document
					let newDocument = documentCollection.insert(Object.assign(object, {
						createdAt: dateNow,
						expiresAt: 8640000000000000
					}), options);
					// We have previous documents and edges, meaning the inbound proxy already exists
					// So we simply insert the new edge!
					// Inbound
					edgeCollection.insert({
						_from: inboundProxyKey,
						_to: newDocument._id,
						createdAt: dateNow,
						expiresAt: 8640000000000000
					}, options);
					// Outbound
					edgeCollection.insert({
						_from: newDocument._id,
						_to: outboundProxyKey,
						createdAt: dateNow,
						expiresAt: 8640000000000000
					}, options);
				},
				params: {
					doc: this.name,
					edge: this.name + this.settings.timeTravelEdgeAppendix,
					object: object,
					options: options,
					settings: this.settings
				}
			});
		} else {
			this.insert(object, options);
		}
	}
	
	/**
	 * Updates a document inside the logical vertex while respecting previous data of the latest document
	 * @param {String} handle The handle of the document
	 * @param {Object} object The new data to overwrite previous data with
	 * @param {Object} options The options to consider when updating
	 */
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
		if (typeof object._key === 'string') {
			delete object._key;
		}
		if (typeof object._id === 'string') {
			delete object._id;
		}
		// Slip the handle into the object
		object = Object.assign(object, {id: handle});
		if (typeof object.id !== 'string') {
			throw new Error('[TimeTravel] Attempted to update document without id, _id or _key value');
		}
		/**
		 * Begin of actual method
		 */
		// Let us first check if the object exists!
		if (this.exists(object.id)) {
			this.db._executeTransaction({
				collections: {
					write: [this.name, this.name + this.settings.timeTravelEdgeAppendix]
				},
				action: function({doc, edge, object, options, settings}) {
					// Import arangoDB database driver
					const db = require('@arangodb').db;
					// Open up the collections to be inserted into
					let documentCollection = db._collection(doc);
					let edgeCollection = db._collection(edge);
					// Generate the Inbound Proxy Key
					let inboundProxyKey = doc + '/' + object.id + settings.proxy.inboundAppendix;
					// Generate the Outbound Proxy Key
					let outboundProxyKey = doc + '/' + object.id + settings.proxy.outboundAppendix;
					// Fetch the recent unexpired version of vertex and edge if any
					let oldDocumentsAndEdges = db._query(aqlQuery`
							FOR vertex, edge IN OUTBOUND ${inboundProxyKey} ${edgeCollection}
							FILTER edge.expiresAt == 8640000000000000
							RETURN { "document": vertex, "edge": edge }
						`).toArray();
					// Establish current Date
					let dateNow = Date.now();
					// Let us build the current version of the document
					let document = {createdAt: 0};
					// Expire the old edges and documents
					oldDocumentsAndEdges.forEach((documentAndEdge) => {
						// If the document was created after the latest we have saved
						if (document.createdAt < documentAndEdge['document'].createdAt) {
							// Replace it with the latest document
							document = documentAndEdge['document'];
						}
						documentCollection.update(documentAndEdge['document']._key, {expiresAt: dateNow});
						edgeCollection.update(documentAndEdge['edge']._key, {expiresAt: dateNow});
					});
					// Fetch unexpired edges to outbound proxy
					let oldOutboundEdges = db._query(aqlQuery`
						FOR v, edge IN INBOUND ${outboundProxyKey} ${edgeCollection}
						FILTER edge.expiresAt == 8640000000000000
						RETURN edge
					`).toArray()
					// Expire old outbound edges
					oldOutboundEdges.forEach((edge) => {
						edgeCollection.update(edge._key, {expiresAt: dateNow});
					});
					// Delete the previous _key, _rev, _id from the document, so arangoDB can choose a new one
					delete document._key;
					delete document._rev;
					delete document._id;
					// Insert the updated document
					let newDocument = documentCollection.insert(Object.assign(document, object, {
						createdAt: dateNow,
						expiresAt: 8640000000000000
					}), options);
					// We have previous documents and edges, meaning the inbound proxy already exists
					// So we simply insert the new edge!
					// Inbound
					edgeCollection.insert({
						_from: inboundProxyKey,
						_to: newDocument._id,
						createdAt: dateNow,
						expiresAt: 8640000000000000
					}, options);
					// Outbound
					edgeCollection.insert({
						_from: newDocument._id,
						_to: outboundProxyKey,
						createdAt: dateNow,
						expiresAt: 8640000000000000
					}, options);
				},
				params: {
					doc: this.name,
					edge: this.name + this.settings.timeTravelEdgeAppendix,
					object: object,
					options: options,
					settings: this.settings
				}
			});
		} else {
			// Because if it does not exist, we simply redirect to the insert method
			this.insert(object, options);
		}
	}
	
	/**
	 * Expires all documents from a logical vertex, including all edges pointing to the logical vertex
	 * @param {string] handle The id of the logical vertex
	 * @param {Object} options The options to consider upon removal
	 */
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
		if (this.exists(handle)) {
			this.db._executeTransaction({
				collections: {
					write: [this.name, this.name + this.settings.timeTravelEdgeAppendix]
				},
				action: function({doc, edge, handle, options, settings}) {
					// Import arangoDB database driver
					const db = require('@arangodb').db;
					// Open up the collections to be inserted into
					let documentCollection = db._collection(doc);
					let edgeCollection = db._collection(edge);
					// Generate the Inbound Proxy Key
					let inboundProxyKey = doc + '/' + handle + settings.proxy.inboundAppendix;
					// Generate the Outbound Proxy Key
					let outboundProxyKey = doc + '/' + handle + settings.proxy.outboundAppendix;
					// Fetch the recent unexpired vertex and the edge to it
					let oldDocumentsAndEdges = db._query(aqlQuery`
					FOR vertex, edge IN OUTBOUND ${inboundProxyKey} ${edgeCollection}
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
					// Fetch unexpired edges to outbound proxy
					let oldOutboundEdges = db._query(aqlQuery`
						FOR v, edge IN INBOUND ${outboundProxyKey} ${edgeCollection}
						FILTER edge.expiresAt == 8640000000000000
						RETURN edge
					`).toArray()
					// Expire old outbound edges
					oldOutboundEdges.forEach((edge) => {
						edgeCollection.update(edge._key, {expiresAt: dateNow});
					});
					// TODO: Do we have to expire all edges pointing to the inbound and outbound proxy or is expiring
					// TODO: them enough?
					// Fetch all the edges to the inbound proxy
					let inboundEdges = db._query(aqlQuery`
					FOR v, edge IN INBOUND ${inboundProxyKey} ${edgeCollection}
					FILTER edge.expiresAt == 8640000000000000
					RETURN edge
				`).toArray()
					// Expire all the edges to the inbound proxy
					inboundEdges.forEach((edge) => {
						edgeCollection.update(edge._key, {expiresAt: dateNow});
					});
					// Fetch all the edges to the outbound proxy
					let outboundEdges = db._query(aqlQuery`
					FOR v, edge IN OUTBOUND ${outboundProxyKey} ${edgeCollection}
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
					edge: this.name + this.settings.timeTravelEdgeAppendix,
					handle: handle,
					options: options,
					settings: this.settings
				}
			});
		} else {
			throw new Error('[TimeTravel] remove received a handle that does not exist!');
		}
	}
	
	/**
	 * Expires all logical vertices that match the ids provided in handles, including all edges pointing to them
	 * @param {Array} handles The ids of the logical vertices
	 * @param {Object} options The options to consider upon removal
	 */
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
	
	/**
	 * Expires all logical vertices that match the example provided, including all edges pointing to them
	 * @param {Object} example The example to compare with the logical vertices
	 * @param {Object} options The options to consider upon removal
	 */
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
	
	/**
	 * Replaces the documents in all logical vertices that match the ids provided with the new data, ignoring previous data
	 * @param {Array} handles The ids to replace
	 * @param {Object} object The new document
	 * @param {Object} options The options to consider for replacement
	 */
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
			// We simply redirect to the replace method, as this will expire old entries if they exist and thus "replace" it.
			this.replace(handle, object, options);
		});
	}
	
	/**
	 * Replaces the documents that match the example provided, ignoring previous data from the existing documents
	 * @param {Object} example The example to match
	 * @param {Object} object The new document to replace the old one with
	 * @param {Object} options The options to consider for replacement
	 */
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
			// Then we can redirect to the replace method
			this.replace(document.id, object, options);
		})
	}
	
	/**
	 * Updates the documents matched by the keys provided while considering previous data inside the existing documents
	 * @param {Array} handles The ids of the logical vertices
	 * @param {Object} object The new data
	 * @param {Object} options The options to consider when updating
	 */
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
	
	/**
	 * Updates the documents matched by the example provided while considering previous data inside the existing documents
	 * @param {Object} example The example to match the documents against
	 * @param {Object} object The new data
	 * @param {Object} options The options to consider when updating
	 */
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
	
	/**
	 * Returns all edges and documents inside the logical vertex to have an overview of the history
	 * @param {string} handle The id of the logical vertex
	 * @returns {Array} Returns an array of [{document: vertex, edge: edge}]
	 */
	history(handle) {
		/**
		 * Section that validates parameters
		 */
		if (typeof handle !== 'string') {
			throw new Error('[TimeTravel] history received non-string as first parameter (handle)');
		}
		/**
		 * Begin of actual method
		 */
		// Let us first check if the handle exists!
		if (this.exists(handle)) {
			// Open the edge collection
			let edgeCollection = this.db._collection(this.name + this.settings.timeTravelEdgeAppendix);
			// Generate the Inbound Proxy Key
			let inboundProxyKey = this.name + '/' + handle
				+ this.settings.proxy.inboundAppendix;
			// Return all edges and vertices related to that inboundProxy
			return this.db._query(aqlQuery`
				FOR vertex, edge IN OUTBOUND ${inboundProxyKey} ${edgeCollection}
				RETURN { 'document': vertex, 'edge': edge }
			`).toArray();
		} else {
			throw new Error('[TimeTravel] history received handle that was not found.');
		}
	}
	
	/**
	 * Returns the previous document in the logical vertex if any, otherwise returns the same document provided
	 * @param {string] handle The id of the logical vertex
	 * @param {Object} revision The current document
	 * @returns {Object} The previous document or the current provided document if there are no more previous documents
	 */
	previous(handle, revision) {
		/**
		 * Section that validates parameters
		 */
		if (typeof handle !== 'string') {
			throw new Error('[TimeTravel] previous received non-string as first parameter (handle)');
		}
		if (revision !== Object(revision)) {
			throw new Error('[TimeTravel] previous received non-object as second parameter (revision)');
		}
		if (!revision.hasOwnProperty('createdAt') && typeof revision.createdAt !== 'number') {
			throw new Error('[TimeTravel] previous received invalid document as second parameter (revision)');
		}
		/**
		 * Begin of actual method
		 */
		// Let us first check if the handle exists!
		if (this.exists(handle)) {
			// Open the edge collection
			let edgeCollection = this.db._collection(this.name + this.settings.timeTravelEdgeAppendix);
			// Generate the Inbound Proxy Key
			let inboundProxyKey = this.name + '/' + handle
				+ this.settings.proxy.inboundAppendix;
			// Fetch the vertex that expired when the new one was created to get the previous document
			let document = null;
			try {
				document = this.db._query(aqlQuery`
					FOR vertex IN OUTBOUND ${inboundProxyKey} ${edgeCollection}
					FILTER vertex.expiresAt == ${revision.createdAt}
					RETURN vertex
				`).next();
			} catch (e) {
				return revision;
			}
		} else {
			throw new Error('[TimeTravel] previous received handle that was not found.');
		}
	}
	
	/**
	 * Returns the next document in the logical vertex if any, otherwise returns the same document provided
	 * @param {string} handle The id of the logical vertex
	 * @param {Object} revision The current document
	 * @returns {Object} The next document or the current provided document if there are no more next documents
	 */
	next(handle, revision) {
		/**
		 * Section that validates parameters
		 */
		if (typeof handle !== 'string') {
			throw new Error('[TimeTravel] previous received non-string as first parameter (handle)');
		}
		if (revision !== Object(revision)) {
			throw new Error('[TimeTravel] previous received non-object as second parameter (revision)');
		}
		if (!revision.hasOwnProperty('expiresAt') && typeof revision.createdAt !== 'number') {
			throw new Error('[TimeTravel] next received invalid document as second parameter (revision)');
		}
		/**
		 * Begin of actual method
		 */
		// Let us first check if the handle exists!
		if (this.exists(handle)) {
			// Open the edge collection
			let edgeCollection = this.db._collection(this.name + this.settings.timeTravelEdgeAppendix);
			// Generate the Inbound Proxy Key
			let inboundProxyKey = this.name + '/' + handle
				+ this.settings.proxy.inboundAppendix;
			// Fetch the vertex that was created when the new one was expired to get the next document
			let document = null;
			try {
				document = this.db._query(aqlQuery`
					FOR vertex IN OUTBOUND ${inboundProxyKey} ${edgeCollection}
					FILTER vertex.createdAt == ${revision.expiresAt}
					RETURN vertex
				`).next();
			} catch (e) {
				return revision;
			}
			if (!document) {
				return revision;
			}
			return document;
		} else {
			throw new Error('[TimeTravel] previous received handle that was not found.');
		}
	}
	
	/**
	 * Returns all logical vertices in the state that they were on the date of interest
	 * @param {String} handle The id of the documents of interest
	 * @param {Date} dateOfInterest The date of interest
	 * @param {boolean} excludeCurrent Whether to prefer createdAt or expiresAt
	 * @returns {Array} The documents that were valid during the date of interest
	 */
	documentsByDate(handle, dateOfInterest, excludeCurrent = false) {
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
		let edgeCollection = this.db._collection(this.name + this.settings.timeTravelEdgeAppendix);
		// Let us store all documents that are found for cleanup later
		let documents = [];
		// Do we want the currently active documents?
		if (excludeCurrent) {
			// If not, we populate the documents with all documents that were valid until the dateOfInterest but not beyond
			documents = this.db._query(aqlQuery`
				FOR vertex IN ${edgeCollection}
				FILTER vertex.id==${handle} && vertex.createdAt < ${dateOfInterest} && vertex.expiresAt >= ${dateOfInterest}
				RETURN vertex
			`).toArray();
		} else {
			// Otherwise we populate the documents with all documents, even still valid ones beyond the date of interest
			documents = this.db._query(aqlQuery`
				FOR vertex IN ${edgeCollection}
				FILTER vertex.id==${handle} && vertex.createdAt <= ${dateOfInterest} && vertex.expiresAt > ${dateOfInterest}
				RETURN vertex
			`).toArray();
		}
		// And finally, we return all documents of the date of interest
		return documents;
	}
	
	/**
	 * Returns all documents that were valid within a certain date range
	 * @param {String} handle The id of the documents of interest
	 * @param {Date} dateRangeMin The minimum date to be valid at
	 * @param {Date} dateRangeMax The maximum date to be valid at
	 * @returns {Array} The documents that were valid given the timeframe
	 */
	documentsByDateRange(handle, dateRangeMin, dateRangeMax) {
		/**
		 * Section that validates parameters
		 */
		if (typeof handle !== 'string') {
			throw new Error('[TimeTravel] documentsByDateRange received non-string as first parameter (handle)');
		}
		if (!(dateRangeMin instanceof Date && !isNaN(dateRangeMin))) {
			throw new Error('[TimeTravel] documentsByDateRange received non-date as second parameter (dateRangeMin)');
		}
		if (!(dateRangeMax instanceof Date && !isNaN(dateRangeMax))) {
			throw new Error('[TimeTravel] documentsByDateRange received non-date as third parameter (dateRangeMax)');
		}
		if (dateRangeMin >= dateRangeMax) {
			throw new Error('[TimeTravel] documentsByDateRange received a minimum date that exceeds or equals the maximum date (dateRangeMin >= dateRangeMax)');
		}
		/**
		 * Begin of actual method
		 */
			// Open up the edge collection
		let edgeCollection = this.db._collection(this.name + this.settings.timeTravelEdgeAppendix);
		// Let us fetch and store all documents that are found for cleanup later
		// TODO: These queries dont make sense yet.. what is the use-case? Need to think about them again
		let documents = this.db._query(aqlQuery`
				FOR vertex IN ${edgeCollection}
				FILTER vertex.id==${handle} && vertex.createdAt <= ${dateRangeMin} && vertex.expiresAt > ${dateRangeMax}
				RETURN vertex
			`).toArray();
		// And finally, we return all documents of interest
		return documents;
	}
	
	/**
	 * Returns the latest document with the given handle
	 * @param {string} handle The id of the logical vertex
	 * @returns {Object} The latest document
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
		let edgeCollection = db._collection(this.name + this.settings.timeTravelEdgeAppendix);
		try {
			return this.db._query(aqlQuery`
				FOR vertex, edge IN OUTBOUND ${this.name + '/' + handle
			+ this.settings.proxy.inboundAppendix} ${edgeCollection}
				FILTER vertex.expiresAt == 8640000000000000
				RETURN vertex
			`).next();
		} catch (e) {
			throw new Error('[TimeTravel] document received handle that could not be found.');
		}
	}
	
	/**
	 * Returns the latest documents of the given handles
	 * @param {Array} handles The ids of the documents
	 * @returns {Array} The latest documents
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
	
	/**
	 * Checks whether a document with a certain id exists
	 * @param {string} handle The id of the document
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
		// We use the Inbound Proxy, as that key remains unique and the same for each document and thus is predictable
		return this.collection.exists(handle + this.settings.proxy.inboundAppendix);
	}
}

module.exports = TimeTravelCollection;