const amqp = require('amqplib/callback_api')
const Kudos = require('../models/kudos.model.js');
const _self = this;
// Create  
exports.create = async (req, res) => {
    const kudos = new Kudos({
        fuente: req.body.fuente,
        fuenteName: req.body.fuenteName,
        destino: req.body.destino,
        destinoName: req.body.destinoName,
        tema: req.body.tema,
        lugar: req.body.lugar,
        texto: req.body.text || "No text"
    })
    await kudos.save()
}

// LIST
exports.findAll = async (req, res) => {
    const kudos = await Kudos.find()
    res.send(kudos)
};

// Find
exports.findOne = async (req, res) => {
    const { kudosId } = req.params
    const listKudos = await Kudos.find({ destino: kudosId }).sort({ fecha: 'desc' })
    res.send(listKudos)
}

exports.findOneRbb = async (id) => {
    console.log(id)
    var listKudos = await Kudos.find({ destino: id }).sort({ fecha: 'desc' })
    return listKudos
}

// Update   
exports.update = (req, res) => {
}

// Delete
exports.delete = async (req, res) => {
    const { _id } = req.params
    const kudosReg = await Kudos.findById(_id)
    console.log(kudosReg)
    await Kudos.findOneAndDelete(_id)
}

exports.deleteMasive = async (id) => {
    const result = await Kudos.remove({ destino: id })
    return "ok";
}

