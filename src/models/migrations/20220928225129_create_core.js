/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = function (knex) {
  return knex.schema
    .createTable('user', function (t) {
      t.bigIncrements('id')
      t.string('email').notNullable()
      t.string('password').notNullable()

      t.string('name', 255).notNullable()
      t.string('phoneNumber', 60).nullable()
      t.string('additionalPhoneNumber', 60).nullable()

      t.integer('auth').notNullable()

      t.string('cnpj', 60).nullable()
      t.string('cpf', 60).nullable()

      t.string('notes', 1024).nullable()

      t.boolean('canScheduleThroughApp').notNullable().defaultTo(false)

      t.string('termsVersion', 60).notNullable()
      t.string('privacyVersion', 60).notNullable()

      t.dateTime('createdAt').defaultTo(knex.fn.now()).notNull()
      t.dateTime('updatedAt').defaultTo(knex.fn.now()).notNull()
    })
    .createTable('petshopconfiguration', function (t) {
      t.bigIncrements('id')
      t.bigInteger('petshopId')

      t.boolean('paymentThroughApp').notNullable().defaultTo(false)
      t.boolean('paymentOutsideApp').notNullable().defaultTo(true)
      t.integer('cancellationFee').notNullable().defaultTo(0)

      t.dateTime('createdAt').defaultTo(knex.fn.now()).notNull()
      t.dateTime('updatedAt').defaultTo(knex.fn.now()).notNull()
    })
    .createTable('workerpetshoprelation', function (t) {
      t.bigIncrements('id')
      t.bigInteger('workerId').notNullable()
      t.bigInteger('petshopId').notNullable()

      t.boolean('isRemoved').notNullable().defaultTo(false)

      t.dateTime('createdAt').defaultTo(knex.fn.now()).notNull()
      t.dateTime('updatedAt').defaultTo(knex.fn.now()).notNull()
    })
    .createTable('clientpetshoprelation', function (t) {
      t.bigIncrements('id')
      t.bigInteger('clientId').notNullable()
      t.bigInteger('petshopId').notNullable()
      t.boolean('isRemoved').notNullable().defaultTo(false)

      t.dateTime('createdAt').defaultTo(knex.fn.now()).notNull()
      t.dateTime('updatedAt').defaultTo(knex.fn.now()).notNull()
    })
    .createTable('pet', function (t) {
      t.bigIncrements('id')
      t.bigInteger('clientId')

      t.string('breed')
      t.enu('bodySize', ['small', 'medium', 'large', 'special', 'other'])
      t.enu('furSize', ['short', 'long'])

      t.string('notes', 1024).nullable()
      t.integer('extraTime').notNullable().defaultTo(0)

      t.dateTime('createdAt').defaultTo(knex.fn.now()).notNull()
      t.dateTime('updatedAt').defaultTo(knex.fn.now()).notNull()
    })
    .createTable('address', function (t) {
      t.bigIncrements('id')
      t.bigInteger('userId')

      t.string('cep', 10).nullable()
      t.string('city', 60).nullable()
      t.string('uf', 10).nullable()
      t.string('district', 60).nullable()
      t.string('street', 60).nullable()
      t.integer('streetNumber').nullable()
      t.string('complement', 60).nullable()

      t.integer('deliveryValue').nullable()
      t.integer('deliveryTime').nullable()

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
    .dropTableIfExists('user')
    .dropTableIfExists('petshopconfiguration')
    .dropTableIfExists('workerpetshoprelation')
    .dropTableIfExists('clientpetshoprelation')
    .dropTableIfExists('pet')
    .dropTableIfExists('address')
}
