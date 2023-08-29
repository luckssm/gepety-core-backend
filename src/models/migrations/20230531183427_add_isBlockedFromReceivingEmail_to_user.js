/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = function (knex) {
  return knex.schema
    .alterTable('user', table => {
      table.boolean('isBlockedFromReceivingEmail').after('privacyVersion').notNullable().default(false)
    })
}

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = function (knex) {
  return knex.schema
    .alterTable('user', table => {
      table.dropColumn('isBlockedFromReceivingEmail')
    })
}
