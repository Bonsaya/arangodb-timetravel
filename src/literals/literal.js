/*
 * ===========================
 * literal.js 05.09.18 01:42
 * Kevin 'Extremo' Sekin
 * Copyright (c) 2018
 * ===========================
 */

class TimeTravelLiteral {
	
	/**
	 * Creates a timetravel literal for use in aqlQuery/timetravelQuery
	 * @param {String} value The value the literal corresponds to
	 */
	constructor(value) {
		/**
		 * Section validating parameters
		 */
		if (typeof value
			!== 'string') {
			throw new Error('[TimeTravel] Attempted to create a literal without string value');
		}
		/**
		 * Begin of actual constructor
		 */
		this.value = value;
	}
	
	/**
	 * Returns the literal in string form
	 * @returns {String} The literal in string form
	 */
	toAQL() {
		return this.value;
	}
}


module.exports = TimeTravelLiteral;