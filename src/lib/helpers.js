const { isWorker } = require('./auth')
const createError = require('http-errors')

const User = require('../models/User')

const configDetails = {
  policies: {
    unconfirmedClient: 5,
    client: 10,
    unconfirmedPetshopWorker: 20,
    petshopWorker: 40,
    petshop: 50,
    admin: 100
  }
}

// Checks the type of user making the request and returns the petshopId
const getPetshopIdBasedOnUserType = async ({ query, user }) => {
  const {
    petshopId
  } = query

  if (isWorker(user)) {
    const workerAtPetshop = await User.query()
      .findById(user.id)
      .withGraphJoined('petshops')
      .where('petshops.id', petshopId)
    if (!workerAtPetshop) {
      throw createError(403, `Worker of id ${user.id} does not work at petshop of id ${petshopId}`, {
        displayMessage: 'Não autorizado! O colaborador não trabalha no petshop.'
      })
    }
    return parseInt(petshopId)
  } else {
    return user.id
  }
}

module.exports = {
  configDetails,
  getPetshopIdBasedOnUserType
}
