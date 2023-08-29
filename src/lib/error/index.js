const createError = require('http-errors')

const {
  ValidationError,
  NotFoundError,
  DBError,
  UniqueViolationError,
  NotNullViolationError,
  ForeignKeyViolationError,
  CheckViolationError,
  DataError
} = require('objection')

const isAnyDBError = (err) => {
  return [
    ValidationError,
    NotFoundError,
    DBError,
    UniqueViolationError,
    NotNullViolationError,
    ForeignKeyViolationError,
    CheckViolationError,
    DataError
  ].some((errClass) => err instanceof errClass)
}

module.exports.run = (handler) => async function (req, res, ...params) {
  try {
    const response = await handler(req, res, ...params)
    // Ignore if 'res' has already ended (e.g. `res.send()` already called)
    if (!res.writableEnded) {
      res.status(200).json(response)
    }
  } catch (err) {
    const { status, body } = module.exports.resolveErrorResponse(err)
    res.status(status).json(body)
  }
}

module.exports.resolveErrorResponse = function (err) {
  const isProd = process.env.NODE_ENV === 'production'

  if (createError.isHttpError(err)) {
    return module.exports.resolveHttpError(err)
  } else if (err.isJoi) {
    return module.exports.resolveJoiError(err)
  } else if (isAnyDBError(err) && !isProd) {
    // DB errors are only catched on DEV
    // On production, Internal server error is returned
    return module.exports.resolveDataBaseErrors(err)
  } else {
    return module.exports.resolveHttpError(err)
  }
}

module.exports.resolveHttpError = function (err) {
  const isProd = process.env.NODE_ENV === 'production'

  const receivedStatus = err.status || err.statusCode || 500
  const status = receivedStatus >= 400 ? receivedStatus : 500

  const body = {
    message: err.message
  }
  if (err.code) body.code = err.code
  if (err.name) body.name = err.name
  if (err.type) body.type = err.type
  if (err.displayMessage) body.displayMessage = err.displayMessage

  // show the stacktrace when not in production
  if (!isProd) body.stack = err.stack

  if (status >= 500) {
    console.error(err.stack)
    body.message = 'Internal server error'
    return { status, body }
  } else {
    return { status, body }
  }
}

module.exports.resolveJoiError = (err) => {
  return {
    status: 400,
    body: {
      type: 'ValidationError',
      message: err.details[0].message,
      data: err.details[0].context.key
    }
  }
}

module.exports.resolveDataBaseErrors = function (err) {
  if (err instanceof ValidationError) {
    switch (err.type) {
      case 'ModelValidation':
        return {
          status: 400,
          body: {
            message: err.message,
            type: err.type,
            data: err.data
          }
        }
      case 'RelationExpression':
        return {
          status: 400,
          body: {
            message: err.message,
            type: 'RelationExpression',
            data: {}
          }
        }
      case 'UnallowedRelation':
        return {
          status: 400,
          body: {
            message: err.message,
            type: err.type,
            data: {}
          }
        }
      case 'InvalidGraph':
        return {
          status: 400,
          body: {
            message: err.message,
            type: err.type,
            data: {}
          }
        }
      default:
        return {
          status: 400,
          body: {
            message: err.message,
            type: 'UnknownValidationError',
            data: {}
          }
        }
    }
  } else if (err instanceof NotFoundError) {
    return {
      status: 404,
      body: {
        message: err.message,
        type: 'NotFound',
        data: {}
      }
    }
  } else if (err instanceof UniqueViolationError) {
    return {
      status: 409,
      body: {
        message: err.message,
        type: 'UniqueViolation',
        data: {
          columns: err.columns,
          table: err.table,
          constraint: err.constraint
        }
      }
    }
  } else if (err instanceof NotNullViolationError) {
    return {
      status: 400,
      body: {
        message: err.message,
        type: 'NotNullViolation',
        data: {
          column: err.column,
          table: err.table
        }
      }
    }
  } else if (err instanceof ForeignKeyViolationError) {
    return {
      status: 409,
      body: {
        message: err.message,
        type: 'ForeignKeyViolation',
        data: {
          table: err.table,
          constraint: err.constraint
        }
      }
    }
  } else if (err instanceof CheckViolationError) {
    return {
      status: 400,
      body: {
        message: err.message,
        type: 'CheckViolation',
        data: {
          table: err.table,
          constraint: err.constraint
        }
      }
    }
  } else if (err instanceof DataError) {
    return {
      status: 400,
      body: {
        message: err.message,
        type: 'InvalidData',
        data: {}
      }
    }
  } else {
    return {
      status: 500,
      body: {
        message: err.message,
        type: 'UnknownDatabaseError',
        data: {}
      }
    }
  }
}
