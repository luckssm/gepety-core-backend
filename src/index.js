const env = process.env.NODE_ENV || 'development'
// Configure environment variables using .env* files
require('dotenv-flow').config({ node_env: env })

const app = require('./app')

const PORT = process.env.PORT || 3000

app.listen(PORT, () => {
  console.log(env, '> server listening to port', PORT)
})
