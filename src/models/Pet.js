const Model = require('../lib/BaseModel')
const Joi = require('joi')

class Pet extends Model {
  static get tableName () {
    return 'pet'
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
      clientId: Joi.number().integer(),
      petshopId: Joi.number().integer(),

      name: Joi.string(),
      breed: Joi.string().allow(null, ''),
      bodySize: Joi.string().allow('small', 'medium', 'large', 'special', 'other'),
      furSize: Joi.string().allow('short', 'long'),

      notes: Joi.string().max(1024).allow(null, ''),
      extraTime: Joi.number().integer(),

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
          to: 'pet.clientId'
        }
      }
    }
  }
}

module.exports = Pet
