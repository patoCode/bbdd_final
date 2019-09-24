const amqp = require('amqplib/callback_api')

const elasticsearch = require('elasticsearch')
const lucene = require('node-lucene')


const rbbConfig = require('../config/rabbit.config.js')
const User = require('../models/user.model.js')
const kudosC = require('../controllers/kudos.controller.js')
const _self = this


// Create  
exports.create = async (req, res) => {
    const userBD = await User.findOne({ username: req.body.username })
    console.log(userBD)
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
        kudosC.user

        /* RABBIT */

        // INIT RABBIT
        amqp.connect(rbbConfig.url, function (error0, connection) {
            connection.createChannel(function (error1, channel) {
                channel.assertQueue('', {
                    exclusive: true
                }, (err, q) => {
                    if (err)
                        throw err
                    var correlationId = generateUuid()
                    var fuente = user.username
                    channel.consume(q.queue, (msg) => {
                        if (msg.properties.correlationId == correlationId) {
                        }
                    }, { noAck: true })
                    channel.sendToQueue(rbbConfig.queueCreateUser,
                        Buffer.from(fuente.toString()), {
                            correlationId: correlationId,
                            replyTo: q.queue
                        })
                })
            })
        })
        // END RABBIT


        /* END  */
        res.redirect('/kudos/')
    } else {
        console.log("+++++++++++ NO USUARIOS DEL MISMO NOMBRE ++++++++++++")
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
    // console.log(users)
    usersDB.forEach((u) => {
        let username = u.get('username')

        // /* ADD QTY */
        amqp.connect(rbbConfig.url, function (error0, connection) {
            connection.createChannel(function (error1, channel) {
                channel.assertQueue(rbbConfig.queueStats + username, {
                    durable: true
                })
                channel.prefetch(1)
                channel.consume(rbbConfig.queueStats + username, function reply(msg) {
                    var n = msg.content.toString()
                    console.log(n)
                    var r = addQty(username)
                    channel.sendToQueue(msg.properties.replyTo,
                        Buffer.from("OK"), {
                            correlationId: msg.properties.correlationId
                        })
                    channel.ack(msg)
                })

            })
        })
        // /** END QTY */
    })

    // console.log(users)
    usersDB.forEach((u) => {
        let username = u.get('username')

        // /* MISS QTY */
        amqp.connect(rbbConfig.url, function (error0, connection) {
            connection.createChannel(function (error1, channel) {
                channel.assertQueue(rbbConfig.queueStatsDis + username, {
                    durable: true
                })
                channel.prefetch(1)
                channel.consume(rbbConfig.queueStatsDis + username, function reply(msg) {
                    var n = msg.content.toString()
                    console.log(n)
                    var r = missQty(username)
                    channel.sendToQueue(msg.properties.replyTo,
                        Buffer.from("OK"), {
                            correlationId: msg.properties.correlationId
                        })
                    channel.ack(msg)
                })

            })
        })
        // /** END QTY */
    })

    await User.paginate({}, options, (err, result) => {
        if (!err) {
            let users = result.docs
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

exports.search = (req, res) => {
    res.send("ELASTIC")
}

exports.delete = async (req, res) => {
    const { _id } = req.params
    const userBD = await User.findById(_id)
    const eliminado = await userBD.delete()

    // INIT RABBIT
    amqp.connect(rbbConfig.url, function (error0, connection) {
        connection.createChannel(function (error1, channel) {
            channel.assertQueue('', {
                exclusive: true
            }, (err, q) => {
                if (err)
                    throw err
                var correlationId = generateUuid()
                var fuente = userBD.username
                channel.consume(q.queue, (msg) => {
                    if (msg.properties.correlationId == correlationId) {
                    }
                }, { noAck: true })
                channel.sendToQueue(rbbConfig.queueDeleteUser,
                    Buffer.from(fuente.toString()), {
                        correlationId: correlationId,
                        replyTo: q.queue
                    })
            })
        })
    })
    // END RABBIT

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
    console.log('ADD QTY')
}

function generateUuid() {
    return Math.random().toString() +
        Math.random().toString() +
        Math.random().toString();
}

