/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = function (knex) {
  return knex.schema
    .table('user', t => {
      t.unique('email')
    })
    .alterTable('user', t => {
      t.dateTime('secUpdatedAt').nullable().after('auth')
    })
}

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = function (knex) {
  return knex.schema
    .table('user', t => {
      t.dropUnique('email')
    })
    .alterTable('user', t => {
      t.dropColumn('secUpdatedAt')
    })
}
