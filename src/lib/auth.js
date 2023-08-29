const { JWTParser } = require('@lsm/jwt-policies')

module.exports.auth = (params = {}) => {
  return async (req, res, next) => {
    if (typeof req.headers.authorization !== 'string') {
      return res.status(401).json({ message: 'Wrong Credentials' })
    }
    try {
      const jwt = await JWTParser(req, res)
      req.user = jwt
    } catch (error) {
      if (error.code === 'auth/id-token-expired' ||
      error.name === 'TokenExpiredError') {
        // User token is expired
        return res.status(401).json({ message: 'Token expired' })
      }
      console.error('Error decoding token', error)
      // User token is not valid
      return res.status(401).json({ message: 'Wrong Credentials' })
    }
    return next()
  }
}

module.exports.isUnconfirmedClient = (user) => user && user.auth === 5
module.exports.isClient = (user) => user && user.auth === 10
module.exports.isUnconfirmedWorker = (user) => user && user.auth === 20
module.exports.isWorker = (user) => user && user.auth === 40
module.exports.isPetshop = (user) => user && user.auth === 50
module.exports.isAdmin = (user) => user && user.auth === 100
module.exports.isAdmin = (user) => user && user.auth === 100
module.exports.isMicro = (user) => user && user.isMicro
