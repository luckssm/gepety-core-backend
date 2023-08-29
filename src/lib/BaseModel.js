const { Model } = require('objection')
const _ = require('lodash')

class BaseModel extends Model {
  $validate (json = this, options = {}) {
    const ModelClass = this.constructor
    let joiSchema = ModelClass.joiSchema

    if (!joiSchema || options.skipValidation) {
      return json
    }

    // No need to call $beforeValidate (and clone the joiSchema) if $beforeValidate has not been overwritten.
    if (this.$beforeValidate !== BaseModel.prototype.$beforeValidate) {
      joiSchema = _.cloneDeep(joiSchema)
      joiSchema = this.$beforeValidate(joiSchema, json, options)
    }

    // If its patch operation, set all keys as optional
    // This prevents from the necessity of sending all fields on a `patch` request
    if (options.patch) {
      const allKeys = Object.keys(joiSchema.describe().keys)
      joiSchema = joiSchema.fork(allKeys, (schema) => schema.optional())
    }

    const data = joiSchema.validate(json, { stripUnknown: true })

    if (data.error) {
      throw data.error
    }

    this.$afterValidate(json, options)

    return json
  }

  static get schemaFields () {
    if (this.joiSchema) {
      return Object.keys(this.joiSchema.describe().keys)
    } else if (this.jsonSchema) {
      return Object.keys(this.jsonSchema.properties)
    } else return null
  }
}

module.exports = BaseModel
