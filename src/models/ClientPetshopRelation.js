const Model = require('../lib/BaseModel')
const Joi = require('joi')

class ClientPetshopRelation extends Model {
  static get tableName () {
    return 'clientpetshoprelation'
  }

  $beforeUpdate () {
    this.updatedAt = new Date().toISOString().slice(0, 19).replace('T', ' ')
  }

  $beforeInsert () {
    this.createdAt = new Date().toISOString().slice(0, 19).replace('T', ' ')
  }

  static get modifiers () {
    return {
      selectedPetshopOnly (builder, id) {
        builder.where('petshopId', id)
      }
    }
  }

  static get joiSchema () {
    return Joi.object().keys({
      id: Joi.number().integer(),
      petshopId: Joi.number().integer(),
      clientId: Joi.number().integer(),

      isRemoved: Joi.boolean(),

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
          to: 'clientpetshoprelation.petshopId'
        }
      },
      client: {
        relation: Model.BelongsToOneRelation,
        modelClass: User,
        join: {
          from: 'user.id',
          to: 'clientpetshoprelation.clientId'
        }
      }
    }
  }
}

module.exports = ClientPetshopRelation
