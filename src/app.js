const express = require('express')
const app = express()
const bodyParser = require('body-parser')
const queryString = require('query-string')
const cors = require('cors')

const { configDetails } = require('./lib/helpers')
const { run } = require('./lib/error')
const { auth } = require('./lib/auth')

const {
  getUsersListController,
  createPetshopController,
  updatePetshopController,
  getPetshopController,
  microGetPetshopController,

  createWorkerController,
  updateWorkerController,
  getWorkerController,
  getWorkersListController,
  checkWorkerPetshopController,

  createClientController,
  updateClientController,
  getClientListController,
  clientSelfUpdateController,
  clientSelfGetController,
  microGetClientPetshopController,

  checkScheduledClientDataController,
  microCheckClientPetshopsController,
  workerGetWorksNameListController,
  isUserBlockedFromReceivingEmailController,
  getBlockedUsersFromReceivingEmailController,
  blockUserFromReceivingEmailController,
  releaseUserToReceiveEmailController,
  updateClientCpfController
} = require('./userController')

const {
  createPetshopResponsiblePersonController,
  updatePetshopResponsiblePersonController,
  getPetshopResponsiblePersonController,
  workerGetPetshopResponsiblePersonConciseController
} = require('./petshopResponsiblePersonController')

const {
  createPetshopConfigurationController,
  getPetshopConfigurationController,
  updatePetshopConfigurationController,

  microGetPetshopConfigurationController,
  clientGetPetshopConfigurationController
} = require('./petshopConfigurationController')

require('@lsm/jwt-policies').init({
  validateTokenUri: `${process.env.API_ENTRYPOINT}/auth/token`,
  policies: configDetails.policies,
  microPSK: process.env.MICRO_PSK,
  disableLocalParser: true
})

// Initializes DB connection
require('./models/initDB')

// Sets query-string parser
app.set('query parser', queryString.parse)

app.use(cors())

const router = express.Router()

// *** petshopConfigurationController ***
router.post('/petshop/configuration', auth(), bodyParser.json(), run(createPetshopConfigurationController))
router.patch('/petshop/configuration', auth(), bodyParser.json(), run(updatePetshopConfigurationController))
router.get('/petshop/configuration', auth(), bodyParser.json(), run(getPetshopConfigurationController))
router.get('/petshop/:petshopId/configuration', auth(), bodyParser.json(), run(microGetPetshopConfigurationController))
router.get('/petshop/:petshopId/configuration/client', auth(), bodyParser.json(), run(clientGetPetshopConfigurationController))

// *** userController ***
// petshop
router.post('/petshop', bodyParser.json(), run(createPetshopController))
router.get('/petshop/list', run(getUsersListController))
router.get('/petshop', auth(), run(getPetshopController))
router.patch('/petshop', auth(), bodyParser.json(), run(updatePetshopController))
// worker
router.post('/worker', auth(), bodyParser.json(), run(createWorkerController))
router.patch('/worker/:id', auth(), bodyParser.json(), run(updateWorkerController))
router.get('/worker', auth(), run(getWorkerController))
router.get('/worker/list', auth(), run(getWorkersListController))
router.get('/worker/concise-list', auth(), run(workerGetWorksNameListController))
router.get('/worker/:workerId/petshop/:petshopId/check', auth(), run(checkWorkerPetshopController))
// client
router.post('/client', auth(), bodyParser.json(), run(createClientController))
router.patch('/client/:id/cpf', auth(), bodyParser.json(), run(updateClientCpfController))
router.patch('/client/:id', auth(), bodyParser.json(), run(updateClientController))
router.patch('/client', auth(), bodyParser.json(), run(clientSelfUpdateController))
router.get('/client/list', auth(), bodyParser.json(), run(getClientListController))
router.get('/client', auth(), bodyParser.json(), run(clientSelfGetController))
router.post('/client/schedule-data/check', auth(), bodyParser.json(), run(checkScheduledClientDataController))
router.get('/client/:clientId/petshop/list/check', auth(), bodyParser.json(), run(microCheckClientPetshopsController))
router.get('/client/:clientId/petshop/:petshopId/micro', auth(), bodyParser.json(), run(microGetClientPetshopController))
// email receiving status
router.get('/user/email/is-user-blocked', auth(), bodyParser.json(), run(isUserBlockedFromReceivingEmailController))
router.get('/user/email/blocked/list', auth(), bodyParser.json(), run(getBlockedUsersFromReceivingEmailController))
router.post('/user/email/block', auth(), bodyParser.json(), run(blockUserFromReceivingEmailController))
router.post('/user/email/release', auth(), bodyParser.json(), run(releaseUserToReceiveEmailController))

// *** petshopResponsiblePersonController ***
// petshop responsible person
router.post('/petshop/responsible-person', auth(), bodyParser.json(), run(createPetshopResponsiblePersonController))
router.patch('/petshop/responsible-person', auth(), bodyParser.json(), run(updatePetshopResponsiblePersonController))
router.get('/petshop/responsible-person', auth(), run(getPetshopResponsiblePersonController))
router.get('/petshop/concise-responsible-person', auth(), run(workerGetPetshopResponsiblePersonConciseController))

// generates conflict with routes that are of type 'petshop/...'
// more specific routes are above it to avoid conflicts
router.get('/petshop/:petshopId', auth(), run(microGetPetshopController))

app.use('/api/v1/backend', router)

module.exports = app
