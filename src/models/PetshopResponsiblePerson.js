const Model = require('../lib/BaseModel')
const Joi = require('joi')

class PetshopResponsiblePerson extends Model {
  static get tableName () {
    return 'petshopresponsibleperson'
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

      name: Joi.string(),
      phoneNumber: Joi.string().max(60),
      cpf: Joi.string().max(60).allow(null),

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
          to: 'petshopresponsibleperson.petshopId'
        }
      }
    }
  }
}

module.exports = PetshopResponsiblePerson
