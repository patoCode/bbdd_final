const mongoose = require('mongoose');
const mongoosePaginate = require('mongoose-paginate-v2');

const UserSchema = mongoose.Schema({
    nombre: { type: String, required: true },
    apellido: { type: String, required: true },
    email: { type: String, required: true },
    username: { type: String, required: true },
    password: { type: String, required: true },
    telefono: { type: String },
    qty: { type: Number, default: 0 }
})
UserSchema.plugin(mongoosePaginate)
module.exports = mongoose.model('User', UserSchema)