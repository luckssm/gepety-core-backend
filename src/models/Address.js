const Model = require('../lib/BaseModel')
const Joi = require('joi')

class Address extends Model {
  static get tableName () {
    return 'address'
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
      userId: Joi.number().integer(),
      petshopId: Joi.number().integer(),

      cep: Joi.string().max(10).allow(null, ''),
      city: Joi.string().max(60).allow(null, ''),
      uf: Joi.string().max(10).allow(null, ''),
      district: Joi.string().max(60).allow(null, ''),
      street: Joi.string().max(60).allow(null, ''),
      streetNumber: Joi.number().integer().allow(null, ''),
      complement: Joi.string().max(60).allow(null, ''),

      deliveryValue: Joi.number().integer(),
      deliveryTime: Joi.number().integer(),

      createdAt: Joi.date(),
      updatedAt: Joi.date()
    })
  }

  static get relationMappings () {
    const User = require('./User')

    return {
      tutor: {
        relation: Model.BelongsToOneRelation,
        modelClass: User,
        join: {
          from: 'user.id',
          to: 'address.userId'
        }
      }
    }
  }
}

module.exports = Address
