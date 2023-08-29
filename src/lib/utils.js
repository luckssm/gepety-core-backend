const fetch = require('node-fetch')
const createError = require('http-errors')

module.exports.createFreeTrialSubscription = async ({ userId }) => {
  const uri = `${process.env.API_ENTRYPOINT}/subscription/free-trial`

  try {
    const serviceData = await fetch(uri, {
      method: 'POST',
      headers: { authorization: process.env.MICRO_PSK, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        userId
      })
    })

    const response = await serviceData.json()

    if (serviceData.ok) {
      return response
    }

    throw createError(500, response)
  } catch (err) {
    throw createError(500, err)
  }
}

const getActionUri = async ({ email }) => {
  const uri = `${process.env.API_ENTRYPOINT}/auth/setpassword/link`

  try {
    const passwordLinkData = await fetch(uri, {
      method: 'POST',
      headers: { authorization: process.env.MICRO_PSK, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email
      })
    })

    const response = await passwordLinkData.json()

    if (passwordLinkData.ok) {
      return response
    }

    throw createError(500, response)
  } catch (err) {
    throw createError(500, err)
  }
}

module.exports.sendCreatedUserEmail = async ({ email, name, petshopName, isPetshopMail, isWorkerMail, isClientMail }) => {
  let uri
  if (isPetshopMail) {
    uri = `${process.env.API_ENTRYPOINT}/email/petshop/new`
  } else if (isWorkerMail) {
    uri = `${process.env.API_ENTRYPOINT}/email/worker/new`
  } else {
    uri = `${process.env.API_ENTRYPOINT}/email/client/new`
  }

  let actionUri
  if (isClientMail || isWorkerMail) {
    actionUri = await getActionUri({ email })
  }

  const plansUri = process.env.PLANS_URI

  try {
    const createdUserMailData = await fetch(uri, {
      method: 'POST',
      headers: { authorization: process.env.MICRO_PSK, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email,
        name,
        petshopName,
        plansUri,
        actionUri
      })
    })

    const response = await createdUserMailData.json()

    if (createdUserMailData.ok) {
      return response
    }

    throw createError(500, response)
  } catch (err) {
    throw createError(500, err)
  }
}
