/*
 * ===========================
 * timetravelinfo.js 05.09.18 06:39
 * Kevin 'Extremo' Sekin
 * Copyright (c) 2018
 * ===========================
 */

const Version = "v1.0.0";
const SettingsCollection = "timetravel_settings__internal";
const MaxTime = 8640000000000000;

class TimeTravelInfo {
	/**
	 * Returns the current version of the timetravel framework
	 * @returns {string} The current version string
	 */
	static get version() {
		return Version;
	}
	
	/**
	 * Returns the settings collection name
	 * @returns {string} The settings collection name
	 */
	static get settingsCollectionName() {
		return SettingsCollection;
	}
	
	/**
	 * Returns the maximum time that is possible as timestamp
	 * @returns {number} The max timestamp
	 */
	static get maxTime() {
		return MaxTime;
	}
}

module.exports = TimeTravelInfo;