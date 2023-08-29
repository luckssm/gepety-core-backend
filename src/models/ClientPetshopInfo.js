const Model = require('../lib/BaseModel')
const Joi = require('joi')

class ClientPetshopInfo extends Model {
  static get tableName () {
    return 'clientpetshopinfo'
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

      notes: Joi.string().max(1024).allow(null, ''),
      canScheduleThroughApp: Joi.boolean(),

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

module.exports = ClientPetshopInfo
