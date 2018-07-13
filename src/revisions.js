/*
 * ===========================
 * revisions.js 13.07.18 05:00
 * Kevin 'Extremo' Sekin
 * Copyright (c) 2018.
 * ===========================
 */

module.exports = function(db) {
	return new function() {
		this.db = db;
		this.revisionCollectionName = (name) => {
			return module.context.collectionName(name);
		};
		this.revisionCollectionHistoryName = (name) => {
			return module.context.collectionName(name + '__internal__history');
		};
		this.revisionCollectionEdgeName = (name) => {
			return module.context.collectionName(name + '__internal__history__edges');
		};
		this.create = (name) => {
			const collectionName = this.revisionCollectionName(name);
			const collectionHistoryName = this.revisionCollectionHistoryName(name);
			const collectionEdgeName = this.revisionCollectionEdgeName(name);
			
			if (this.db._collection(collectionName) ||
				this.db._collection(collectionHistoryName) ||
				this.db._collection(collectionEdgeName)) {
				throw new Error('The revision already exists');
			} else {
				this.db._createDocumentCollection(collectionHistoryName);
				this.db._createEdgeCollection(collectionEdgeName);
				return this.db._createDocumentCollection(collectionName);
			}
			return true;
		};
		this.revisionCollection = (name) => {
			let collection = this.db.collection(this.revisionCollectionName(name));
			let revisionCollection = new function() {
				this.all = () => {
					return this.collection.all();
				};
				this.byExample = (example) => {
					return this.collection.byExample(example);
				};
				this.firstExample = (example) => {
					return this.collection.firstExample(example);
				};
				this.range = (attribute, left, right) => {
					return this.collection.range(attribute, left, right);
				};
				this.closedRange = (attribute, left, right) => {
					return this.collection.closedRange(attribute, left, right);
				};
				this.any = () => {
					return this.collection.any();
				};
				this.count = () => {
					return this.collection.count();
				};
				this.toArray = () => {
					return this.collection.toArray();
				};
				this.document = (handle) => {
					return this.collection.document(handle);
				};
				this.documents = (handles) => {
					return this.collection.documents(handles);
				};
				this.type = () => {
					return this.collection.type();
				};
				this.iterate = (iterator, options) => {
					return this.collection.iterate(iterator, options);
				};
				this.exists = (handle) => {
					return this.collection.exists(handle);
				};
				this.insert = (object, options = {}) => {
				
				};
				this.replace = (handle, object, options = {}) => {
				
				};
				this.update = (handle, object, options = {}) => {
				
				};
				this.remove = (handle, options) => {
				
				};
				this.removeByKeys = (handles) => {
				
				};
				this.removeByExample = (example) => {
				
				};
				this.replaceByExample = (example, object) => {
				
				};
				this.updateByExample = (example, object) => {
				
				};
				this.revisions = (handle) => {
				
				};
				this.previous = (handle, revision) => {
				
				};
				this.next = (handle, revision) => {
				
				};
				this.revisionByDate = (dateOfInterest) => {
				
				};
				this.revisionByDateRange = (dateRangeMin, dateRangeMax) => {
				
				}
			};
			return Object.assign(revisionCollection, {collection: collection});
		};
		this.revisionEdgeCollection = (name) => {
			let edgeCollection = this.db.collection(this.revisionCollectionName(name));
			let edgeRevisionCollection = new function() {
				this.edges = (handle) => {
					return this.collection.edges(handle);
				};
				this.inEdges = (handle) => {
					return this.collection.inEdges(handle);
				};
				this.outEdges = (handle) => {
					return this.collection.outEdges(handle);
				}
			};
			// Slight hack by replacing collection with the edge collection I can still use the document collection functions...
			return Object.assign(this.revisionCollection(name), {edgeRevisionCollection, collection: edgeCollection});
		}
	}
}