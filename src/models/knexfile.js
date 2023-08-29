module.exports = {
  client: 'mysql',
  connection: {
    host: process.env.DB_HOST,
    database: process.env.DB_NAME,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    charset: 'utf8',
    timezone: 'utc'
  },
  pool: {
    min: 0,
    max: 10
  },
  useNullAsDefault: true
}
