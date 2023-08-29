const Model = require('../lib/BaseModel')
const Joi = require('joi')

class PetshopConfiguration extends Model {
  static get tableName () {
    return 'petshopconfiguration'
  }

  $beforeUpdate () {
    this.updatedAt = new Date().toISOString().slice(0, 19).replace('T', ' ')
  }

  $beforeInsert () {
    this.createdAt = new Date().toISOString().slice(0, 19).replace('T', ' ')
  }

  static get joiSchema () {
    return Joi.object().keys({
      id: Joi.number().integer(),
      petshopId: Joi.number().integer(),

      paymentThroughApp: Joi.boolean(),
      paymentOutsideApp: Joi.boolean(),
      cancellationFee: Joi.number().integer(),
      scheduleThroughAppCancelIfNotPayed: Joi.boolean(),

      createdAt: Joi.date(),
      updatedAt: Joi.date()
    })
  }

  static get relationMappings () {
    const User = require('./User')
    return {
      petshop: {
        relation: Model.BelongsToOneRelation,
        modelClass: User,
        join: {
          from: 'user.id',
          to: 'petshopconfiguration.petshopId'
        }
      }
    }
  }
}

module.exports = PetshopConfiguration
