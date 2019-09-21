const mongoose = require('mongoose');

const KudosSchema = mongoose.Schema({
    fuente: { type: Number, required: true },
    fuenteName: { type: String, required: true },
    destino: { type: Number, required: true },
    destinoName: { type: String, required: true },
    tema: { type: String, required: true },
    fecha: { type: Date, default: Date.now },
    lugar: { type: String },
    texto: { type: String, required: true },
});

module.exports = mongoose.model('Kudos', KudosSchema);