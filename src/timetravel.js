/*
 * ===========================
 * timetravel.js 14.07.18 14:02
 * Kevin 'Extremo' Sekin
 * Copyright (c) 2018.
 * ===========================
 */

import {TimeTravelCollection} from 'timetravelcollection';
import {TimeTravelEdgeCollection} from 'timetraveledgecollection';

function internalTimeTravelPresentName () {
	return '__timetravel__present';
}

function internalTimeTravelPastName () {
	return '__timetravel__past';
}

class TimeTravel {
	constructor(db, settings) {
		this.db = db;
		this.settings = settings;
	}
	createDocumentCollection (name) {
		const collectionName = name+internalTimeTravelPresentName();
		const outdatedCollectionName = name+internalTimeTravelPastName();
		const edgeCollectionName = name+internalTimeTravelPresentName()+'__relations';
		const outdatedEdgeCollectionName = name+internalTimeTravelPastName()+'__relations';
		
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
			return new TimeTravelCollection(this.db, name);
		}
	}
	createEdgeCollection(name) {
		const edgeCollectionName = name+internalTimeTravelPresentName();
		const outdatedEdgeCollectionName = name+internalTimeTravelPastName();
		if (this.db._collection(edgeCollectionName) ||
			this.db._collection(outdatedEdgeCollectionName)) {
			throw new Error('[TimeTravel] The edge collection already exists');
		} else {
			this.db._createEdgeCollection(edgeCollectionName);
			this.db._createEdgeCollection(outdatedEdgeCollectionName);
			return new TimeTravelEdgeCollection(this.db, name);
		}
	}
	documentCollection(name) {
		return new TimeTravelCollection(name);
	}
	edgeCollection(name) {
		return new TimeTravelEdgeCollection(name);
	}
}

module.exports.TimeTravel = TimeTravel;