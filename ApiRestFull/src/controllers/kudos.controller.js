const amqp = require('amqplib/callback_api')
const Kudos = require('../models/kudos.model.js')
const rbbConfig = require('../config/rabbit.config.js')
const neo4j = require('neo4j-driver').v1
const neo4jDate = require('neo4j-driver').Date
const _self = this

var driver = neo4j.driver('bolt://localhost:7687', neo4j.auth.basic('neo4j', '123'))
var session = driver.session()
var sessionTX = driver.session()
// Create  
exports.create = async (req, res) => {
    var de = req.body.de
    var para = req.body.para
    var idKudos = generateUuid()
    var tema = req.body.tema
    var lugar = req.body.lugar
    var texto = req.body.texto
    var value = new Date()
    var fecha = new neo4j.types.DateTime(
        value.getFullYear(),
        value.getMonth(),
        value.getDate(),
        value.getHours(),
        value.getMinutes(),
        value.getSeconds(),
        value.getMilliseconds() * 1000000,
        value.getTimezoneOffset() * 60
    )

    session.run('CREATE(n:Kudos {idKudos: {idParam}, tema:{temaParam}, lugar:{lugarParam}, texto:{textoParam}, fecha:{fechaParam}}) RETURN n.tema',
        { idParam: idKudos, temaParam: tema, lugarParam: lugar, textoParam: texto, fechaParam: fecha })
        .then((result) => {
            session.run('MATCH (n) SET n.id = id(n)')
                .then((result) => {
                    // USERS
                    session.run('MATCH (n:User) RETURN n')
                        .then((usersN4J) => {
                            var users = []
                            usersN4J.records.forEach((record) => {
                                if (record._fields[0].properties.nick != null) {
                                    users.push({
                                        nickname: record._fields[0].properties.nick,
                                        name: record._fields[0].properties.nombre
                                    })
                                }
                            })
                            session.run('MATCH (u:User),(k:Kudos), (p:User) WHERE u.nick = {deParam} AND p.nick = {paraParam} AND k.idKudos = {idParam} CREATE (u)-[de:ENVIA]->(k), (k)-[para:RECIBE]->(p) RETURN u,k,p',
                                { idParam: idKudos, deParam: de, paraParam: para })
                                .then((relacion) => {
                                    // INIT RABBIT
                                    amqp.connect(rbbConfig.url, function (error0, connection) {
                                        connection.createChannel(function (error1, channel) {
                                            channel.assertQueue('', {
                                                exclusive: true
                                            }, (err, q) => {
                                                if (err)
                                                    throw err
                                                var correlationId = generateUuid()
                                                var fuente = para
                                                channel.consume(q.queue, (msg) => {
                                                    if (msg.properties.correlationId == correlationId) {
                                                    }
                                                }, { noAck: true })
                                                channel.sendToQueue(rbbConfig.queueStats + para,
                                                    Buffer.from(fuente.toString()), {
                                                        correlationId: correlationId,
                                                        replyTo: q.queue
                                                    })
                                            })
                                        })
                                    })
                                    // END RABBIT


                                    res.redirect('/kudos/')
                                })
                                .catch((err) => {
                                    console.log(err)
                                })
                        })
                        .catch((err) => {
                            console.log(err)
                        })
                })
                .catch((err) => {
                    console.log(err)
                })
            session.close()
        })
        .catch((err) => {
            console.log(err)
        })
}

// LIST
exports.findAll = async (req, res) => {
    const { page, limit } = req.query
    console.log(req.query)
    session.run('MATCH (e:User)-[:ENVIA]->(k:Kudos), (k:Kudos)-[:RECIBE]->(r:User) RETURN e.nick, k.fecha, k.tema, k.texto, r.nick ORDER BY k.fecha Skip {pageParam} LIMIT {limitParam}', { pageParam: parseInt(page), limitParam: parseInt(limit) })
        .then((kudosN4J) => {
            var kudos = []

            kudosN4J.records.map(record => {
                kudos.push({
                    tema: record.get("k.tema"),
                    envia: record.get("e.nick"),
                    recibe: record.get("r.nick"),
                    texto: record.get("k.texto")
                })
            });

            res.render('result', { kudos })
        })
        .catch((err) => {
            console.log(err)
        })

}

// Find
exports.findOne = (req, res) => {
    const { kudosId } = req.params
    session.run('MATCH (e:User)-[:ENVIA]->(k:Kudos) , (k:Kudos)-[:RECIBE]->(r:User) WHERE k.idKudos ={idParam} RETURN e.nick, k.fecha, k.tema, k.texto, r.nick', { idParam: kudosId })
        .then((kudosN4J) => {
            var kudos = []
            kudosN4J.records.map(record => {
                kudos.push({
                    tema: record.get("k.tema"),
                    envia: record.get("e.nick"),
                    recibe: record.get("r.nick"),
                    texto: record.get('k.texto')
                })
            });
            res.render('result', { kudos })
        })
        .catch((err) => {
            console.log(err)
        })
}


// Update   
exports.update = (req, res) => {
}

// Delete
exports.delete = (req, res) => {
    const { kudosId } = req.params
    console.log("ELIMINANDO", req.params)

    session.run('MATCH (e:User)-[:ENVIA]->(k:Kudos) , (k:Kudos)-[:RECIBE]->(r:User) WHERE k.idKudos ={idParam} RETURN e.nick, k.fecha, k.tema, k.texto, r.nick', { idParam: kudosId })
        .then((kudosN4J) => {
            var kudos = []
            kudosN4J.records.map(record => {
                kudos.push({
                    tema: record.get("k.tema"),
                    envia: record.get("e.nick"),
                    recibe: record.get("r.nick")
                })
            })
            let para = kudos[0].recibe
            console.log("BORAR KUDOS DE " + para)
            session.run('MATCH (k:Kudos {idKudos: {idParam}}) DETACH DELETE k', { idParam: kudosId })
                .then((kudosN4J) => {

                    amqp.connect(rbbConfig.url, function (error0, connection) {
                        connection.createChannel(function (error1, channel) {
                            channel.assertQueue('', {
                                exclusive: true
                            }, (err, q) => {
                                if (err)
                                    throw err
                                var correlationId = generateUuid()
                                var fuente = para
                                channel.consume(q.queue, (msg) => {
                                    if (msg.properties.correlationId == correlationId) {
                                    }
                                }, { noAck: true })
                                channel.sendToQueue(rbbConfig.queueStatsDis + para,
                                    Buffer.from(fuente.toString()), {
                                        correlationId: correlationId,
                                        replyTo: q.queue
                                    })
                            })
                        })
                    })

                    res.redirect('/kudos/')
                })
                .catch((err) => {
                    console.log(err)
                })

        })
        .catch((err) => {
            console.log(err)
        })
}



exports.deleteMasive = async (id) => {
    const result = await Kudos.remove({ destino: id })
    return "ok";
}

/******************************** EXTERNAL *******************************/
exports.user = async (reqe, res) => {
    console.log("RABBIT DE USER INICIADO...")
    // RABBIT INIT
    amqp.connect(rbbConfig.url, function (error0, connection) {
        connection.createChannel(function (error1, channel) {
            channel.assertQueue(rbbConfig.queueStats, {
                durable: true
            })
            channel.prefetch(1)
            channel.consume(rbbConfig.queueCreateUser, function reply(msg) {
                var n = msg.content.toString()
                console.log(n)
                var r = createUser(n)
                channel.sendToQueue(msg.properties.replyTo,
                    Buffer.from("OK"), {
                        correlationId: msg.properties.correlationId
                    })
                channel.ack(msg)
            })

        })
    })
    // RABBIT END
    res.send('ok')
}


exports.deleteUserN4J = (req, res) => {

    // RABBIT INIT
    amqp.connect(rbbConfig.url, function (error0, connection) {
        connection.createChannel(function (error1, channel) {
            channel.assertQueue(rbbConfig.queueStats, {
                durable: true
            })
            channel.prefetch(1)
            channel.consume(rbbConfig.queueDeleteUser, function reply(msg) {
                var n = msg.content.toString()
                console.log(n)
                var r = deleteUser(n)
                channel.sendToQueue(msg.properties.replyTo,
                    Buffer.from("OK"), {
                        correlationId: msg.properties.correlationId
                    })
                channel.ack(msg)
            })

        })
    })
    // RABBIT END
}

function createUser(username) {
    var value = new Date()
    var fecha = new neo4j.types.DateTime(
        value.getFullYear(),
        value.getMonth(),
        value.getDate(),
        value.getHours(),
        value.getMinutes(),
        value.getSeconds(),
        value.getMilliseconds() * 1000000,
        value.getTimezoneOffset() * 60
    )
    var name = username
    session.run('CREATE (a:User {nick: {nickParam}, fecha:{dateParam}})', { nickParam: name, dateParam: fecha })
        .then((result) => {
            console.log("CREADO EN NEO4J")
        })
        .catch((err) => {
            console.log(err)
        })
}

function deleteUser(username) {
    session.run('MATCH (n:User {nick:{nickParam}}) DETACH DELETE n', { nickParam: username })
        .then((result) => {
            console.log("Eliminado EN Neo4J")
        })
        .catch((err) => {
            console.log(err, 'el usuario no existe')

        })

}

function generateUuid() {
    return Math.random().toString() + Math.random().toString();
}
