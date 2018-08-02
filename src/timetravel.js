/*
 * ===========================
 * timetravel.js 02.08.18 15:53
 * Kevin 'Extremo' Sekin
 * Copyright (c) 2018.
 * ===========================
 */

import {TimeTravelCollection} from 'timetravelcollection';
import {TimeTravelEdgeCollection} from 'timetraveledgecollection';

class TimeTravel {
	constructor(db, settings) {
		this.db = db;
		this.settings = settings;
	}
	createDocumentCollection (name) {
		const collectionName = name+this.settings.timeTravelPresentAppendix;
		const outdatedCollectionName = name+this.settings.timeTravelPastAppendix;
		const edgeCollectionName = name+this.settings.timeTravelPresentAppendix+this.settings.edgeAppendix;
		const outdatedEdgeCollectionName = name+this.settings.timeTravelPastAppendix+this.settings.edgeAppendix;
		
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
	createEdgeCollection(name) {
		const edgeCollectionName = name+this.settings.timeTravelPresentAppendix();
		const outdatedEdgeCollectionName = name+this.settings.timeTravelPastAppendix();
		if (this.db._collection(edgeCollectionName) ||
			this.db._collection(outdatedEdgeCollectionName)) {
			throw new Error('[TimeTravel] The edge collection already exists');
		} else {
			this.db._createEdgeCollection(edgeCollectionName);
			this.db._createEdgeCollection(outdatedEdgeCollectionName);
			return new TimeTravelEdgeCollection(this.db, edgeCollectionName, this.settings);
		}
	}
	documentCollection(name) {
		return new TimeTravelCollection(this.db, name+this.settings.timeTravelPresentAppendix, this.settings);
	}
	edgeCollection(name) {
		return new TimeTravelEdgeCollection(this.db, name+this.settings.timeTravelPresentAppendix, this.settings);
	}
}

module.exports.TimeTravel = TimeTravel;