const amqp = require('amqplib/callback_api')
const Kudos = require('../models/kudos.model.js')
const rbbConfig = require('../config/rabbit.config.js')
const Rabbit = require('./rabbit.controller')
const neo4j = require('neo4j-driver').v1
const neo4jDate = require('neo4j-driver').Date
const elastic = require('@elastic/elasticsearch')

const os = require('os')
const osUtils = require('os-utils')
const Influx = require('./influx.controller')

const _self = this

var client = new elastic.Client({
    node: 'http://localhost:9200'
})

var driver = neo4j.driver('bolt://localhost:7687', neo4j.auth.basic('neo4j', '123'))
var session = driver.session()

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
                                .then(async (relacion) => {

                                    await Influx.insert(osUtils.cpuUsage((v) => {
                                        return v
                                    }), os.freemem(), 'CREATE-KUDOS', 'KUDOS - Se creo el Kudos de ' + de + " para " + para)

                                    async function run() {
                                        await client.index({
                                            index: 'kudos',
                                            body: {
                                                id: idKudos,
                                                categoria: tema,
                                                contenido: texto
                                            }
                                        })
                                    }
                                    run().catch(console.log)

                                    // // INIT RABBIT
                                    let uUidQUeue = generateUuid()
                                    Rabbit.produceRPC(para, rbbConfig.queueStats, uUidQUeue)
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

//SEARCH
exports.searchView = (req, res) => {
    var results = []
    res.render('result-kudos-search', { results })

}


exports.search = async (req, res) => {
    const { input } = req.body
    var results = []
    async function run() {
        const { body } = await client.search({
            index: 'kudos',
            body: {
                query: {
                    multi_match: {
                        fields: ["categoria", "contenido"],
                        query: input.toString(),
                        fuzziness: 'AUTO'
                    }
                }
            }
        })
        body.hits.hits.map(record => {
            results.push({
                categoria: record._source.categoria,
                contenido: record._source.contenido
            })
        })
        await Influx.insert(osUtils.cpuUsage((v) => {
            return v
        }), os.freemem(), 'SEARCH-KUDOS', 'KUDOS - Buscar el termino ' + input)
        res.render('result-kudos-search', { results })
    }
    run().catch(console.log)
}

// LIST
exports.findAll = async (req, res) => {
    const { page, limit } = req.query
    console.log(req.query)
    session.run('MATCH (e:User)-[:ENVIA]->(k:Kudos), (k:Kudos)-[:RECIBE]->(r:User) RETURN e.nick, k.fecha, k.tema, k.texto, r.nick ORDER BY k.fecha Skip {pageParam} LIMIT {limitParam}', { pageParam: parseInt(page), limitParam: parseInt(limit) })
        .then(async (kudosN4J) => {
            var kudos = []

            kudosN4J.records.map(record => {
                kudos.push({
                    tema: record.get("k.tema"),
                    envia: record.get("e.nick"),
                    recibe: record.get("r.nick"),
                    texto: record.get("k.texto")
                })
            });
            await Influx.insert(osUtils.cpuUsage((v) => {
                return v
            }), os.freemem(), 'LIST-KUDOS', 'N4J - List all')
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
        .then(async (kudosN4J) => {
            var kudos = []
            kudosN4J.records.map(record => {
                kudos.push({
                    tema: record.get("k.tema"),
                    envia: record.get("e.nick"),
                    recibe: record.get("r.nick"),
                    texto: record.get('k.texto')
                })
            });
            await Influx.insert(osUtils.cpuUsage((v) => {
                return v
            }), os.freemem(), 'DETAIL', 'Detalle de KUDOS ' + kudosId)
            res.render('result', { kudos })
        })
        .catch((err) => {
            console.log(err)
        })
}

// Delete
exports.delete = (req, res) => {
    const { kudosId } = req.params
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
            session.run('MATCH (k:Kudos {idKudos: {idParam}}) DETACH DELETE k', { idParam: kudosId })
                .then(async (kudosN4J) => {
                    let uUidQUeue = generateUuid()
                    Rabbit.produceRPC(para, rbbConfig.queueStatsDis, uUidQUeue)

                    await Influx.insert(osUtils.cpuUsage((v) => {
                        return v
                    }), os.freemem(), 'DELETE-KUDOS', 'N4J - Borrado el kudos ' + kudosId)
                    // //kudosId
                    // async function run() {
                    //     const { body } = await client.deleteByQuery({
                    //         index: 'kudos',
                    //         body: {
                    //             query: {
                    //                 id: kudosId
                    //             }
                    //         }
                    //     })
                    //     //console.log(body.hits.hits)
                    // }
                    // run().catch(console.log)
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
exports.user = async (req, res) => {
    console.log("RABBIT DE USER INICIADO...")
    // RABBIT INIT
    await Rabbit.createUserRPC(rbbConfig.queueCreateUser)

    res.send('ok')
}

exports.deleteUserN4J = (req, res) => {
    // RABBIT INIT
    Rabbit.deleUserRPC(rbbConfig.queueDeleteUser)
    res.send("OK")
    // RABBIT END
}

function generateUuid() {
    return Math.random().toString() + Math.random().toString();
}
