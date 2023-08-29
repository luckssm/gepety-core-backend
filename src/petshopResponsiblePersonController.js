const createError = require('http-errors')
const Joi = require('joi')

const PetshopResponsiblePerson = require('./models/PetshopResponsiblePerson')
const User = require('./models/User')

const { isPetshop, isWorker } = require('./lib/auth')

module.exports.createPetshopResponsiblePersonController = async (req) => {
  if (!isPetshop(req.user)) {
    throw createError(403, `User of id ${req.user.id} is not of type petshop`, {
      displayMessage: 'Não autorizado. Somente um petshop pode criar seu responsável.'
    })
  }

  const alreadyHasResponsiblePerson = await PetshopResponsiblePerson.query().where({ petshopId: req.user.id }).first()

  if (alreadyHasResponsiblePerson) {
    throw createError(400, `Petshop of id ${req.user.id} already has a responsible person registered`, {
      displayMessage: 'Petshop já tem uma pessoa responsável cadastrada.'
    })
  }

  const responsiblePersonData = await Joi.object().keys({
    name: Joi.string().required(),
    phoneNumber: Joi.string().max(60).required(),
    cpf: Joi.string().max(60).required()
  }).validateAsync(req.body)

  responsiblePersonData.petshopId = req.user.id

  return PetshopResponsiblePerson.query().insert(responsiblePersonData)
}

module.exports.updatePetshopResponsiblePersonController = async (req) => {
  if (!isPetshop(req.user)) {
    throw createError(400, `User of id ${req.user.id} is not of type petshop`, {
      displayMessage: 'Não autorizado. Somente um petshop pode editar seu responsável.'
    })
  }

  const responsiblePersonData = await Joi.object().keys({
    name: Joi.string().required(),
    phoneNumber: Joi.string().max(60).required(),
    cpf: Joi.string().max(60).required()
  }).validateAsync(req.body)

  const responsiblePersonToUpdate = await PetshopResponsiblePerson.query().where({ petshopId: req.user.id }).first()

  if (!responsiblePersonToUpdate) {
    throw createError(404, `No responsible person data found for petshop of id ${req.user.id}.`, {
      displayMessage: 'Não foi encontrado um responsável pelo petshop.'
    })
  }

  return responsiblePersonToUpdate.$query().patchAndFetch(responsiblePersonData)
}

module.exports.getPetshopResponsiblePersonController = async (req) => {
  const responsiblePerson = await PetshopResponsiblePerson.query().where({ petshopId: req.user.id }).first().withGraphFetched('petshop')

  if (!responsiblePerson) {
    throw createError(404, 'Petshop responsible person not found.', {
      displayMessage: 'Não foi encontrado um responsável pelo petshop.'
    })
  }

  return responsiblePerson
}

module.exports.workerGetPetshopResponsiblePersonConciseController = async (req) => {
  if (!isWorker(req.user)) {
    throw createError(400, `User of id ${req.user.id} is not of type worker`, {
      displayMessage: 'Não autorizado. Somente colaboradores podem acessar dados básicos do pessoal responsável pelo petshop.'
    })
  }

  const {
    petshopId
  } = req.query

  const workerAtPetshop = await User.query()
    .findById(req.user.id)
    .withGraphJoined('petshops')
    .where('petshops.id', petshopId)

  if (!workerAtPetshop) {
    throw createError(403, `Worker of id ${req.user.id} does not work at petshop of id ${petshopId}`, {
      displayMessage: 'Não autorizado! O colaborador não trabalha no petshop.'
    })
  }

  const responsiblePerson = await PetshopResponsiblePerson.query().select('petshopresponsibleperson.id', 'petshopresponsibleperson.name').where({ petshopId: petshopId }).first()

  if (!responsiblePerson) {
    throw createError(404, 'Petshop responsible person not found.', {
      displayMessage: 'Não foi encontrado um responsável pelo petshop.'
    })
  }

  return responsiblePerson
}
