const amqp = require('amqplib/callback_api')
const Request = require("request")
const Kudos = require('../controllers/kudos.controller.js');
const rbbConfig = require('../config/rabbit.config.js')
//const extConfig = require('../../config/external.config.js')

module.exports = (app) => {
    // UPDATE
    app.get('/stats/remove', (req, res) => {
        amqp.connect(rbbConfig.url, function (error0, connection) {
            connection.createChannel(function (error1, channel) {
                channel.assertQueue(rbbConfig.queueStatsDel, {
                    durable: true
                })
                channel.prefetch(1)
                channel.consume(rbbConfig.queueStatsDel, function reply(msg) {
                    var n = msg.content.toString()
                    console.log(" [.] Disminuira LA QTY DE ", n)
                    var r = discountKudos(n)
                    channel.sendToQueue(msg.properties.replyTo,
                        Buffer.from("OK"), {
                            correlationId: msg.properties.correlationId
                        })
                    channel.ack(msg)
                })

            })
        })
        // RABBIT END
        res.send("DELETE KUDOS")
    })

    // REMOVE
    app.get('/stats/add', (req, res) => {
        // RABBIT INIT
        amqp.connect(rbbConfig.url, function (error0, connection) {
            connection.createChannel(function (error1, channel) {
                channel.assertQueue(rbbConfig.queueStats, {
                    durable: true
                })
                channel.prefetch(1)
                channel.consume(rbbConfig.queueStats, function reply(msg) {
                    var n = msg.content.toString()
                    var r = addKudos(n)
                    channel.sendToQueue(msg.properties.replyTo,
                        Buffer.from("OK"), {
                            correlationId: msg.properties.correlationId
                        })
                    channel.ack(msg)
                })

            })
        })
        // RABBIT END

        // RABBIT INIT
        amqp.connect(rbbConfig.url, function (error0, connection) {
            connection.createChannel(function (error1, channel) {
                channel.assertQueue(rbbConfig.queueDelUser, {
                    durable: true
                })
                channel.prefetch(1)
                //console.log('[X] esperando RPC ')
                channel.consume(rbbConfig.queueDelUser, function reply(msg) {
                    var n = msg.content.toString()
                    var r = Kudos.deleteMasive(n)
                    channel.sendToQueue(msg.properties.replyTo,
                        Buffer.from("OK"), {
                            correlationId: msg.properties.correlationId
                        })
                    channel.ack(msg)
                })

            })
        })
        // RABBIT END
        res.send("ADD KUDOS")
    })

    function addKudos(n) {
        Request.get(extConfig.url + extConfig.add + n, (error, response, body) => {
            console.log(body)
        })
    }
    function discountKudos(n) {
        Request.get(extConfig.url + extConfig.discount + n, (error, response, body) => {
            console.log(body)
        })
    }
}
