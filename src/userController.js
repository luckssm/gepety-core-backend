const { transaction } = require('objection')
const createError = require('http-errors')
const Joi = require('joi')
const bcrypt = require('bcryptjs')
const generator = require('generate-password')

const User = require('./models/User')
const Address = require('./models/Address')
const WorkerPetshopRelation = require('./models/WorkerPetshopRelation')
const ClientPetshopRelation = require('./models/ClientPetshopRelation')
const ClientPetshopInfo = require('./models/ClientPetshopInfo')
const PetshopConfiguration = require('./models/PetshopConfiguration')
const Pet = require('./models/Pet')

const { isClient, isUnconfirmedClient, isUnconfirmedWorker, isWorker, isPetshop, isAdmin, isMicro } = require('./lib/auth')
const { createFreeTrialSubscription, sendCreatedUserEmail } = require('./lib/utils')
const { getPetshopIdBasedOnUserType } = require('./lib/helpers')

const hashPassword = (password) => bcrypt.hash(password, 10)

module.exports.createPetshopController = async (req) => {
  const { user, address } = req.body

  const userData = await Joi.object().keys({
    email: Joi.string().required(),
    password: Joi.string().required(),
    name: Joi.string().required(),
    phoneNumber: Joi.string().max(60).required(),
    cnpj: Joi.string().max(60).required()
  }).validateAsync(user)

  userData.auth = 50
  userData.termsVersion = process.env.TERMS_VERSION
  userData.privacyVersion = process.env.PRIVACY_VERSION

  const hashedPassword = await hashPassword(userData.password)
  userData.password = hashedPassword

  const addressData = await Joi.object().keys({
    cep: Joi.string().max(10).required(),
    city: Joi.string().max(60).required(),
    uf: Joi.string().max(10).required(),
    district: Joi.string().max(60).required(),
    street: Joi.string().max(60).required(),
    streetNumber: Joi.number().integer().required(),
    complement: Joi.string().max(60).allow(null, '')
  }).validateAsync(address)

  const createdData = await transaction(User.knex(), async (trx) => {
    const createdUser = await User.query(trx).insert(userData)
    addressData.userId = createdUser.id

    const createdAddress = await Address.query(trx).insert(addressData)

    const createdTestClient = await createClient({
      user: {
        email: userData.email.split('@')[0].concat(`-${userData.email.split('@')[1].slice(0, 2)}@clienteteste.com.br`),
        name: 'Cliente Teste',
        phoneNumber: userData.phoneNumber
      },
      address: {
        cep: addressData.cep,
        city: addressData.city,
        uf: addressData.uf,
        district: addressData.district,
        street: addressData.street,
        streetNumber: addressData.streetNumber,
        complement: addressData.complement,
        deliveryValue: 2000,
        deliveryTime: 10
      },
      pets: [
        {
          name: 'Rex',
          breed: 'SRD',
          bodySize: 'medium',
          furSize: 'short',
          notes: 'Dócil.',
          extraTime: 0
        }
      ],
      clientInfo: {
        notes: 'Qualquer observação sobre o cliente.',
        canScheduleThroughApp: true
      },
      petshopId: createdUser.id,
      inheritedTrx: trx
    })

    await PetshopConfiguration.query(trx).insert({ petshopId: createdUser.id })

    return { user: createdUser, address: createdAddress, clientList: [createdTestClient] }
  })

  // Tries to create a free trial subscription for a new petshop, but does not throw an error if it happens.
  // This is to allow user to still access the app.
  // TODO: see if there is a better way to handle this and avoid problems with users with no free trial.
  try {
    await createFreeTrialSubscription({ userId: createdData.user.id })
  } catch (err) {
    console.error(`Error creating freeTrial for petshop of id ${createdData.user.id}. Error details: `, err)
  }

  // Tries to send e-mail for a new petshop, but does not throw an error if it happens.
  try {
    sendCreatedUserEmail({ email: createdData.user.email, name: createdData.user.name, isPetshopMail: true })
  } catch (err) {
    console.error(`Error sending create user mail for petshop of id ${createdData.user.id}. Error details: `, err)
  }

  return createdData
}

module.exports.updatePetshopController = async (req) => {
  if (!isPetshop(req.user)) {
    throw createError(400, `User of id ${req.user.id} is not of type petshop`, {
      displayMessage: 'Atualização falhou. Usuário não é Petshop.'
    })
  }

  const { user, address } = req.body

  const userData = await Joi.object().keys({
    email: Joi.string(),
    name: Joi.string(),
    phoneNumber: Joi.string().max(60),
    cnpj: Joi.string().max(60)
  }).validateAsync(user)

  // Block some updates that will only be possible through our support team
  delete userData.email
  delete userData.cnpj

  const addressData = await Joi.object().keys({
    cep: Joi.string().max(10),
    city: Joi.string().max(60),
    uf: Joi.string().max(10),
    district: Joi.string().max(60),
    street: Joi.string().max(60),
    streetNumber: Joi.number().integer(),
    complement: Joi.string().max(60).allow(null, '')
  }).validateAsync(address)

  const petshopToUpdate = await User.query().findById(req.user.id)
  const addressToUpdate = await Address.query().where({ userId: req.user.id }).first()

  if (!petshopToUpdate || !addressToUpdate) {
    throw createError(404, `User of id ${req.user.id} and/or user address not found.`, {
      displayMessage: 'Usuário ou endereço não encontrados.'
    })
  }

  const updatedData = await transaction(User.knex(), async (trx) => {
    const updatedUser = await petshopToUpdate.$query(trx).patchAndFetch(userData)
    const updatedAddress = await addressToUpdate.$query(trx).patchAndFetch(addressData)

    return { user: updatedUser, address: updatedAddress }
  })

  return updatedData
}

module.exports.getPetshopController = async (req) => {
  if (!isPetshop(req.user)) {
    throw createError(403, `User of id ${req.user.id} is not authorized to getPetshop`, {
      displayMessage: 'Não autorizado.'
    })
  }

  const petshop = await User.query().findById(req.user.id).withGraphFetched('[responsiblePerson, address, workers, petshopConfiguration]')

  if (!petshop) {
    throw createError(404, `User of id ${req.user.id} not found.`, {
      displayMessage: 'Usuário não encontrado.'
    })
  }

  return petshop
}

module.exports.microGetPetshopController = async (req) => {
  if (!isMicro(req.user)) {
    throw createError(403, 'Not authorized to getPetshop', {
      displayMessage: 'Não autorizado.'
    })
  }

  const petshopId = req.params.petshopId

  const petshop = await User.query().findById(petshopId).withGraphFetched('[responsiblePerson, address, workers, petshopConfiguration]')

  if (!petshop) {
    throw createError(404, `User of id ${req.user.id} not found.`, {
      displayMessage: 'Usuário não encontrado.'
    })
  }

  return petshop
}

// TODO: move to admin callbacks
module.exports.getUsersListController = async (req) => {
  if (!isAdmin(req.user)) {
    throw createError(403, `Unauthorized, user of id ${req.user.id} is not of type admin.`, {
      displayMessage: 'Não autorizado, usuário não é um administrador.'
    })
  }

  return User.query().withGraphFetched('address')
}

module.exports.createWorkerController = async (req) => {
  if (!isPetshop(req.user)) {
    throw createError(403, `User of id ${req.user.id} is not of type petshop`, {
      displayMessage: 'Não autorizado. Somente um petshop pode adicionar colaboradores.'
    })
  }

  const userData = await Joi.object().keys({
    email: Joi.string().required(),
    name: Joi.string().required(),
    phoneNumber: Joi.string().max(60).required()
  }).validateAsync(req.body)

  userData.auth = 20

  // Terms and privacy versions are at v0, so that when user opens the app, he can accept our policies.
  // As the user is created by the petshop, it cannot be done earlier.
  userData.termsVersion = 'v0'
  userData.privacyVersion = 'v0'

  userData.password = generator.generate({ length: 32 })

  const hashedPassword = await hashPassword(userData.password)
  userData.password = hashedPassword

  const createdData = await transaction(User.knex(), async (trx) => {
    const createdWorker = await User.query(trx).insert(userData)
    await WorkerPetshopRelation.query(trx).insert({ petshopId: req.user.id, workerId: createdWorker.id })

    return { user: createdWorker }
  })

  // Tries to send e-mail for a new worker, but does not throw an error if it happens.
  try {
    const petshopInfo = await User.query().findById(req.user.id).select('name')
    if (!petshopInfo) {
      throw createError(404, `Petshop of id ${req.user.id} not found.`, {
        displayMessage: 'Dados do petshop não encontrados.'
      })
    }
    sendCreatedUserEmail({ email: createdData.user.email, name: createdData.user.name, isWorkerMail: true, petshopName: petshopInfo.name })
  } catch (err) {
    console.error(`Error sending create user mail for petshop of id ${createdData.user.id}. Error details: `, err)
  }

  return createdData
}

module.exports.updateWorkerController = async (req) => {
  if (!isPetshop(req.user)) {
    throw createError(403, `User of id ${req.user.id} is not of type petshop`, {
      displayMessage: 'Não autorizado. Somente o petshop pode atualizar os dados de um colaborador.'
    })
  }

  const userData = await Joi.object().keys({
    email: Joi.string(),
    name: Joi.string(),
    phoneNumber: Joi.string().max(60)
  }).validateAsync(req.body)

  // TODO: Change join rules (check update client controller)
  const workerToUpdate = await User.query().findById(req.params.id).withGraphFetched('petshops')

  if (!workerToUpdate) {
    throw createError(404, `Worker of id ${req.params.id} not found.`, {
      displayMessage: 'Colaborador não encontrado.'
    })
  }

  if (!isUnconfirmedWorker(workerToUpdate) && !isWorker(workerToUpdate)) {
    throw createError(403, `Selected worker of id ${req.params.id} cannot be updated.`, {
      displayMessage: 'Colaborador não pode ser atualizado.'
    })
  }

  // TODO: Allow multiple petshops
  const workerPetshop = workerToUpdate.petshops[0]

  if (!workerPetshop || workerPetshop.id !== req.user.id) {
    throw createError(403, `Not Authorized. Worker of Id ${req.params.id} does not belong to petshop of id ${req.user.id}`, {
      displayMessage: 'Não autorizado. Colaborador não está cadastrado no Petshop.'
    })
  }

  const updatedData = await transaction(User.knex(), async (trx) => {
    const updatedWorker = await workerToUpdate.$query(trx).patchAndFetch(userData)
    return { user: updatedWorker }
  })

  return updatedData
}

module.exports.getWorkerController = async (req) => {
  if (!isUnconfirmedWorker(req.user) && !isWorker(req.user)) {
    throw createError(403, `User of id ${req.user.id} is not of type worker`, {
      displayMessage: 'Não autorizado. Usuário não é um colaborador.'
    })
  }

  const worker = await User.query().findById(req.user.id).withGraphFetched('petshops')

  if (!worker) {
    throw createError(404, 'User not found.', {
      displayMessage: 'Usuário não encontrado.'
    })
  }

  return worker
}

module.exports.getWorkersListController = async (req) => {
  if (!isPetshop(req.user)) {
    throw createError(400, `User of id ${req.user.id} is not of type petshop`, {
      displayMessage: 'Não autorizado. Somente petshop pode acessar sua lista de colaboradores.'
    })
  }

  return User.query().withGraphJoined('petshops')
    .where('petshops.id', req.user.id)
}

module.exports.workerGetWorksNameListController = async (req) => {
  if (!isWorker(req.user)) {
    throw createError(400, `User of id ${req.user.id} is not of type worker`, {
      displayMessage: 'Não autorizado. Somente colaboradores podem acessar a lista com nome dos colaboradores.'
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

  return User.query()
    .select('user.id', 'user.name')
    .withGraphJoined('petshops')
    .where('petshops.id', petshopId)
}

module.exports.checkWorkerPetshopController = async (req) => {
  if (!isMicro(req.user)) {
    throw createError(403, 'Only micro can make this call.', {
      displayMessage: 'Não autorizado.'
    })
  }

  const user = await User.query().findById(req.params.workerId).withGraphJoined('petshops')
    .where('petshops.id', req.params.petshopId)

  return user
}

const createClient = async ({ user, address, pets, clientInfo, petshopId, existingClient, inheritedTrx }) => {
  const clientData = await Joi.object().keys({
    email: Joi.string().required(),
    name: Joi.string().required(),
    phoneNumber: Joi.string().max(60).required(),
    additionalPhoneNumber: Joi.string().max(60).allow(null, '')
  }).validateAsync(user)

  clientData.auth = 5

  // Terms and privacy versions are at v0, so that when user opens the app, he can accept our policies.
  // As the user is created by the petshop, it cannot be done earlier.
  clientData.termsVersion = 'v0'
  clientData.privacyVersion = 'v0'

  clientData.password = generator.generate({ length: 32 })

  const hashedPassword = await hashPassword(clientData.password)
  clientData.password = hashedPassword

  let addressData
  if (address) {
    addressData = await Joi.object().keys({
      cep: Joi.string().max(10).required(),
      city: Joi.string().max(60).required(),
      uf: Joi.string().max(10).required(),
      district: Joi.string().max(60).required(),
      street: Joi.string().max(60).required(),
      streetNumber: Joi.number().integer().required(),
      complement: Joi.string().max(60).allow(null, ''),
      deliveryValue: Joi.number().integer().required(),
      deliveryTime: Joi.number().integer().required()
    }).validateAsync(address)
    addressData.petshopId = petshopId
  }

  const clientInfoData = await Joi.object().keys({
    notes: Joi.string().max(1024).allow(null, ''),
    canScheduleThroughApp: Joi.boolean()
  }).validateAsync(clientInfo)

  clientInfoData.petshopId = petshopId

  // TODO: add status if user exists
  // if (existingClient) {
  //   clientInfoData.status = 'awaitingClientAcceptance'
  // }

  const petsData = []
  if (pets && pets.length > 0) {
    await pets.forEach(async (pet) => {
      const petData = await Joi.object().keys({
        name: Joi.string().required(),
        breed: Joi.string().allow(null, ''),
        bodySize: Joi.string().required(),
        furSize: Joi.string().required(),
        notes: Joi.string().max(1024).allow(null, ''),
        extraTime: Joi.number().integer()
      }).validateAsync(pet)
      petData.petshopId = petshopId
      petsData.push(petData)
    })
  }

  const createdData = await transaction(User.knex(), async (trx) => {
    let actualTransaction = trx
    if (inheritedTrx) {
      actualTransaction = inheritedTrx
    }

    let client

    if (existingClient) {
      client = existingClient
    } else {
      client = await User.query(actualTransaction).insert(clientData)
    }

    const createdClientPetshopRelation = await ClientPetshopRelation.query(actualTransaction).insert({ petshopId: petshopId, clientId: client.id })

    let createdAddress
    if (addressData) {
      addressData.userId = client.id
      createdAddress = await Address.query(actualTransaction).insert(addressData)
    }

    clientInfoData.clientId = client.id
    const createdClientPetshopInfo = await ClientPetshopInfo.query(actualTransaction).insert(clientInfoData)

    const createdPets = []
    for (const petData of petsData) {
      petData.clientId = client.id
      const createdPet = await Pet.query(actualTransaction).insert(petData)
      createdPets.push(createdPet)
    }

    return { user: client, clientPetshopRelation: createdClientPetshopRelation, clientPetshopInfo: createdClientPetshopInfo, clientAddress: createdAddress, pets: createdPets, alreadyExists: existingClient }
  })

  return createdData
}

module.exports.createClientController = async (req) => {
  if (!isPetshop(req.user)) {
    throw createError(403, `User of id ${req.user.id} is not of type petshop`, {
      displayMessage: 'Não autorizado. Somente um petshop pode adicionar clientes.'
    })
  }

  const { user, address, pets, clientInfo } = req.body

  // A client can already exist and be added to another petshop
  let existingClient
  if (user && user.email) {
    existingClient = await User.query().withGraphJoined('clientPetshopRelation')
      .where({ email: user.email }).first()
  }

  if (existingClient && existingClient.auth !== 5 && existingClient.auth !== 10) {
    throw createError(400, `User of id ${existingClient.id} is not of type client and cannot be added.`, {
      displayMessage: 'Este e-mail já está sendo usado. Peça para o(a) cliente escolher outro.'
    })
  }

  if (existingClient && existingClient.clientPetshopRelation) {
    for (const relation of existingClient.clientPetshopRelation) {
      if (relation.petshopId === req.user.id) {
        throw createError(400, `User of id ${existingClient.id} was already added by petshop of id ${req.user.id}`, {
          displayMessage: 'Você já cadastrou esse e-mail.'
        })
      }
    }
  }

  const createdClient = await createClient({ user, address, pets, clientInfo, petshopId: req.user.id, existingClient })

  // Tries to send e-mail for a new client, but does not throw an error if it happens.
  try {
    const petshopInfo = await User.query().findById(req.user.id).select('name')
    if (!petshopInfo) {
      throw createError(404, `Petshop of id ${req.user.id} not found.`, {
        displayMessage: 'Dados do petshop não encontrados.'
      })
    }
    sendCreatedUserEmail({ email: createdClient.user.email, name: createdClient.user.name, isClientMail: true, petshopName: petshopInfo.name })
  } catch (err) {
    console.error(`Error sending create user mail for petshop of id ${createdClient.user.id}. Error details: `, err)
  }

  return createdClient
}

module.exports.updateClientController = async (req) => {
  if (!isPetshop(req.user)) {
    throw createError(403, `User of id ${req.user.id} is not of type petshop`, {
      displayMessage: 'Não autorizado. Somente o petshop ou o próprio cliente podem atualizar os dados de um cliente.'
    })
  }

  const clientToUpdateId = parseInt(req.params.id)

  if (!clientToUpdateId) {
    throw createError(400, 'Client Id is needed to update a client.', {
      displayMessage: 'Id do cliente é necessário para fazer uma atualização de dados.'
    })
  }

  const clientToUpdate = await User.query().findById(clientToUpdateId).withGraphJoined('clientPetshopRelation').withGraphJoined('pets').withGraphJoined('address').withGraphJoined('clientPetshopInfo')
    .where('clientPetshopRelation.petshopId', req.user.id)
    .where('pets.petshopId', req.user.id)
    .whereRaw(`(address.petshopId = ${req.user.id} || address.petshopId is null)`)
    .where('clientPetshopInfo.petshopId', req.user.id)

  if (!clientToUpdate) {
    throw createError(404, `Client of id ${clientToUpdateId} not found or does not belong to petshop of id ${req.user.id}.`, {
      displayMessage: 'Cliente não encontrado.'
    })
  }

  if (!isUnconfirmedClient(clientToUpdate) && !isClient(clientToUpdate)) {
    throw createError(403, `Selected client of id ${clientToUpdateId} cannot be updated.`, {
      displayMessage: 'Cliente não pode ser atualizado.'
    })
  }

  const clientPetshop = clientToUpdate.clientPetshopRelation[0]

  if (!clientPetshop || clientPetshop.petshopId !== req.user.id) {
    throw createError(403, `Not Authorized. Client of Id ${clientToUpdateId} does not belong to petshop of id ${req.user.id}`, {
      displayMessage: 'Não autorizado. Cliente não está cadastrado no Petshop.'
    })
  }

  const { user, address, pets, clientInfo } = req.body

  const clientData = await Joi.object().keys({
    email: Joi.string().required(),
    name: Joi.string().required(),
    phoneNumber: Joi.string().max(60).required(),
    additionalPhoneNumber: Joi.string().max(60).allow(null, '')
  }).validateAsync(user)

  let addressData
  if (address) {
    addressData = await Joi.object().keys({
      id: Joi.number().integer(),
      cep: Joi.string().max(10).required(),
      city: Joi.string().max(60).required(),
      uf: Joi.string().max(10).required(),
      district: Joi.string().max(60).required(),
      street: Joi.string().max(60).required(),
      streetNumber: Joi.number().integer().required(),
      complement: Joi.string().max(60).allow(null, ''),
      deliveryValue: Joi.number().integer().required(),
      deliveryTime: Joi.number().integer().required()
    }).validateAsync(address)
  }

  const clientInfoData = await Joi.object().keys({
    notes: Joi.string().max(1024).allow(null, ''),
    canScheduleThroughApp: Joi.boolean()
  }).validateAsync(clientInfo)

  const petsData = []
  if (pets && pets.length > 0) {
    await pets.forEach(async (pet) => {
      const petData = await Joi.object().keys({
        id: Joi.number().integer(),
        name: Joi.string().required(),
        breed: Joi.string().allow(null, ''),
        bodySize: Joi.string().required(),
        furSize: Joi.string().required(),
        notes: Joi.string().max(1024).allow(null, ''),
        extraTime: Joi.number().integer()
      }).validateAsync(pet)
      petsData.push(petData)
    })
  }

  const updatedData = await transaction(User.knex(), async (trx) => {
    let updatedAddress = []
    // If client does not have an address and the body sent address information, we will create an address for this user
    if ((!clientToUpdate.address || clientToUpdate.address.length === 0) && addressData) {
      addressData.petshopId = req.user.id
      addressData.userId = clientToUpdate.id
      updatedAddress = await Address.query(trx).insert(addressData)

    // If client already has an address and the body sent address information, we will update the user address
    } else if (clientToUpdate.address && clientToUpdate.address.length > 0 && addressData) {
      // Check to see if address to update belongs to client
      if (clientToUpdate.address[0].id !== addressData.id) {
        throw createError(403, `Not Authorized. Address of Id ${addressData.id} does not belong to client of id ${clientToUpdateId}`, {
          displayMessage: 'Não autorizado. O endereço enviado não pertence ao cliente selecionado.'
        })
      }

      // block id changes
      delete addressData.id

      updatedAddress = await Address.query(trx).patchAndFetchById(clientToUpdate.address[0].id, addressData)
    }

    const updatedClientData = await clientToUpdate.$query(trx).patchAndFetch(clientData)

    const updatedClientPetshopInfo = await ClientPetshopInfo.query(trx).where({ clientId: clientToUpdate.id, petshopId: req.user.id }).first()
    await updatedClientPetshopInfo.$query(trx).patchAndFetch(clientInfoData)

    const updatedPets = []
    for (const petData of petsData) {
      if (petData.id) {
        const petToUpdate = clientToUpdate.pets.find(pet => pet.id === petData.id)

        if (!petToUpdate) {
          throw createError(404, `Pet of id ${petData.id} of petshop of id ${req.user.id} was not found.`, {
            displayMessage: 'Pet não encontrado para ser atualizado. Confira os dados e tente novamente'
          })
        }

        // block id changes
        delete petData.id
        const updatedPet = await Pet.query(trx).patchAndFetchById(petToUpdate.id, petData)

        updatedPets.push(updatedPet)
      } else {
        petData.clientId = clientToUpdateId
        petData.petshopId = req.user.id

        const createdPet = await Pet.query(trx).insert(petData)
        updatedPets.push(createdPet)
      }
    }

    return { user: updatedClientData, clientAddress: updatedAddress, pets: updatedPets, clientPetshopInfo: updatedClientPetshopInfo }
  })

  return updatedData
}

module.exports.getClientListController = async (req) => {
  if (!isPetshop(req.user) && !isWorker(req.user)) {
    throw createError(403, 'User is not authorized to get list of clients.', {
      displayMessage: 'Não autorizado a lista dos clientes.'
    })
  }

  const petshopId = await getPetshopIdBasedOnUserType({
    query: req.query,
    user: req.user
  })

  // TODO: Add pagination if performance is bad (check if it will be needed, maybe it will not)
  return User.query().withGraphJoined('clientPetshopRelation').withGraphJoined('pets').withGraphJoined('address').withGraphJoined('clientPetshopInfo')
    .where('clientPetshopRelation.isRemoved', false)
    .where('clientPetshopRelation.petshopId', petshopId)
    .where('pets.petshopId', petshopId)
    .whereRaw(`(address.petshopId = ${petshopId} || address.petshopId is null)`)
    .where('clientPetshopInfo.petshopId', petshopId)
    // Due to the withGraphJoined with pets, the results are always pets*clients. Have this in mind when and if implementing range
    // .range(0, 12)
}

module.exports.microGetClientPetshopController = async (req) => {
  if (!isMicro(req.user)) {
    throw createError(403, 'Not Authorized.', {
      displayMessage: 'Não autorizado.'
    })
  }

  const petshopId = parseInt(req.params.petshopId)
  const clientId = parseInt(req.params.clientId)

  return User.query().findById(clientId).withGraphJoined('clientPetshopRelation').withGraphJoined('pets').withGraphJoined('address').withGraphJoined('clientPetshopInfo')
    .where('clientPetshopRelation.isRemoved', false)
    .where('clientPetshopRelation.petshopId', petshopId)
    .where('pets.petshopId', petshopId)
    .whereRaw(`(address.petshopId = ${petshopId} || address.petshopId is null)`)
    .where('clientPetshopInfo.petshopId', petshopId)
}

module.exports.clientSelfUpdateController = async (req) => {
  if (!isClient(req.user)) {
    throw createError(403, `User of id ${req.user.id} is not a client`, {
      displayMessage: 'Não autorizado. Somente um cliente pode atualizar esses dados.'
    })
  }

  const clientData = await Joi.object().keys({
    name: Joi.string(),
    phoneNumber: Joi.string().max(60),
    additionalPhoneNumber: Joi.string().max(60).allow(null, ''),
    cpf: Joi.string()
  }).validateAsync(req.body)

  const clientToUpdate = await User.query().findById(req.user.id)

  if (!clientToUpdate) {
    throw createError(404, `Client of id ${req.user.id} not found to update self.`, {
      displayMessage: 'Dados não encontrados.'
    })
  }

  return clientToUpdate.$query().patchAndFetch(clientData)
}

module.exports.updateClientCpfController = async (req) => {
  if (!isPetshop(req.user)) {
    throw createError(403, `User of id ${req.user.id} is not a petshop`, {
      displayMessage: 'Não autorizado. Somente um petshop pode atualizar esse dado.'
    })
  }

  const clientToUpdateId = parseInt(req.params.id)

  if (!clientToUpdateId) {
    throw createError(400, 'Client Id is needed to update a client.', {
      displayMessage: 'Id do cliente é necessário para fazer uma atualização de dados.'
    })
  }

  const clientData = await Joi.object().keys({
    cpf: Joi.string()
  }).validateAsync(req.body)

  const clientToUpdate = await User.query().findById(clientToUpdateId)

  if (!clientToUpdate) {
    throw createError(404, `Client of id ${clientToUpdateId} not found to be updated.`, {
      displayMessage: 'Dados não encontrados.'
    })
  }
  
  return clientToUpdate.$query().patchAndFetch(clientData)
}

module.exports.clientSelfGetController = async (req) => {
  if (!isClient(req.user)) {
    throw createError(403, `User of id ${req.user.id} is not a client`, {
      displayMessage: 'Não autorizado. Somente um cliente pode obter esses dados.'
    })
  }

  const client = await User.query().findById(req.user.id).withGraphJoined('clientPetshopRelation').withGraphJoined('pets').withGraphJoined('address').withGraphJoined('clientPetshopInfo').withGraphJoined('clientPetshops.address')
    .where('clientPetshopRelation.isRemoved', false)

  const clientResponse = client

  clientResponse.petshops = []

  for (const relation of client.clientPetshopRelation) {
    const petshop = {
      pets: clientResponse.pets.map(pet => {
        return {
          id: pet.id,
          clientId: pet.clientId,
          petshopId: pet.petshopId,
          name: pet.name,
          breed: pet.breed,
          bodySize: pet.bodySize,
          furSize: pet.furSize,
          extraTime: pet.extraTime
        }
      }).filter(pet => pet.petshopId === relation.petshopId),
      clientAddress: clientResponse.address.find(address => address.petshopId === relation.petshopId),
      clientPetshopInfo: clientResponse.clientPetshopInfo.map((clientInfo) => {
        return {
          petshopId: clientInfo.petshopId,
          canScheduleThroughApp: clientInfo.canScheduleThroughApp
        }
      }).find(clientPetshopInfo => clientPetshopInfo.petshopId === relation.petshopId),
      petshopInfo: clientResponse.clientPetshops.find(clientPetshop => clientPetshop.id === relation.petshopId)
    }

    if (petshop.petshopInfo && petshop.petshopInfo.address && petshop.petshopInfo.address.length > 0) {
      const petshopAddress = petshop.petshopInfo.address.map(address => {
        return {
          cep: address.cep,
          city: address.city,
          uf: address.uf,
          district: address.district,
          street: address.street,
          streetNumber: address.streetNumber,
          complement: address.complement
        }
      })
      petshop.petshopInfo.address = petshopAddress[0]
    }

    clientResponse.petshops.push(petshop)
  }

  // removing some unnecessary and redundant fields from response
  delete clientResponse.clientPetshopRelation
  delete clientResponse.pets
  delete clientResponse.address
  delete clientResponse.clientPetshopInfo
  delete clientResponse.clientPetshops

  return clientResponse
}

module.exports.microCheckClientPetshopsController = async (req) => {
  if (!isMicro(req.user)) {
    throw createError(403, 'Cannot check client\'s petshops.', {
      displayMessage: 'Não autorizado.'
    })
  }

  const clientId = parseInt(req.params.clientId)

  return User.query().findById(clientId).withGraphJoined('clientPetshopRelation').where('clientPetshopRelation.isRemoved', false)
}

module.exports.checkScheduledClientDataController = async (req) => {
  if (!isMicro(req.user)) {
    throw createError(403, 'Only micro can make this call.', {
      displayMessage: 'Não autorizado.'
    })
  }

  const {
    clientId,
    petId,
    petshopId,
    payThroughApp,
    deliveryValue
  } = req.body

  // TODO: update other places where we get "Address", to get the client even when the address is empty for this petshop, but there are other petshops
  const client = await User.query().findById(clientId).withGraphJoined('clientPetshopRelation').withGraphJoined('pets').withGraphJoined('clientPetshopInfo').withGraphJoined('address')
    .where('clientPetshopRelation.isRemoved', false)
    .where('clientPetshopRelation.petshopId', petshopId)
    .where('pets.petshopId', petshopId)
    .where('pets.id', petId)
    // .whereRaw(`(address.petshopId = ${petshopId} OR address.petshopId is null)`)
    .where('clientPetshopInfo.petshopId', petshopId)
    .modifyGraph('address', builder => {
      builder.where('address.petshopId', '=', petshopId)
    })

  if (!client) {
    throw createError(404, `Client of id ${clientId} of pet of id ${petId} not found.`, {
      displayMessage: 'Cliente e/ou pet não encontrado.'
    })
  }

  if (deliveryValue) {
    if (client.address && client.address.length === 0) {
      throw createError(404, `Delivery value is not allowed. There is no address for client of id ${clientId}.`, {
        displayMessage: 'Valor de entrega não permitido. O endereço desse cliente não existe no sistema.'
      })
    }

    if (client.address && client.address[0].deliveryValue !== deliveryValue) {
      throw createError(404, `Delivery value does not match the value in the system for client of id ${clientId}.`, {
        displayMessage: 'Valor de entrega não corresponde ao valor cadastrado para o cliente.'
      })
    }
  }

  const petshopConfig = await PetshopConfiguration.query().where({ petshopId }).first()

  if (payThroughApp) {
    if (!petshopConfig.paymentThroughApp) {
      throw createError(404, `Petshop of id ${petshopId} does not allow payment through app.`, {
        displayMessage: 'Petshop não permite pagamento pelo app.'
      })
    }
    if (petshopConfig.scheduleThroughAppCancelIfNotPayed) {
      client.scheduleThroughAppCancelIfNotPayed = true
    }
  } else {
    if (!petshopConfig.paymentOutsideApp) {
      throw createError(404, `Petshop of id ${petshopId} does not allow payment outside app.`, {
        displayMessage: 'Petshop não permite pagamento fora do app.'
      })
    }
  }

  client.cancellationFee = petshopConfig.cancellationFee

  return client
}

// *********** E-mail Block and Release operations ***********

module.exports.getBlockedUsersFromReceivingEmail = async (req) => {
  if (!isAdmin(req.user)) {
    throw createError(403, 'Only admin can make this call.', {
      displayMessage: 'Não autorizado.'
    })
  }

  const usersBlockedFromReceivingEmail = await User.query().where('isBlockedFromReceivingEmail', true)

  return usersBlockedFromReceivingEmail
}

module.exports.isUserBlockedFromReceivingEmailController = async (req) => {
  if (!isMicro(req.user)) {
    throw createError(403, 'Only micro can make this call.', {
      displayMessage: 'Não autorizado.'
    })
  }

  const { email } = req.query

  if (email) {
    const userBlockedFromReceivingEmail = await User.query().where({ email, isBlockedFromReceivingEmail: true }).resultSize()
    if (!userBlockedFromReceivingEmail) {
      return { isUserBlockedFromReceivingEmail: false }
    }
  }

  return { isUserBlockedFromReceivingEmail: true }
}

module.exports.blockUserFromReceivingEmailController = async (req) => {
  if (!isMicro(req.user)) {
    throw createError(403, 'Only micro can make this call.', {
      displayMessage: 'Não autorizado.'
    })
  }

  const { email } = req.query

  if (!email) {
    throw createError(400, 'Bad params. E-mail is needed.',
      { displayMessage: 'E-mail é um campo obrigatório.' }
    )
  }

  const userToBeBlockedFromReceivingEmail = await User.query().where({ email }).first()
  if (!userToBeBlockedFromReceivingEmail) {
    throw createError(404, `User not found for email ${email}`,
      { displayMessage: 'Usuário não encontrado.' }
    )
  }

  return userToBeBlockedFromReceivingEmail.$query().patch({ isBlockedFromReceivingEmail: true })
}

module.exports.releaseUserToReceiveEmailController = async (req, res) => {
  if (!isMicro(req.user) && !isAdmin(req.user)) {
    throw createError(403, 'Only micro and admin can make this call.', {
      displayMessage: 'Não autorizado.'
    })
  }

  const { email } = req.query

  if (!email) {
    throw createError(400, 'Bad params. E-mail is needed.',
      { displayMessage: 'E-mail é um campo obrigatório.' }
    )
  }

  const userToBeReleasedToReceiveEmail = await User.query().where({ email }).first()
  if (!userToBeReleasedToReceiveEmail) {
    throw createError(404, `User not found for email ${email}`,
      { displayMessage: 'Usuário não encontrado.' }
    )
  }

  return userToBeReleasedToReceiveEmail.$query().patch({ isBlockedFromReceivingEmail: false })
}
