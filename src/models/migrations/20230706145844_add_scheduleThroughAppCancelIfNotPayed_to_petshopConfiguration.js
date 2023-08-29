/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = function (knex) {
  return knex.schema
    .alterTable('petshopconfiguration', table => {
      table.boolean('scheduleThroughAppCancelIfNotPayed').after('cancellationFee').notNullable().default(false)
    })
}

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = function (knex) {
  return knex.schema
    .alterTable('petshopconfiguration', table => {
      table.dropColumn('scheduleThroughAppCancelIfNotPayed')
    })
}
