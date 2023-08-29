const Model = require('../lib/BaseModel')
const Joi = require('joi')

class WorkerPetshopRelation extends Model {
  static get tableName () {
    return 'workerpetshoprelation'
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
      workerId: Joi.number().integer(),

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
          to: 'workerpetshoprelation.petshopId'
        }
      },
      worker: {
        relation: Model.BelongsToOneRelation,
        modelClass: User,
        join: {
          from: 'user.id',
          to: 'workerpetshoprelation.workerId'
        }
      }
    }
  }
}

module.exports = WorkerPetshopRelation
