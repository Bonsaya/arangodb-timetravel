/*
 * ===========================
 * timetravelquery.js 31.08.18 04:19
 * Kevin 'Extremo' Sekin
 * Copyright (c) 2018
 * ===========================
 */

module.exports = timeTravelQuery = (strings, ...args) => {
	// If Document collection then check
	/**
	 * Is Filter used? And if so
	 * - Check if they filter after _key or _id
	 * Is Filter not used? And if so
	 * - Wrap in a subquery to make sure only documents not proxies are considered
	 */
	// If Edge collection then check
	/**
	 * Is it a Graph Query? And if so
	 * - Transform the key appropriately to reflect inbound Proxies(if timetravel collection)
	 * - Wrap it in a subquery and transform the result into the real documents (make sure to consider createdAt and expiresAt!!)
	 * Is it not a Graph Query but Filter is used? And if so
	 * - Check if they filter after _key or _id
	 */
	
	// How to make it happen:
	
	// Replace all _key or _id with id and if _id trim off collection name
	
	// Provide timetravel literals like "latest" for Filter conditions
	
	// Turn all timetravelKeys into appropriate ones
	
	// Turn all timetravel collections into arango collections
	
	// If timetravel collection is document collection, exclude proxies?
	
	// If result includes inbound or outbound proxy documents, transform to real document (do this in the query function?)
	
	for (let i = 0; i < args.length; i++) {
	
	}
	
	
	`
	FOR vertex, edge IN key edgeCollection
	FILTER vertex._key == blah
	RETURN { 'd': vertex, 'e': edge }
	
	`
	
	/**
	 * Another possibility might be to build a query function for timetraveldocument and timetraveledge collections and to go like this:
	 *
	 * LET query = documentCollection.query(query for document);
	 * LET queryEdge = edgeCollection.query(query for edge);
	 *
	 * LET finalQuery = `LET documents = ${query} LET edges = ${queryEdge}
	 *                      FOR v,e IN [...documents, ...edges]
	 *
	 * You get the idea. Still not the ideal solution but should allow greater query complexity while keeping some of the simplicity of the framework?
	 */
};