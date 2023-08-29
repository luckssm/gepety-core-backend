/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = function (knex) {
  return knex.schema
    .alterTable('address', t => {
      t.bigInteger('petshopId').nullable().after('userId')
    })
    .alterTable('pet', t => {
      t.bigInteger('petshopId').nullable().after('clientId')
    })
    .alterTable('user', t => {
      t.dropColumn('notes')
      t.dropColumn('canScheduleThroughApp')
    })
    .createTable('clientpetshopinfo', function (t) {
      t.bigIncrements('id')
      t.bigInteger('clientId').notNullable()
      t.bigInteger('petshopId').notNullable()

      t.string('notes', 1024).nullable()
      t.boolean('canScheduleThroughApp').notNullable().defaultTo(false)

      t.dateTime('createdAt').defaultTo(knex.fn.now()).notNull()
      t.dateTime('updatedAt').defaultTo(knex.fn.now()).notNull()
    })
    .createTable('petshopresponsibleperson', function (t) {
      t.bigIncrements('id')
      t.bigInteger('petshopId').notNullable()

      t.string('name', 255).notNullable()
      t.string('cpf', 60).nullable()
      t.string('phoneNumber', 60).nullable()

      t.dateTime('createdAt').defaultTo(knex.fn.now()).notNull()
      t.dateTime('updatedAt').defaultTo(knex.fn.now()).notNull()
    })
}

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = function (knex) {
  return knex.schema
    .alterTable('address', t => {
      t.dropColumn('petshopId')
    })
    .alterTable('pet', t => {
      t.dropColumn('petshopId')
    })
    .alterTable('user', t => {
      t.string('notes', 1024).nullable()
      t.boolean('canScheduleThroughApp').notNullable().defaultTo(false)
    })
    .dropTableIfExists('clientpetshopinfo')
    .dropTableIfExists('petshopresponsibleperson')
}
