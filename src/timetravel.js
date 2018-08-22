/*
 * ===========================
 * timetravel.js 02.08.18 17:36
 * Kevin 'Extremo' Sekin
 * Copyright (c) 2018
 * ===========================
 */

const TimeTravelCollection = require('./timetravelcollection');
const TimeTravelEdgeCollection = require('./timetraveledgecollection');

class TimeTravel {
	
	/**
	 * Establishes the TimeTravel Framework
	 * @param {ArangoDatabase} db The arangoDB DB
	 * @param {Object} settings The settings related to the framework
	 */
	constructor(db, settings) {
		this.db = db;
		this.settings = settings;
	}
	
	/**
	 * Creates a timetravel document collection
	 * @param name The name of the collection
	 * @returns {TimeTravelCollection} The timetravel document collection
	 */
	createDocumentCollection (name) {
		const collectionName = module.context.collectionName(name+this.settings.timeTravelPresentAppendix);
		const outdatedCollectionName = module.context.collectionName(name+this.settings.timeTravelPastAppendix);
		const edgeCollectionName = module.context.collectionName(name+this.settings.timeTravelPresentAppendix+this.settings.edgeAppendix);
		const outdatedEdgeCollectionName = module.context.collectionName(name+this.settings.timeTravelPastAppendix+this.settings.edgeAppendix);
		
		if (this.db._collection(collectionName) ||
			this.db._collection(edgeCollectionName) ||
			this.db._collection(outdatedCollectionName) ||
			this.db._collection(outdatedEdgeCollectionName)) {
			throw new Error('[TimeTravel] The document collection already exists');
		} else {
			this.db._createDocumentCollection(collectionName);
			this.db._createEdgeCollection(edgeCollectionName);
			this.db._createDocumentCollection(outdatedCollectionName);
			this.db._createEdgeCollection(outdatedEdgeCollectionName);
			return new TimeTravelCollection(this.db, collectionName, this.settings);
		}
	}
	
	/**
	 * Creates a timetravel edge collection
	 * @param name The name of the edge collection
	 * @returns {TimeTravelEdgeCollection} The timetravel edge collection
	 */
	createEdgeCollection(name) {
		const edgeCollectionName = module.context.collectionName(name+this.settings.timeTravelPresentAppendix);
		const outdatedEdgeCollectionName = module.context.collectionName(name+this.settings.timeTravelPastAppendix);
		if (this.db._collection(edgeCollectionName) ||
			this.db._collection(outdatedEdgeCollectionName)) {
			throw new Error('[TimeTravel] The edge collection already exists');
		} else {
			this.db._createEdgeCollection(edgeCollectionName);
			this.db._createEdgeCollection(outdatedEdgeCollectionName);
			return new TimeTravelEdgeCollection(this.db, edgeCollectionName, this.settings);
		}
	}
	
	/**
	 * Opens a timetravel document collection
	 * @param name The name of the document collection
	 * @returns {TimeTravelCollection} The timetravel document collection
	 */
	documentCollection(name) {
		return new TimeTravelCollection(this.db, module.context.collectionName(name+this.settings.timeTravelPresentAppendix), this.settings);
	}
	
	/**
	 * Opens a timetravel edge collection
	 * @param name The name of the edge collection
	 * @returns {TimeTravelEdgeCollection} The timetravel edge collection
	 */
	edgeCollection(name) {
		return new TimeTravelEdgeCollection(this.db, module.context.collectionName(name+this.settings.timeTravelPresentAppendix), this.settings);
	}
}

module.exports = TimeTravel;