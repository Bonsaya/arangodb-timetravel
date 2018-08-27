/*
 * ===========================
 * timetravel.js 02.08.18 17:36
 * Kevin 'Extremo' Sekin
 * Copyright (c) 2018
 * ===========================
 */

const TimeTravelCollection = require('./timetravelcollection');
const TimeTravelEdgeCollection = require('./timetraveledgecollection');

const Version = "v1.0.0";
const SettingsCollection = "__timetravel_settings__";

class TimeTravel {
	
	/**
	 * Establishes the TimeTravel Framework
	 * @param {ArangoDatabase} db The arangoDB DB
	 * @param {Object} settings The settings related to the framework
	 */
	constructor(db, settings) {
		this.db = db;
		this.initializeSettings(settings);
		this.settings = settings;
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
	 * Returns the current version of the timetravel framework
	 * @returns {string} The current version string
	 */
	static get version() {
		return Version;
	}
	
	/**
	 * Returns the settings collection of the timetravel framework
	 * @returns {ArangoCollection} The arango timetravel settings collection
	 */
	settingsCollection() {
		return this.db._collection(SettingsCollection);
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
		if (typeof this.settings.timeTravelPresentAppendix !== 'string') {
			throw new Error('[TimeTravel] Please provide a timeTravelPresentAppendix in settings.');
		}
		if (typeof this.settings.timeTravelPastAppendix !== 'string') {
			throw new Error('[TimeTravel] Please provide a timeTravelPastAppendix in settings.');
		}
		if (typeof this.settings.timeTravelEdgeAppendix !== 'string') {
			throw new Error('[TimeTravel] Please provide a timeTravelEdgeAppendix in settings.');
		}
		if (typeof this.settings.proxy.outboundAppendix !== 'string') {
			throw new Error('[TimeTravel] Please provide a proxy.outboundAppendix in settings.');
		}
		if (typeof this.settings.proxy.inboundAppendix !== 'string') {
			throw new Error('[TimeTravel] Please provide a proxy.inboundAppendix in settings.');
		}
		/**
		 * Begin of actual method
		 */
		if (!this.settingsCollection()) {
			let settingsCol = this.db._createDocumentCollection(SettingsCollection);
			settingsCol.insert({
				_key: "__settings__",
				name: "TimeTravel Framework Settings",
				version: Version,
				settings: {
					presentAppendix: this.settings.timeTravelPresentAppendix,
					pastAppendix: this.settings.timeTravelPastAppendix,
					edgeAppendix: this.settings.timeTravelEdgeAppendix,
					proxy: {
						outboundAppendix: this.settings.proxy.outboundAppendix,
						inboundAppendix: this.settings.proxy.inboundAppendix
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
			let settingsObj = this.settingsCollection().document('__settings__');
			if (settingsObj.presentAppendix !== settings.timeTravelPresentAppendix) {
				throw new Error(`{TimeTravel] presentAppendix settings do not match. You provided ${settings.timeTravelPresentAppendix} but previously established timetravel with ${settingsObj.presentAppendix}`);
			}
			if (settingsObj.pastAppendix !== settings.timeTravelPastAppendix) {
				throw new Error(`{TimeTravel] pastAppendix settings do not match. You provided ${settings.timeTravelPastAppendix} but previously established timetravel with ${settingsObj.pastAppendix}`);
			}
			if (settingsObj.edgeAppendix !== settings.timeTravelEdgeAppendix) {
				throw new Error(`{TimeTravel] edgeAppendix settings do not match. You provided ${settings.timeTravelEdgeAppendix} but previously established timetravel with ${settingsObj.edgeAppendix}`);
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
		const collectionName = this.prefixedCollectionName(name + this.settings.timeTravelPresentAppendix);
		const outdatedCollectionName = this.prefixedCollectionName(name + this.settings.timeTravelPastAppendix);
		const edgeCollectionName = this.prefixedCollectionName(name + this.settings.timeTravelPresentAppendix
			+ this.settings.edgeAppendix);
		const outdatedEdgeCollectionName = this.prefixedCollectionName(name + this.settings.timeTravelPastAppendix
			+ this.settings.edgeAppendix);
		// Ensure they do not exist so that we don't run into any conflicts!
		if (this.db._collection(collectionName) ||
			this.db._collection(edgeCollectionName) ||
			this.db._collection(outdatedCollectionName) ||
			this.db._collection(outdatedEdgeCollectionName)) {
			throw new Error('[TimeTravel] The document collection already exists');
		} else {
			// Verify that the timetravel settings collection already exists
			let frameworkSettings = this.settingsCollection();
			// Insert the new collections as timetravel collections inside the settings
			let frameworkCollections = frameworkSettings.document('__collections__');
			frameworkCollections.collections.document.push(name)
			frameworkSettings.update('__collections__', frameworkCollections, {mergeObjects: false});
			// Create the collections necessary for the timetravel
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
		const edgeCollectionName = this.prefixedCollectionName(name + this.settings.timeTravelPresentAppendix);
		const outdatedEdgeCollectionName = this.prefixedCollectionName(name + this.settings.timeTravelPastAppendix);
		if (this.db._collection(edgeCollectionName) ||
			this.db._collection(outdatedEdgeCollectionName)) {
			throw new Error('[TimeTravel] The edge collection already exists');
		} else {
			// Verify that the timetravel settings collection already exists
			let frameworkSettings = this.settingsCollection();
			// Insert the new collections as timetravel collections inside the settings
			let frameworkCollections = frameworkSettings.document('__collections__');
			frameworkCollections.collections.edge.push(name)
			frameworkSettings.update('__collections__', frameworkCollections, {mergeObjects: false});
			this.db._createEdgeCollection(edgeCollectionName);
			this.db._createEdgeCollection(outdatedEdgeCollectionName);
			return new TimeTravelEdgeCollection(this.db, edgeCollectionName, this.settings);
		}
	}
	
	/**
	 * Opens a timetravel collection
	 * @param name The name of the collection
	 * @returns {TimeTravelCollection|TimeTravelEdgeCollection|Boolean} The timetravel collection
	 */
	collection(name) {
		// Verify that the timetravel settings collection already exists
		let frameworkSettings = this.settingsCollection();
		// Fetch the existing collections in the timetravel framework
		let frameworkCollections = frameworkSettings.document('__collections__');
		// Determine whether the attempted collection is a timetravel collection
		if (frameworkCollections.collections.document.includes(name)) {
			return new TimeTravelCollection(this.db, this.prefixedCollectionName(name
				+ this.settings.timeTravelPresentAppendix), this.settings);
		} else if (frameworkCollections.collections.edge.includes(name)) {
			return new TimeTravelEdgeCollection(this.db, this.prefixedCollectionName(name
				+ this.settings.timeTravelPresentAppendix), this.settings);
		} else {
			// TODO: Determine whether returning false rather than that it is not a timetravel collection is better?
			// throw new Error(`[TimeTravel] The collection ${name} you attempted to open is not a timetravel collection.`);
			return false;
		}
	}
}

module.exports = TimeTravel;