/*
 * ===========================
 * timetravelcollection.js 14.07.18 14:13
 * Kevin 'Extremo' Sekin
 * Copyright (c) 2018.
 * ===========================
 */

import {GenericCollection} from 'genericcollection';

class TimeTravelCollection extends GenericCollection{
	
	constructor(db, name, settings) {
		super(db, name, settings);
	}
	insert(object, options = {}) {
		if(typeof object._key === 'string') {
			object.id = object._key;
			delete object._key;
		}
		if(typeof object.id !== 'string') {
			throw new Error('[TimeTravel] Attempted to insert document without id or _key value');
		}
		this.db._executeTransaction({
			collections: {
				write: [this.name, this.name+this.settings.edgeAppendix]
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
					documentCollection.update(documentAndEdge['document'].key, { expiresAt: dateNow });
					edgeCollection.update(documentAndEdge['edge'].key, { expiresAt: dateNow });
				});
				// Insert new document
				let newDocument = documentCollection.insert(Object.assign(object, {createdAt: dateNow, expiresAt: 8640000000000000}));
				// Check if there were previous documents and edges
				if(oldDocumentsAndEdges.size) {
					// We have previous documents and edges, meaning the inbound proxy already exists
					// And the insert command was used by accident instead of the update command!
					// So we simply insert the new edge!
					edgeCollection.insert(inboundProxyKey, newDocument._id, {createdAt: dateNow, expiresAt: 8640000000000000});
				} else {
					// There are no previous documents or edges, so we need to create the inbound and outbound proxies!
					let inboundProxy = documentCollection.insert({_key: inboundProxyKey, createdAt: dateNow, expiresAt: 8640000000000000});
					let outboundProxy = documentCollection.insert({_key: outboundProxyKey, createdAt: dateNow, expiresAt: 8640000000000000});
					// And now we need to tie them together with the first document
					// By inserting the edges from the inbound proxy to the document and from the document to the outbound proxy
					edgeCollection.insert(inboundProxy._key, newDocument._id, {createdAt: dateNow, expiresAt: 8640000000000000});
					edgeCollection.insert(newDocument._id, outboundProxy._id, {createdAt: dateNow, expiresAt: 8640000000000000});
				}
			},
			params: {
				doc: name,
				edge: name+this.settings.edgeAppendix,
				object: object
			}
		});
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
}

module.exports.TimeTravelCollection = TimeTravelCollection;