const Model = require('../lib/BaseModel')
const Joi = require('joi')

class User extends Model {
  static get tableName () {
    return 'user'
  }

  $beforeUpdate () {
    this.updatedAt = new Date().toISOString().slice(0, 19).replace('T', ' ')
  }

  $beforeInsert () {
    this.createdAt = new Date().toISOString().slice(0, 19).replace('T', ' ')
  }

  $formatJson (json) {
    json = super.$formatJson(json)

    delete json.password
    return json
  }

  static get joiSchema () {
    return Joi.object().keys({
      id: Joi.number().integer(),
      email: Joi.string(),
      password: Joi.string(),

      name: Joi.string(),
      phoneNumber: Joi.string().max(60),
      additionalPhoneNumber: Joi.string().max(60).allow(null, ''),

      auth: Joi.number().integer(),
      secUpdatedAt: Joi.string(),

      cnpj: Joi.string().max(60).allow(null),
      cpf: Joi.string().max(60).allow(null),

      termsVersion: Joi.string().max(60),
      privacyVersion: Joi.string().max(60),
      isBlockedFromReceivingEmail: Joi.boolean(),

      createdAt: Joi.date(),
      updatedAt: Joi.date()
    })
  }

  static get modifiers () {
    return {
      selectedPetshopOnly (builder, id) {
        builder.where('petshopId', id)
      }
    }
  }

  static get relationMappings () {
    const PetshopConfiguration = require('./PetshopConfiguration')
    const ClientPetshopRelation = require('./ClientPetshopRelation')
    const ClientPetshopInfo = require('./ClientPetshopInfo')
    const Pet = require('./Pet')
    const Address = require('./Address')
    const User = require('./User')
    const PetshopResponsiblePerson = require('./PetshopResponsiblePerson')

    return {
      petshopConfiguration: {
        relation: Model.HasOneRelation,
        modelClass: PetshopConfiguration,
        join: {
          from: 'petshopconfiguration.petshopId',
          to: 'user.id'
        }
      },
      petshops: {
        relation: Model.ManyToManyRelation,
        modelClass: User,
        filter: query => query.select('user.id', 'name', 'phoneNumber'),
        join: {
          from: 'user.id',
          through: {
            from: 'workerpetshoprelation.workerId',
            to: 'workerpetshoprelation.petshopId'
          },
          to: 'user.id'
        }
      },
      responsiblePerson: {
        relation: Model.HasOneRelation,
        modelClass: PetshopResponsiblePerson,
        join: {
          from: 'petshopresponsibleperson.petshopId',
          to: 'user.id'
        }
      },
      workers: {
        relation: Model.ManyToManyRelation,
        modelClass: User,
        join: {
          from: 'user.id',
          through: {
            from: 'workerpetshoprelation.petshopId',
            to: 'workerpetshoprelation.workerId '
          },
          to: 'user.id'
        }
      },
      clientPetshops: {
        relation: Model.ManyToManyRelation,
        modelClass: User,
        filter: query => query.select('user.id', 'name', 'phoneNumber'),
        join: {
          from: 'user.id',
          through: {
            from: 'clientpetshoprelation.clientId',
            to: 'clientpetshoprelation.petshopId'
          },
          to: 'user.id'
        }
      },
      clientPetshopRelation: {
        relation: Model.HasManyRelation,
        modelClass: ClientPetshopRelation,
        join: {
          from: 'user.id',
          to: 'clientpetshoprelation.clientId'
        }
      },
      clientPetshopInfo: {
        relation: Model.HasManyRelation,
        modelClass: ClientPetshopInfo,
        join: {
          from: 'user.id',
          to: 'clientpetshopinfo.clientId'
        }
      },
      pets: {
        relation: Model.HasManyRelation,
        modelClass: Pet,
        join: {
          from: 'user.id',
          to: 'pet.clientId'
        }
      },
      address: {
        relation: Model.HasManyRelation,
        modelClass: Address,
        join: {
          from: 'address.userId',
          to: 'user.id'
        }
      }
    }
  }
}

module.exports = User
