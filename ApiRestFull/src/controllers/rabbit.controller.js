const amqp = require('amqplib/callback_api')
const rbbConfig = require('../config/rabbit.config.js')
const Helper = require('../helpers/Helpers.js')

const Rabbit = {}

Rabbit.produceRPC = (parametro, cola, uid) => {

    amqp.connect(rbbConfig.url, function (error0, connection) {
        connection.createChannel(function (error1, channel) {
            channel.assertQueue('', {
                exclusive: true
            }, (err, q) => {
                if (err)
                    throw err

                var fuente = parametro
                channel.consume(q.queue, (msg) => {
                    if (msg.properties.correlationId == uid) {
                    }
                }, { noAck: true })
                channel.sendToQueue(cola,
                    Buffer.from(fuente.toString()), {
                        correlationId: uid,
                        replyTo: q.queue
                    })
            })
        })
    })
}


Rabbit.createUserRPC = (cola) => {
    amqp.connect(rbbConfig.url, function (error0, connection) {
        connection.createChannel(function (error1, channel) {
            channel.assertQueue(cola, {
                durable: true
            })
            channel.prefetch(1)
            channel.consume(cola, function reply(msg) {
                var n = msg.content.toString()
                var r = Helper.createUsuario(n)
                channel.sendToQueue(msg.properties.replyTo,
                    Buffer.from("OK"), {
                        correlationId: msg.properties.correlationId
                    })
                channel.ack(msg)
            })

        })
    })

}
Rabbit.deleUserRPC = (cola) => {
    amqp.connect(rbbConfig.url, function (error0, connection) {
        connection.createChannel(function (error1, channel) {
            channel.assertQueue(cola, {
                durable: true
            })
            channel.prefetch(1)
            channel.consume(cola, function reply(msg) {
                var n = msg.content.toString()
                console.log("ELIMINAR A: " + n)
                var r = Helper.deleteUser(n)
                channel.sendToQueue(msg.properties.replyTo,
                    Buffer.from("OK"), {
                        correlationId: msg.properties.correlationId
                    })
                channel.ack(msg)
            })
        })
    })
}

Rabbit.addRPC = (parametro, cola) => {
    amqp.connect(rbbConfig.url, function (error0, connection) {
        connection.createChannel(function (error1, channel) {
            channel.assertQueue(cola, {
                durable: true
            })
            channel.prefetch(1)
            channel.consume(cola, function reply(msg) {
                var n = msg.content.toString()
                console.log(n)
                var r = Helper.addQty(parametro)
                channel.sendToQueue(msg.properties.replyTo,
                    Buffer.from("OK"), {
                        correlationId: msg.properties.correlationId
                    })
                channel.ack(msg)
            })

        })
    })
}


Rabbit.discountRPC = (parametro, cola) => {
    amqp.connect(rbbConfig.url, function (error0, connection) {
        connection.createChannel(function (error1, channel) {
            channel.assertQueue(cola, {
                durable: true
            })
            channel.prefetch(1)
            channel.consume(cola, function reply(msg) {
                var n = msg.content.toString()
                console.log(n)
                var r = Helper.missQty(parametro)
                channel.sendToQueue(msg.properties.replyTo,
                    Buffer.from("OK"), {
                        correlationId: msg.properties.correlationId
                    })
                channel.ack(msg)
            })

        })
    })
}


module.exports = Rabbit