const { Model } = require('objection')

// Get databases connection data from knexfile
const knexconfig = require('./knexfile')

// Bind databases connection data into knex instance
const knex = require('knex')(knexconfig)

Model.knex(knex)

module.exports = knex
