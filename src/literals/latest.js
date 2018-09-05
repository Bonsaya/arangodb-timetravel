/*
 * ===========================
 * latest.js 05.09.18 01:42
 * Kevin 'Extremo' Sekin
 * Copyright (c) 2018
 * ===========================
 */

const TimeTravelLiteral = require('./literal');
const TimeTravel = require('../timetravel');

module.exports = new TimeTravelLiteral('expiresAt == ' + String(TimeTravel.maxTime));