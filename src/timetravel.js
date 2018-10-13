/*
 * ===========================
 * timetravel.js 02.08.18 17:36
 * Kevin 'Extremo' Sekin
 * Copyright (c) 2018
 * ===========================
 */

const TimeTravelInfo = require('./timetravelinfo');
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
		this.collectionInfo = this.initializeSettings(settings).document('__collections__');
		this.settings = settings;
		// Let us always migrate to the newest version if need be
		this.migrate();
	}
	
	/**
	 * Prefixes the name for the current service
	 * @param name The name to prefix
	 * @returns {String} Returns the prefixed name
	 */
	prefixedCollectionName(name) {
		return module.context.collectionName(name);
	}
	
	/**
	 * Returns the settings collection of the timetravel framework
	 * @returns {ArangoCollection} The arango timetravel settings collection
	 */
	settingsCollection() {
		return this.db._collection(TimeTravelInfo.settingsCollectionName);
	}
	
	/**
	 * Returns the maxTime
	 * @returns {number} The maxTime
	 */
	maxTime() {
		return TimeTravelInfo.maxTime;
	}

    /**
	 * Migrates to the latest timeTravel version
     */
    migrate() {
		const settings = this.settingsCollection().document('__settings__');
		if (settings.version === 'v1.0.0') {
			this.migrate_v1_0_0_to_v1_1_0();
		}
	}

    /**
	 * Migrates version 1.0.0 to 1.1.0
     */
    migrate_v1_0_0_to_v1_1_0() {
		this.collectionInfo.collections.document.forEach((documentCollection) => {
			const upgradeQuery = `
				LET proxies = (FOR doc IN ${documentCollection} FILTER doc._key LIKE '%${this.settings.proxy.inboundAppendix}%' OR doc._key LIKE '%${this.settings.proxy.outboundAppendix}%' RETURN doc)
				FOR proxy in proxies
					UPDATE proxy WITH {
						timeTravelProxy: true
					} IN ${documentCollection}
			`;
			db._query(upgradeQuery);
		});
		this.settingsCollection().update('__settings__', {version: 'v1.1.0'});
	}
	
	/**
	 * Initializes the settings collection of the timetravel framework
	 * @param {Object} settings The settings of the timetravel framework
	 * @returns {ArangoCollection} The arango timetravel settings collection
	 */
	initializeSettings(settings) {
		/**
		 * Section that validates parameters
		 */
		if (typeof settings.presentAppendix !== 'string') {
			throw new Error('[TimeTravel] Please provide a presentAppendix in settings.');
		}
		if (typeof settings.pastAppendix !== 'string') {
			throw new Error('[TimeTravel] Please provide a pastAppendix in settings.');
		}
		if (typeof settings.edgeAppendix !== 'string') {
			throw new Error('[TimeTravel] Please provide a edgeAppendix in settings.');
		}
		if (typeof settings.proxy.outboundAppendix !== 'string') {
			throw new Error('[TimeTravel] Please provide a proxy.outboundAppendix in settings.');
		}
		if (typeof settings.proxy.inboundAppendix !== 'string') {
			throw new Error('[TimeTravel] Please provide a proxy.inboundAppendix in settings.');
		}
		/**
		 * Begin of actual method
		 */
		let timeTravelSettings = false;
		if (!(timeTravelSettings = this.settingsCollection())) {
			let settingsCol = this.db._createDocumentCollection(TimeTravelInfo.settingsCollectionName);
			settingsCol.insert({
				_key: "__settings__",
				name: "TimeTravel Framework Settings",
				version: TimeTravelInfo.version,
				settings: {
					presentAppendix: settings.presentAppendix,
					pastAppendix: settings.pastAppendix,
					edgeAppendix: settings.edgeAppendix,
					proxy: {
						outboundAppendix: settings.proxy.outboundAppendix,
						inboundAppendix: settings.proxy.inboundAppendix
					}
				}
			});
			settingsCol.insert({
				_key: "__collections__",
				name: "TimeTravel Framework Collections",
				collections: {
					document: [],
					edge: []
				}
			});
			return settingsCol;
		} else {
			
			let settingsObj = timeTravelSettings.document('__settings__').settings;
			if (settingsObj.presentAppendix !== settings.presentAppendix) {
				throw new Error(`{TimeTravel] presentAppendix settings do not match. You provided ${settings.presentAppendix} but previously established timetravel with ${settingsObj.presentAppendix}`);
			}
			if (settingsObj.pastAppendix !== settings.pastAppendix) {
				throw new Error(`{TimeTravel] pastAppendix settings do not match. You provided ${settings.pastAppendix} but previously established timetravel with ${settingsObj.pastAppendix}`);
			}
			if (settingsObj.edgeAppendix !== settings.edgeAppendix) {
				throw new Error(`{TimeTravel] edgeAppendix settings do not match. You provided ${settings.edgeAppendix} but previously established timetravel with ${settingsObj.edgeAppendix}`);
			}
			if (settingsObj.proxy.outboundAppendix !== settings.proxy.outboundAppendix) {
				throw new Error(`{TimeTravel] proxy.outboundAppendix settings do not match. You provided ${settings.proxy.outboundAppendix} but previously established timetravel with ${settingsObj.proxy.outboundAppendix}`);
			}
			if (settingsObj.proxy.inboundAppendix !== settings.proxy.inboundAppendix) {
				throw new Error(`{TimeTravel] proxy.inboundAppendix settings do not match. You provided ${settings.proxy.inboundAppendix} but previously established timetravel with ${settingsObj.proxy.inboundAppendix}`);
			}
			return this.settingsCollection();
		}
	}
	
	/**
	 * Creates a timetravel document collection
	 * @param name The name of the collection
	 * @returns {TimeTravelCollection} The timetravel document collection
	 */
	createDocumentCollection(name) {
		// Establish all the names of the document and edge collections necessary
		const collectionName = this.prefixedCollectionName(name + this.settings.presentAppendix);
		const outdatedCollectionName = this.prefixedCollectionName(name + this.settings.pastAppendix);
		const edgeCollectionName = this.prefixedCollectionName(name + this.settings.presentAppendix
			+ this.settings.edgeAppendix);
		const outdatedEdgeCollectionName = this.prefixedCollectionName(name + this.settings.pastAppendix
			+ this.settings.edgeAppendix);
		// Ensure they do not exist so that we don't run into any conflicts!
		if (this.db._collection(collectionName) ||
			this.db._collection(edgeCollectionName) ||
			this.db._collection(outdatedCollectionName) ||
			this.db._collection(outdatedEdgeCollectionName)) {
			throw new Error('[TimeTravel] The document collection already exists');
		} else {
			// Insert the new collections as timetravel collections inside the settings
			this.collectionInfo.collections.document.push(name);
			this.settingsCollection().update('__collections__', this.collectionInfo, {mergeObjects: false});
			// Create the collections necessary for the timetravel
			let collectionPresent = this.db._createDocumentCollection(collectionName);
			let edgeCollectionPresent = this.db._createEdgeCollection(edgeCollectionName);
			let collectionPast = this.db._createDocumentCollection(outdatedCollectionName);
			let edgeCollectionPast = this.db._createEdgeCollection(outdatedEdgeCollectionName);
			// Add the skiplists
			collectionPresent.ensureIndex({type: "skiplist", fields: ['id', 'expiresAt', 'createdAt'], unique: false});
			edgeCollectionPresent.ensureIndex({
				type: "skiplist",
				fields: ['id', 'expiresAt', 'createdAt'],
				unique: false
			});
			collectionPast.ensureIndex({type: "skiplist", fields: ['id', 'expiresAt', 'createdAt'], unique: false});
			edgeCollectionPast.ensureIndex({type: "skiplist", fields: ['id', 'expiresAt', 'createdAt'], unique: false});
			return new TimeTravelCollection(this.db, collectionName, this.settings);
		}
	}
	
	/**
	 * Creates a timetravel edge collection
	 * @param name The name of the edge collection
	 * @returns {TimeTravelEdgeCollection} The timetravel edge collection
	 */
	createEdgeCollection(name) {
		const edgeCollectionName = this.prefixedCollectionName(name + this.settings.presentAppendix);
		const outdatedEdgeCollectionName = this.prefixedCollectionName(name + this.settings.pastAppendix);
		if (this.db._collection(edgeCollectionName) ||
			this.db._collection(outdatedEdgeCollectionName)) {
			throw new Error('[TimeTravel] The edge collection already exists');
		} else {
			// Insert the new collections as timetravel collections inside the settings
			this.collectionInfo.collections.edge.push(name);
			this.settingsCollection().update('__collections__', this.collectionInfo, {mergeObjects: false});
			// Create the edge collections
			let edgeCollectionPresent = this.db._createEdgeCollection(edgeCollectionName);
			let edgeCollectionPast = this.db._createEdgeCollection(outdatedEdgeCollectionName);
			// Create the skiplists
			edgeCollectionPresent.ensureIndex({
				type: "skiplist",
				fields: ['id', 'expiresAt', 'createdAt'],
				unique: false
			});
			edgeCollectionPast.ensureIndex({type: "skiplist", fields: ['id', 'expiresAt', 'createdAt'], unique: false});
			return new TimeTravelEdgeCollection(this.db, edgeCollectionName, this.settings);
		}
	}
	
	/**
	 * Opens a timetravel collection
	 * @param name The name of the collection
	 * @returns {TimeTravelCollection|TimeTravelEdgeCollection|Boolean} The timetravel collection
	 */
	collection(name) {
		// Determine whether the attempted collection is a timetravel collection
		if (this.collectionInfo.collections.document.includes(name)) {
			return new TimeTravelCollection(this.db, this.prefixedCollectionName(name
				+ this.settings.presentAppendix), this.settings);
		} else if (this.collectionInfo.collections.edge.includes(name)) {
			return new TimeTravelEdgeCollection(this.db, this.prefixedCollectionName(name
				+ this.settings.presentAppendix), this.settings);
		} else {
			// TODO: Determine whether returning false rather than that it is not a timetravel collection is better?
			// throw new Error(`[TimeTravel] The collection ${name} you attempted to open is not a timetravel collection.`);
			return false;
		}
	}
}

module.exports = TimeTravel;