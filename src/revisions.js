/*
 * ===========================
 * revisions.js 13.07.18 05:00
 * Kevin 'Extremo' Sekin
 * Copyright (c) 2018.
 * ===========================
 */

const db = require('@arangodb').db;

module.exports = revision => {
	return {
		revisionCollectionName: (name) => {
			return module.context.collectionName(name);
		},
		revisionCollectionHistoryName: (name) => {
			return module.context.collectionName(name + '__internal__history');
		},
		revisionCollectionEdgeName: (name) => {
			return module.context.collectionName(name + '__internal__history__edges');
		},
		create: (name) => {
			const collectionName = this.revisionCollectionName(name);
			const collectionHistoryName = this.revisionCollectionHistoryName(name);
			const collectionEdgeName = this.revisionCollectionEdgeName(name);
			
			if (db._collection(collectionName) ||
				db._collection(collectionHistoryName) ||
				db._collection(collectionEdgeName)) {
				throw new Error('The revision already exists');
			} else {
				db._createDocumentCollection(collectionHistoryName);
				db._createEdgeCollection(collectionEdgeName);
				return db._createDocumentCollection(collectionName);
			}
		},
		revisionCollection: (name) => {
			let collection = db.collection(this.revisionCollectionName(name));
			let revisionCollection = {
				all: () => {
					return this.collection.all();
				},
				byExample: (example) => {
					return this.collection.byExample(example);
				},
				firstExample: (example) => {
					return this.collection.firstExample(example);
				},
				range: (attribute, left, right) => {
					return this.collection.range(attribute, left, right);
				},
				closedRange: (attribute, left, right) => {
					return this.collection.closedRange(attribute, left, right);
				},
				any: () => {
					return this.collection.any();
				},
				count: () => {
					return this.collection.count();
				},
				toArray: () => {
					return this.collection.toArray();
				},
				document: (handle) => {
					return this.collection.document(handle);
				},
				documents: (handles) => {
					return this.collection.documents(handles);
				},
				type: () => {
					return this.collection.type();
				},
				iterate: (iterator, options) => {
					return this.collection.iterate(iterator, options);
				},
				exists: (handle) => {
					return this.collection.exists(handle);
				},
				insert: (object, options = {}) => {
				
				},
				replace: (handle, object, options = {}) => {
				
				},
				update: (handle, object, options = {}) => {
				
				},
				remove: (handle, options) => {
				
				},
				removeByKeys: (handles) => {
				
				},
				removeByExample: (example) => {
				
				},
				replaceByExample: (example, object) => {
				
				},
				updateByExample: (example, object) => {
				
				},
				revisions: (handle) => {
				
				},
				previous: (handle, revision) => {
				
				},
				next: (handle, revision) => {
				
				},
				revisionByDate: (dateOfInterest) => {
				
				},
				revisionByDateRange: (dateRangeMin, dateRangeMax) => {
				
				}
			};
			return Object.assign(revisionCollection, {collection: collection});
		},
		revisionEdgeCollection: (name) => {
			let edgeCollection = db.collection(this.revisionCollectionName(name));
			let edgeRevisionCollection = {
				edges: (handle) => {
					return this.collection.edges(handle);
				},
				inEdges: (handle) => {
					return this.collection.inEdges(handle);
				},
				outEdges: (handle) => {
					return this.collection.outEdges(handle);
				}
			};
			// Slight hack by replacing collection with the edge collection I can still use the document collection functions...
			return Object.assign(this.revisionCollection(name), {edgeRevisionCollection, collection: edgeCollection});
		}
	}
}