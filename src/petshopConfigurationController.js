const createError = require('http-errors')
const Joi = require('joi')

const PetshopConfiguration = require('./models/PetshopConfiguration')

const { isPetshop, isMicro, isClient } = require('./lib/auth')

// This is for intern use only, the petshop configuration will be created at the Petshop creation
module.exports.createPetshopConfigurationController = async (req) => {
  if (!isMicro(req.user)) {
    throw createError(403, 'Not Authorized', {
      displayMessage: 'Não autorizado.'
    })
  }

  return PetshopConfiguration.query().insert({ petshopId: req.body.petshopId })
}

// TODO: Change to updatePetshopConfigurationController
module.exports.updatePetshopConfigurationController = async (req) => {
  if (!isPetshop(req.user)) {
    throw createError(400, `User of id ${req.user.id} is not of type petshop`, {
      displayMessage: 'Não autorizado. Somente um petshop pode editar suas configurações.'
    })
  }

  const petshopConfigurationData = await Joi.object().keys({
    paymentThroughApp: Joi.boolean().required(),
    paymentOutsideApp: Joi.boolean().required(),
    cancellationFee: Joi.number().integer().required()
  }).validateAsync(req.body)

  const petshopConfiguration = await PetshopConfiguration.query().where({ petshopId: req.user.id }).first()

  if (!petshopConfiguration) {
    throw createError(404, `No petshop configuration data found for petshop of id ${req.user.id}.`, {
      displayMessage: 'Não foram encontradas as configurações do petshop.'
    })
  }

  return petshopConfiguration.$query().patchAndFetch(petshopConfigurationData)
}

module.exports.getPetshopConfigurationController = async (req) => {
  const petshopConfig = await PetshopConfiguration.query().where({ petshopId: req.user.id }).first()

  if (!petshopConfig) {
    throw createError(404, 'Petshop configuration not found.', {
      displayMessage: 'Não foram encontradas as configurações do petshop.'
    })
  }

  return petshopConfig
}

module.exports.microGetPetshopConfigurationController = async (req) => {
  if (!isMicro(req.user)) {
    throw createError(403, 'Cannot get petshop configurations.', {
      displayMessage: 'Não autorizado.'
    })
  }

  const { petshopId } = req.params

  const petshopConfig = await PetshopConfiguration.query().where({ petshopId }).first()

  if (!petshopConfig) {
    throw createError(404, 'Petshop configuration not found.', {
      displayMessage: 'Não foram encontradas as configurações do petshop.'
    })
  }

  return petshopConfig
}

module.exports.clientGetPetshopConfigurationController = async (req) => {
  if (!isClient(req.user)) {
    throw createError(403, 'Cannot get petshop info.', {
      displayMessage: 'Não autorizado.'
    })
  }

  const { petshopId } = req.params

  const petshopConfig = await PetshopConfiguration.query().where({ petshopId }).first()

  if (!petshopConfig) {
    throw createError(404, 'Petshop info not found.', {
      displayMessage: 'Não foram encontradas as informações do petshop selecionado.'
    })
  }

  return {
    paymentThroughApp: petshopConfig.paymentThroughApp,
    paymentOutsideApp: petshopConfig.paymentOutsideApp,
    cancellationFee: petshopConfig.cancellationFee
  }
}
