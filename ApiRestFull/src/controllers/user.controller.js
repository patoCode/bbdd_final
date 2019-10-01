const amqp = require('amqplib/callback_api')
const elastic = require('@elastic/elasticsearch')

const rbbConfig = require('../config/rabbit.config.js')
const Rabbit = require('./rabbit.controller')

const User = require('../models/user.model.js')
const kudosC = require('../controllers/kudos.controller.js')
const os = require('os')
const osUtils = require('os-utils')
const Influx = require('./influx.controller')

const _self = this

var client = new elastic.Client({
    node: 'http://localhost:9200'
})
// Create  
exports.create = async (req, res) => {
    const userBD = await User.findOne({ username: req.body.username })
    if (!userBD) {
        const user = new User({
            nombre: req.body.nombre,
            apellido: req.body.apellido,
            email: req.body.email,
            username: req.body.username,
            password: req.body.password,
            telefono: req.body.telefono,
            qty: 0
        })
        await user.save()
        await kudosC.user

        /* RABBIT */
        let uUidQUeue = generateUuid()
        Rabbit.produceRPC(user.username, rbbConfig.queueCreateUser, uUidQUeue)

        await Influx.insert(osUtils.cpuUsage((v) => {
            return v
        }), os.freemem(), 'CREATE-MGDB', 'Se creo el usuario ' + user.username)

        async function run() {
            await client.index({
                index: 'usuarios',
                body: {
                    nombre: user.nombre,
                    nickname: user.username
                }
            })
        }
        run().catch(console.log)

        /* END  */
        res.redirect('/kudos/')
    } else {
        await Influx.insert(osUtils.cpuUsage((v) => {
            return v
        }), os.freemem(), 'ERROR-MGDB', 'USUARIO REPETIDO ' + req.body.username)
        res.send("USERNAME REPETIDO " + req.body.username)
    }

}

// LIST
exports.findAll = async (req, res) => {
    const { page, limit } = req.query
    const options = {
        page: parseInt(page, 10),
        limit: parseInt(limit, 10)
    }
    const usersDB = await User.find().sort({ nombre: -1 })
    usersDB.forEach(async (u) => {
        let username = u.get('username')
        Rabbit.addRPC(username, rbbConfig.queueStats)
    })

    usersDB.forEach((u) => {
        let username = u.get('username')
        Rabbit.discountRPC(username, rbbConfig.queueStatsDis)
    })

    await User.paginate({}, options, async (err, result) => {
        if (!err) {
            let users = result.docs
            await Influx.insert(osUtils.cpuUsage((v) => {
                return v
            }), os.freemem(), 'LIST-MGDB', 'List ALL ')
            res.render('user-list', { users })
        }
        else {
            res.send("error de listado")
        }

    })
}

exports.findUser = async (req, res) => {
    console.log(req.params)
    const user = await User.findOne({ _id: req.params._id })
    res.json(user)
}

exports.searchView = (req, res) => {
    var results = []
    res.render('result-search', { results })
}

exports.search = async (req, res) => {
    const { input } = req.body
    var results = []
    if (input == '') {
        res.redirect('/search/user')
    }
    else {
        async function run() {
            const { body } = await client.search({
                index: 'usuarios',
                body: {
                    query: {
                        multi_match: {
                            fields: ["nombre", "nickname"],
                            query: input.toString(),
                            fuzziness: 'AUTO'
                        }
                    }
                }
            })
            body.hits.hits.map(record => {
                results.push({
                    nombre: record._source.nombre,
                    nickname: record._source.nickname
                })
            })

        }
        run().catch(console.log)
        await Influx.insert(osUtils.cpuUsage((v) => {
            return v
        }), os.freemem(), 'SEARC-ES', 'Search el termino ' + input)
    }
    res.render('result-search', { results })
}

exports.delete = async (req, res) => {
    const { _id } = req.params
    const userBD = await User.findById(_id)
    const eliminado = await userBD.delete()

    // // INIT RABBIT
    let uUidQUeue = generateUuid()
    Rabbit.produceRPC(userBD.username, rbbConfig.queueDeleteUser, uUidQUeue)

    await Influx.insert(osUtils.cpuUsage((v) => {
        return v
    }), os.freemem(), 'DELETE-MGDB', 'Eliminado al usuario' + userBD.username)
    async function run() {
        const { body } = await client.deleteByQuery({
            index: 'usuarios',
            body: {
                query: {
                    nickname: userBD.username
                }
            }
        })
    }
    run().catch(console.log)

    res.redirect('/kudos/')
}

async function addQty(name) {
    const userBD = await User.findOne({ username: name })
    console.log("FUNCTION" + userBD)
    console.log(userBD.username + "TIENEN " + userBD.qty)
    if (userBD) {
        userBD.qty = userBD.qty + 1
        await userBD.save()
    } else {
        res.status(500).json({ error: 'Internal Error' })
    }
    console.log('ADD QTY')
}

async function missQty(name) {
    const userBD = await User.findOne({ username: name })
    console.log("FUNCTION" + userBD)
    console.log(userBD.username + "TIENEN " + userBD.qty)
    if (userBD) {
        userBD.qty = userBD.qty - 1
        await userBD.save()
    } else {
        res.status(500).json({ error: 'Internal Error' })
    }
    console.log('ASUBSTRACT QTY')
}

function generateUuid() {
    return Math.random().toString() +
        Math.random().toString();
}

