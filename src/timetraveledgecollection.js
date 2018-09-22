/*
 * ===========================
 * timetraveledgecollection.js 02.08.18 17:33
 * Kevin 'Extremo' Sekin
 * Copyright (c) 2018
 * ===========================
 */

const GenericTimeCollection = require('./generictimecollection');
const TimeTravelInfo = require('./timetravelinfo');
const latest = require('./literals/latest');

class TimeTravelEdgeCollection extends GenericTimeCollection {
	
	/**
	 * Establishes the TimeTravelEdgeCollection
	 * @param {ArangoDatabase} db The arangoDB db constant to access arangoDB
	 * @param {string} name The name of the collection
	 * @param {Object} settings The settings related to the timetravel collection
	 */
	constructor(db, name, settings) {
		super(db, name, settings);
		this.timeTravelSettings = false;
	}
	
	/**
	 * Checks whether the collection is a timetravel collection or not
	 * @param name The collection name
	 * @return {Boolean} Whether it is a timetravel collection or not
	 */
	isTimeTravelCollection(name) {
		/**
		 * Section that validates parameters
		 */
		if (typeof name !== 'string') {
			throw new Error('[TimeTravel] isTimeTravelCollection received non-string as first parameter(name)');
		}
		/**
		 * Begin of actual method
		 */
		// Determine whether we've already got the timetravel settings collection opened
		if (!this.timeTravelSettings) {
			this.timeTravelSettings = this.db._collection(TimeTravelInfo.settingsCollectionName);
		}
		// Fetch the latest collection info so that we can always be sure its accurate
		let collectionInfo = this.timeTravelSettings.document('__collections__');
		// And return whether it is a timetravel collection
		return (collectionInfo.collections.document.includes(name) ||
			collectionInfo.collections.edge.includes(name));
	}
	
	/**
	 * Inserts a new edge into the timetraveledge collection
	 * @param {Object} object The extra data of the edge
	 * @param {Object} options The options related to the insertion
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
			let key = object._id.split('/')[1];
			if (typeof object.id === 'string' && object.id !== key) {
				throw new Error('[TimeTravel] Attempted to insert edge without consistent _key and _id values!');
			}
			object.id = key;
			delete object._id;
		}
		if (typeof object.id !== 'string') {
			throw new Error('[TimeTravel] Attempted to insert edge without id, _id or _key value');
		}
		if (typeof object._from !== 'string') {
			throw new Error('[TimeTravel] Attempted to insert edge without _from value');
		}
		if (typeof object._to !== 'string') {
			throw new Error('[TimeTravel] Attempted to insert edge without _to value');
		}
		/**
		 * Begin of actual method
		 */
		// Check if the edge already exists
		if (this.exists(object.id)) {
			// And redirect to update if it already does
			this.update(object.id, object, options);
		} else {
			// Establish that by default, we do not append the outbound and inbound prefixes for the transaction
			let appendOutbound = false;
			let appendInbound = false;
			// Define the splitPosition to be -1 and use it to search _from and _to for a collection
			let splitPosition = -1;
			// Determine whether _from has a collection before the key, seperated by / character
			if ((splitPosition = object._from.indexOf('/')) !== -1) {
				// If we do, let us slice the string off at that location to get the document collection the document exists in
				let outboundCollection = object._from.slice(0, splitPosition);
				// And determine if the document collection is part of our timetravel framework (whether to append the outbound prefix)
				appendOutbound = this.isTimeTravelCollection(outboundCollection);
			}
			// Same as above
			if ((splitPosition = object._to.indexOf('/')) !== -1) {
				let inboundCollection = object._to.slice(0, splitPosition);
				appendInbound = this.isTimeTravelCollection(inboundCollection);
			}
			this.db._executeTransaction({
				collections: {
					write: [this.name]
				},
				action: function({edge, from, to, object, maxTime, options}) {
					// Import arangoDB database driver
					const db = require('@arangodb').db;
					// Open up the edge collection
					let edgeCollection = db._collection(edge);
					// Establish the current date
					let dateNow = Date.now();
					// Otherwise we need to insert the new edge
					edgeCollection.insert(Object.assign({
						_from: from,
						_to: to,
						createdAt: dateNow,
						expiresAt: maxTime,
					}, object), options);
				},
				params: {
					edge: this.name,
					from: appendOutbound ? object._from + this.settings.proxy.outboundAppendix : object._from,
					to: appendInbound ? object._to + this.settings.proxy.inboundAppendix : object._to,
					object: object,
					maxTime: TimeTravelInfo.maxTime,
					options: options
				}
			});
		}
	}
	
	/**
	 * Replaces an edge with a new one, ignoring previous data in the edges
	 * @param {String} handle The handle of the document
	 * @param {Object} object The extra data of the edge
	 * @param {Object} options The options to consider upon replacement
	 */
	replace(handle, object, options = {}) {
		/**
		 * Section that validates parameters
		 */
		if (typeof handle !== 'string') {
			throw new Error('[TimeTravel] replace received non-string as first parameter (handle)');
		}
		if (object !== Object(object)) {
			throw new Error('[TimeTravel] insert received non-object as second parameter (object)');
		}
		if (options !== Object(options)) {
			throw new Error('[TimeTravel] insert received non-object as third parameter (options)');
		}
		if (typeof object._key === 'string') {
			delete object._key;
		}
		if (typeof object._id === 'string') {
			delete object._id;
		}
		object = Object.assign(object, {id: handle});
		if (typeof object.id !== 'string') {
			throw new Error('[TimeTravel] Attempted to insert edge without id, _id or _key value');
		}
		/**
		 * Begin of actual method
		 */
		// Check if the edge already exists
		if (this.exists(object.id)) {
			this.db._executeTransaction({
				collections: {
					write: [this.name]
				},
				action: function({edge, object, maxTime, latest, options}) {
					// Import arangoDB database driver
					const db = require('@arangodb').db;
					// Open up the edge collection
					let edgeCollection = db._collection(edge);
					// Establish current date
					let dateNow = Date.now();
					// Expire previous edges
					let from = undefined;
					let to = undefined;
					let currentEdges = db._query(aqlQuery`
							FOR edge IN ${edgeCollection}
							FILTER edge.id==${object.id} && edge.${latest}
							RETURN edge
						`).toArray();
					currentEdges.forEach((edge) => {
						edgeCollection.update(edge._key, {expiresAt: dateNow});
						from = edge._from;
						to = edge._to;
					});
					// Insert the new edge
					edgeCollection.insert(Object.assign({
						_from: from,
						_to: to,
						createdAt: dateNow,
						expiresAt: maxTime,
					}, object), options);
				},
				params: {
					edge: this.name,
					object: object,
					maxTime: TimeTravelInfo.maxTime,
					latest: latest,
					options: options
				}
			});
		} else {
			// Cannot replace what does not exist! Forward to insert
			this.insert(object, options);
		}
	}
	
	/**
	 * Replaces the edges matched by keys, ignoring previous data in the edges
	 * @param {Array} handles The ids of the edges to replace
	 * @param {Object} object The extra data of the edges
	 * @param {Object} options The options to be considered upon replacement
	 */
	replaceByKeys(handles, object, options = {}) {
		/**
		 * Section that validates parameters
		 */
		if (Array.isArray(handles)) {
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
			// Fetch all the edges with those handles
		let documents = this.documents(handles);
		documents.forEach((document) => {
			// And redirect each of them to the replace function
			this.replace(document.id, object, options);
		});
	}
	
	/**
	 * Replaces the edges matched by example, ignoring previous data in the edge
	 * @param {Object} example The example to match against the edges
	 * @param {Object} object The new data to replace
	 * @param {Object} options The options to consider upon replacement
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
			// Fetch all the edges by example
		let documents = this.byExample(example);
		documents.forEach((document) => {
			// And redirect each of them to the replace function
			this.replace(document.id, object, options);
		});
	}
	
	/**
	 * Updates the edge with the new data, respecting previous data from the edge
	 * @param {String} handle The handle of the document
	 * @param {Object} object The extra data to merge with the previous
	 * @param {Object} options The options to consider upon updating
	 */
	update(handle, object, options = {}) {
		/**
		 * Section that validates parameters
		 */
		if (typeof handle !== 'string') {
			throw new Error('[TimeTravel] replace received non-string as first parameter (handle)');
		}
		if (object !== Object(object)) {
			throw new Error('[TimeTravel] insert received non-object as second parameter (object)');
		}
		if (options !== Object(options)) {
			throw new Error('[TimeTravel] insert received non-object as third parameter (options)');
		}
		if (typeof object._key === 'string') {
			delete object._key;
		}
		if (typeof object._id === 'string') {
			delete object._id;
		}
		object = Object.assign(object, {id: handle});
		if (typeof object.id !== 'string') {
			throw new Error('[TimeTravel] Attempted to insert edge without id, _id or _key value');
		}
		/**
		 * Begin of actual method
		 */
		// Check if the edge already exists
		if (this.exists(object.id)) {
			this.db._executeTransaction({
				collections: {
					write: [this.name]
				},
				action: function({edge, object, maxTime, latest, options}) {
					// Import arangoDB database driver
					const db = require('@arangodb').db;
					// Open up the edge collection
					let edgeCollection = db._collection(edge);
					// Establish current date
					let dateNow = Date.now();
					// Build the current version of the edge
					let latestEdge = {createdAt: 0};
					// Expire previous edges
					let currentEdges = db._query(aqlQuery`
							FOR edge IN ${edgeCollection}
							FILTER edge.id==${object.id} && edge.${latest}
							RETURN edge
						`).toArray();
					currentEdges.forEach((edge) => {
						// If the latestEdge was created before the current edge we're looking at
						if (latestEdge.createdAt < edge.createdAt) {
							// Merge the edge with the latest edge
							latestEdge = edge;
						}
						edgeCollection.update(edge._key, {expiresAt: dateNow});
					});
					// Remove unimportant data from latest Edge
					delete latestEdge._key;
					delete latestEdge._rev;
					delete latestEdge._id;
					// Insert the new edge
					edgeCollection.insert(Object.assign(latestEdge, {
						createdAt: dateNow,
						expiresAt: maxTime,
					}, object), options);
				},
				params: {
					edge: this.name,
					object: object,
					maxTime: TimeTravelInfo.maxTime,
					latest: latest,
					options: options
				}
			});
		} else {
			// Cannot replace what does not exist! Forward to insert
			this.insert(object, options);
		}
	}
	
	/**
	 * Updates all edges that are matched by keys with the new data, respecting the previous data of the edges
	 * @param {Array} handles The ids to match
	 * @param {Object} object The extra data to merge with the previous data
	 * @param {Object} options The options to consider upon updating
	 */
	updateByKeys(handles, object, options = {}) {
		/**
		 * Section that validates parameters
		 */
		if (Array.isArray(handles)) {
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
			// Fetch all the edges with those handles
		let documents = this.documents(handles);
		documents.forEach((document) => {
			// And redirect each of them to the update function
			this.update(document.id, object, options);
		});
	}
	
	/**
	 * Updates all edges that match the example, respecting previous data in the edges
	 * @param {Object} example The example to match against
	 * @param {Object} object The extra data to merge with the previous
	 * @param {Object} options The options to consider upon updating
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
			// Fetch all the edges by example
		let documents = this.byExample(example);
		documents.forEach((document) => {
			// And redirect each of them to the update function
			this.update(document.id, object, options);
		});
	}
	
	/**
	 * Expires the edge selected by handle
	 * @param {string} handle The id of the edge
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
		/**
		 * Begin of actual method
		 */
		// Check if the edge already exists
		if (this.exists(handle)) {
			this.db._executeTransaction({
				collections: {
					write: [this.name]
				},
				action: function({edge, handle, latest, options}) {
					// Import arangoDB database driver
					const db = require('@arangodb').db;
					// Open up the edge collection
					let edgeCollection = db._collection(edge);
					// Establish current date
					let dateNow = Date.now();
					// Expire all edges
					let currentEdges = db._query(aqlQuery`
							FOR edge IN ${edgeCollection}
							FILTER edge.id==${handle} && edge.${latest}
							RETURN edge
						`).toArray();
					currentEdges.forEach((edge) => {
						edgeCollection.update(edge._key, {expiresAt: dateNow});
					});
				},
				params: {
					edge: this.name,
					handle: handle,
					latest: latest,
					options: options
				}
			});
		} else {
			// Cannot remove what doesn't exist!
			throw new Error('[TimeTravel] Attempted to remove an edge that does not exist!');
		}
	}
	
	/**
	 * Expires all edges matched by the ids provided
	 * @param {Array} handles The ids to match
	 * @param {Object} options The options to consider upon removal
	 */
	removeByKeys(handles, options = {}) {
		/**
		 * Section that validates parameters
		 */
		if (Array.isArray(handles)) {
			throw new Error('[TimeTravel] removeByKeys received non-array as first parameter (handles)');
		}
		if (options !== Object(options)) {
			throw new Error('[TimeTravel] removeByKeys received non-object as third parameter (options)');
		}
		/**
		 * Begin of actual method
		 */
			// Fetch all the edges with those handles
		let documents = this.documents(handles);
		documents.forEach((document) => {
			// And redirect each of them to the remove function
			this.remove(document.id, options);
		});
	}
	
	/**
	 * Expires all edges matched by the example provided
	 * @param {Object} example The example to match against
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
			throw new Error('[TimeTravel] removeByExample received non-object as third parameter (options)');
		}
		/**
		 * Begin of actual method
		 */
			// Fetch all the edges by example
		let documents = this.byExample(example);
		documents.forEach((document) => {
			// And redirect each of them to the remove function
			this.remove(document.id, options);
		});
	}
	
	/**
	 * Returns all edges matched by the handle to have a history of the edge and its expired counterparts
	 * @param handle The id to match
	 * @returns {Array} The edges
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
			let edgeCollection = this.db._collection(this.name);
			// Return all edges with the handle
			return this.db._query(aqlQuery`
				FOR edge IN ${edgeCollection}
				FILTER edge.id == ${handle}
				RETURN edge
			`).toArray();
		} else {
			throw new Error('[TimeTravel] history received handle that was not found.');
		}
	}
	
	/**
	 * Returns the previous edge or the same edge if no previous was found
	 * @param {string} handle The id of the edge
	 * @param {Object} revision The current edge
	 * @returns The previous edge
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
			let edgeCollection = this.db._collection(this.name);
			// Fetch the vertex that expired when the new one was created to get the previous document
			let document = null;
			try {
				document = this.db._query(aqlQuery`
					FOR edge IN ${edgeCollection}
					FILTER edge.expiresAt == ${revision.createdAt} && edge.id == ${handle}
					RETURN edge
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
	 * Returns the next edge or the same edge if no next was found
	 * @param handle The id of the edge
	 * @param revision The current edge
	 * @returns The next edge
	 */
	next(handle, revision) {
		/**
		 * Section that validates parameters
		 */
		if (typeof handle !== 'string') {
			throw new Error('[TimeTravel] next received non-string as first parameter (handle)');
		}
		if (revision !== Object(revision)) {
			throw new Error('[TimeTravel] next received non-object as second parameter (revision)');
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
			let edgeCollection = this.db._collection(this.name);
			// Fetch the vertex that was created when the new one was expired to get the next document
			let document = null;
			try {
				document = this.db._query(aqlQuery`
					FOR edge IN ${edgeCollection}
					FILTER edge.createdAt == ${revision.expiresAt} && edge.id == ${handle}
					RETURN edge
				`).next();
			} catch (e) {
				return revision;
			}
			if (!document) {
				return revision;
			}
			return document;
		} else {
			throw new Error('[TimeTravel] next received handle that was not found.');
		}
	}
	
	/**
	 * Returns all edges of the handle
	 * @param handle The id of the edges
	 * @param dateOfInterest The date of interest
	 * @returns {Array} The edges
	 */
	edges(handle, dateOfInterest = TimeTravelInfo.maxTime) {
		/**
		 * Section that validates parameters
		 */
		if (typeof handle !== 'string') {
			throw new Error('[TimeTravel] edges received non-string as first parameter (handle)');
		}
		if (typeof dateOfInterest !== 'number') {
			throw new Error('[TimeTravel] edges received non-number as second parameter (dateOfInterest)');
		}
		/**
		 * Begin of actual method
		 */
		if (dateOfInterest >= TimeTravelInfo.maxTime) {
			// In order for the query to always work, we must ensure that dateOfInterest never surpasses expiresAt
			dateOfInterest = TimeTravelInfo.maxTime - 1;
		}
		const result = this.db._query(aqlQuery`
			FOR vertex, edge IN ANY ${handle} ${this.collection}
			FILTER edge.createdAt <= ${dateOfInterest} && edge.expiresAt > ${dateOfInterest}
			RETURN edge
			`).toArray();
		return this.resolveProxies(result);
	}
	
	/**
	 * Returns all inbound edges of the handle
	 * @param handle The id of the edge
	 * @param dateOfInterest The date of interest
	 * @returns {Array} The edges
	 */
	inEdges(handle, dateOfInterest = TimeTravelInfo.maxTime) {
		/**
		 * Section that validates parameters
		 */
		if (typeof handle !== 'string') {
			throw new Error('[TimeTravel] inEdges received non-string as first parameter (handle)');
		}
		if (typeof dateOfInterest !== 'number') {
			throw new Error('[TimeTravel] inEdges received non-number as second parameter (dateOfInterest)');
		}
		/**
		 * Begin of actual method
		 */
		if (dateOfInterest >= TimeTravelInfo.maxTime) {
			// In order for the query to always work, we must ensure that dateOfInterest never surpasses expiresAt
			dateOfInterest = TimeTravelInfo.maxTime - 1;
		}
		const result = this.db._query(aqlQuery`
			FOR vertex, edge IN INBOUND ${handle} ${this.collection}
			FILTER edge.createdAt <= ${dateOfInterest} && edge.expiresAt > ${dateOfInterest}
			RETURN edge
			`).toArray();
		return this.resolveProxies(result);
	}
	
	/**
	 * Returns all outbound edges of the handle
	 * @param handle The id of the edge
	 * @param dateOfInterest The date of interest
	 * @returns {Array} The edges
	 */
	outEdges(handle, dateOfInterest = TimeTravelInfo.maxTime) {
		/**
		 * Section that validates parameters
		 */
		if (typeof handle !== 'string') {
			throw new Error('[TimeTravel] outEdges received non-string as first parameter (handle)');
		}
		if (typeof dateOfInterest !== 'number') {
			throw new Error('[TimeTravel] outEdges received non-number as second parameter (dateOfInterest)');
		}
		/**
		 * Begin of actual method
		 */
		if (dateOfInterest >= TimeTravelInfo.maxTime) {
			// In order for the query to always work, we must ensure that dateOfInterest never surpasses expiresAt
			dateOfInterest = TimeTravelInfo.maxTime - 1;
		}
		const result = this.db._query(aqlQuery`
			FOR vertex, edge IN OUTBOUND ${handle} ${this.collection}
			FILTER edge.createdAt <= ${dateOfInterest} && edge.expiresAt > ${dateOfInterest}
			RETURN edge
			`).toArray();
		return this.resolveProxies(result);
	}
	
	/**
	 * Returns all vertices of the handle
	 * @param handle The id of the edges
	 * @param dateOfInterest The date of interest
	 * @returns {Array} The vertices
	 */
	neighbours(handle, dateOfInterest = TimeTravelInfo.maxTime) {
		/**
		 * Section that validates parameters
		 */
		if (typeof handle !== 'string') {
			throw new Error('[TimeTravel] neighbours received non-string as first parameter (handle)');
		}
		if (typeof dateOfInterest !== 'number') {
			throw new Error('[TimeTravel] neighbours received non-number as second parameter (dateOfInterest)');
		}
		/**
		 * Begin of actual method
		 */
		if (dateOfInterest >= TimeTravelInfo.maxTime) {
			// In order for the query to always work, we must ensure that dateOfInterest never surpasses expiresAt
			dateOfInterest = TimeTravelInfo.maxTime - 1;
		}
		const result = this.db._query(aqlQuery`
			FOR vertex, edge IN ANY ${handle} ${this.collection}
			FILTER edge.createdAt <= ${dateOfInterest} && edge.expiresAt > ${dateOfInterest}
			RETURN vertex
			`).toArray();
		return this.resolveProxies(result);
	}
	
	/**
	 * Returns all inbound vertices of the handle
	 * @param handle The id of the edge
	 * @param dateOfInterest The date of interest
	 * @returns {Array} The vertices
	 */
	inNeighbours(handle, dateOfInterest = TimeTravelInfo.maxTime) {
		/**
		 * Section that validates parameters
		 */
		if (typeof handle !== 'string') {
			throw new Error('[TimeTravel] inNeighbours received non-string as first parameter (handle)');
		}
		if (typeof dateOfInterest !== 'number') {
			throw new Error('[TimeTravel] inNeighbours received non-number as second parameter (dateOfInterest)');
		}
		/**
		 * Begin of actual method
		 */
		if (dateOfInterest >= TimeTravelInfo.maxTime) {
			// In order for the query to always work, we must ensure that dateOfInterest never surpasses expiresAt
			dateOfInterest = TimeTravelInfo.maxTime - 1;
		}
		const result = this.db._query(aqlQuery`
			FOR vertex, edge IN INBOUND ${handle} ${this.collection}
			FILTER edge.createdAt <= ${dateOfInterest} && edge.expiresAt > ${dateOfInterest}
			RETURN vertex
			`).toArray();
		return this.resolveProxies(result);
	}
	
	/**
	 * Returns all outbound vertices of the handle
	 * @param handle The id of the edge
	 * @param dateOfInterest The date of interest
	 * @returns {Array} The vertices
	 */
	outNeighbours(handle, dateOfInterest = TimeTravelInfo.maxTime) {
		/**
		 * Section that validates parameters
		 */
		if (typeof handle !== 'string') {
			throw new Error('[TimeTravel] outNeighbours received non-string as first parameter (handle)');
		}
		if (typeof dateOfInterest !== 'number') {
			throw new Error('[TimeTravel] outNeighbours received non-number as second parameter (dateOfInterest)');
		}
		/**
		 * Begin of actual method
		 */
		if (dateOfInterest >= TimeTravelInfo.maxTime) {
			// In order for the query to always work, we must ensure that dateOfInterest never surpasses expiresAt
			dateOfInterest = TimeTravelInfo.maxTime - 1;
		}
		const result = this.db._query(aqlQuery`
			FOR vertex, edge IN OUTBOUND ${handle} ${this.collection}
			FILTER edge.createdAt <= ${dateOfInterest} && edge.expiresAt > ${dateOfInterest}
			RETURN vertex
			`).toArray();
		return this.resolveProxies(result);
	}
	
	/**
	 * Returns all edges of the handle
	 * @param handle The id of the edges
	 * @param dateOfInterest The date of interest
	 * @returns {Array} The vertices and edges
	 */
	joints(handle, dateOfInterest = TimeTravelInfo.maxTime) {
		/**
		 * Section that validates parameters
		 */
		if (typeof handle !== 'string') {
			throw new Error('[TimeTravel] joints received non-string as first parameter (handle)');
		}
		if (typeof dateOfInterest !== 'number') {
			throw new Error('[TimeTravel] joints received non-number as second parameter (dateOfInterest)');
		}
		/**
		 * Begin of actual method
		 */
		if (dateOfInterest >= TimeTravelInfo.maxTime) {
			// In order for the query to always work, we must ensure that dateOfInterest never surpasses expiresAt
			dateOfInterest = TimeTravelInfo.maxTime - 1;
		}
		const result = this.db._query(aqlQuery`
			FOR vertex, edge IN ANY ${handle} ${this.collection}
			FILTER edge.createdAt <= ${dateOfInterest} && edge.expiresAt > ${dateOfInterest}
			RETURN {'vertex': vertex, 'edge': edge }
			`).toArray();
		return this.resolveProxies(result);
	}
	
	/**
	 * Returns all inbound edges of the handle
	 * @param handle The id of the edge
	 * @param dateOfInterest The date of interest
	 * @returns {Array} The vertices and edges
	 */
	inJoints(handle, dateOfInterest = TimeTravelInfo.maxTime) {
		/**
		 * Section that validates parameters
		 */
		if (typeof handle !== 'string') {
			throw new Error('[TimeTravel] inJoints received non-string as first parameter (handle)');
		}
		if (typeof dateOfInterest !== 'number') {
			throw new Error('[TimeTravel] inJoints received non-number as second parameter (dateOfInterest)');
		}
		/**
		 * Begin of actual method
		 */
		if (dateOfInterest >= TimeTravelInfo.maxTime) {
			// In order for the query to always work, we must ensure that dateOfInterest never surpasses expiresAt
			dateOfInterest = TimeTravelInfo.maxTime - 1;
		}
		const result = this.db._query(aqlQuery`
			FOR vertex, edge IN INBOUND ${handle} ${this.collection}
			FILTER edge.createdAt <= ${dateOfInterest} && edge.expiresAt > ${dateOfInterest}
			RETURN {'vertex': vertex, 'edge': edge }
			`).toArray();
		return this.resolveProxies(result);
	}
	
	/**
	 * Returns all outbound edges of the handle
	 * @param handle The id of the edge
	 * @param dateOfInterest The date of interest
	 * @returns {Array} The vertices and edges
	 */
	outJoints(handle, dateOfInterest = TimeTravelInfo.maxTime) {
		/**
		 * Section that validates parameters
		 */
		if (typeof handle !== 'string') {
			throw new Error('[TimeTravel] outJoints received non-string as first parameter (handle)');
		}
		if (typeof dateOfInterest !== 'number') {
			throw new Error('[TimeTravel] outJoints received non-number as second parameter (dateOfInterest)');
		}
		/**
		 * Begin of actual method
		 */
		if (dateOfInterest >= TimeTravelInfo.maxTime) {
			// In order for the query to always work, we must ensure that dateOfInterest never surpasses expiresAt
			dateOfInterest = TimeTravelInfo.maxTime - 1;
		}
		const result = this.db._query(aqlQuery`
			FOR vertex, edge IN OUTBOUND ${handle} ${this.collection}
			FILTER edge.createdAt <= ${dateOfInterest} && edge.expiresAt > ${dateOfInterest}
			RETURN {'vertex': vertex, 'edge': edge }
			`).toArray();
		return this.resolveProxies(result);
	}
	
	/**
	 * Returns the plain document handle
	 * @param handle The document handle
	 * @return {String|Boolean} The plain document handle or false on failure
	 */
	plainKey(handle) {
		/**
		 * Section that validates parameters
		 */
		if (typeof handle !== 'string') {
			throw new Error('[TimeTravel] plainKey received non-string as first parameter (handle)');
		}
		/**
		 * Begin of actual method
		 */
		// Establish splitPosition variable to use for the index
		let splitPosition = -1;
		// Check if the inboundAppendix is in the handle
		if ((splitPosition = handle.indexOf(this.settings.proxy.inboundAppendix)) !== -1) {
			// And if so, return the plain document handle
			return handle.slice(0, splitPosition);
			// Check if the outboundAppendix is in the handle
		} else if ((splitPosition = handle.indexOf(this.settings.proxy.outboundAppendix)) !== -1) {
			// And if so, return the plain document handle
			return handle.slice(0, splitPosition);
			// If none are in the document handle
		} else {
			// We return false for failure
			return false;
		}
	}
	
	/**
	 * Takes inbound or outbound proxies(full documents, or at least with _id) and transforms them to their real documents
	 * @param {Array} resultSet The inbound or outbound proxy documents
	 * @param {Number} dateOfInterest The date of interest as a timestamp
	 * @returns {Array} The real documents
	 */
	resolveProxies(resultSet, dateOfInterest = TimeTravelInfo.maxTime) {
		/**
		 * Section that validates parameters
		 */
		if (Array.isArray(resultSet)) {
			throw new Error('[TimeTravel] resolveProxies received non-array as first parameter (resultSet)');
		}
		if (typeof dateOfInterest !== 'number') {
			throw new Error('[TimeTravel] resolveProxies received non-number as second parameter (dateOfInterest)');
		}
		/**
		 * Begin of actual method
		 */
		// We establish the resolved documents
		let resolvedDocuments = [];
		// First, we extract the proxies from the result set
		let proxies = {};
		// We iterate over the result set
		resultSet.forEach((proxy) => {
			if (proxy._key.indexOf(this.settings.proxy.inboundAppendix) > -1 ||
				proxy._key.indexOf(this.settings.proxy.outboundAppendix) > -1) {
				// And extract the proxy name and collection
				const [collectionName, proxyKey] = proxy._id.split('/');
				// If we dont have an array for the collection yet, we create it
				if (proxies[collectionName] === undefined) proxies[collectionName] = [];
				// And push the plain key into the respective collection
				proxies[collectionName].push(this.plainKey(proxyKey));
			} else {
				// Not a proxy, so we push it to the resolved documents immediately
				resolvedDocuments.push(proxy);
			}
		});
		if (dateOfInterest >= TimeTravelInfo.maxTime) {
			// In order for the query to always work, we must ensure that dateOfInterest never surpasses expiresAt
			dateOfInterest = TimeTravelInfo.maxTime - 1;
		}
		// Then we iterate over the proxies
		Object.keys(proxies).forEach((collectionName) => {
			const collection = this.db._collection(collectionName);
			// Then we iterate over each plain key for that collection
			proxies[collectionName].forEach((handle) => {
				// And we concatenate the resulting documents into the resolved documents
				resolvedDocuments = resolvedDocuments.concat(
					this.db._query(aqlQuery`
					FOR v IN ${collection}
					FILTER v.id==${handle} && v.createdAt <= ${dateOfInterest} && v.expiresAt > ${dateOfInterest}
					RETURN v`).toArray()
				);
			});
		});
		// And finally, we return the resolved documents
		return resolvedDocuments;
	}
	
	/**
	 * Returns the latest condition for use in AQL filters
	 * @returns {string} The latest condition
	 */
	latest() {
		return latest.toAQL();
	}
	
	/**
	 * Returns the arango collection so you can use it in AQL
	 * @returns {String} Returns the arangoDB collection
	 */
	toString() {
		return this.name;
	}
	
	/**
	 * Returns the arango collection so you can use it in AQL
	 * @returns {String} Returns the arangoDB collection
	 */
	toAQL() {
		return this.collection.toString();
	}
}

module.exports = TimeTravelEdgeCollection;