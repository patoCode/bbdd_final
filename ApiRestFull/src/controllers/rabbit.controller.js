const amqp = require('amqplib/callback_api')
const rbbConfig = require('../config/rabbit.config.js')
const Helper = require('../helpers/Helpers.js')

const Rabbit = {}

Rabbit.anomina = (parametro, cola, uid) => {
    amqp.connect(rbbConfig.url, function (error0, connection) {
        connection.createChannel(function (error1, channel) {
            channel.assertQueue(cola, {
                durable: true
            })
            channel.sendToQueue(cola, Buffer.from(parametro))
        })
    })
}

Rabbit.produceRPC = (parametro, cola, uid) => {
    amqp.connect(rbbConfig.url, function (error0, connection) {
        if (error0) {
            console.log(error0)
            throw error0
        }
        connection.createChannel(function (error1, channel) {
            if (error1) {
                console.log(error1)
                throw error1
            }
            channel.assertQueue('', {
                exclusive: true
            }, (error2, q) => {
                if (error2) {
                    console.log(error2)
                    throw error2
                }
                var fuente = parametro
                console.log(' [x] Requesting Methodo (%d)', fuente);
                channel.consume(q.queue, (msg) => {
                    if (msg.properties.correlationId == uid) {
                        console.log(' [.] Got %s', msg.content.toString())
                    }
                }, {
                        noAck: true
                    })

                channel.sendToQueue(cola, Buffer.from(fuente), {
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
                durable: false
            })
            channel.prefetch(1)
            console.log(' [x] esperando createUserRPC')
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
                durable: false
            })
            channel.prefetch(1)
            console.log(' [x] esperando deleUserRPC')
            channel.consume(cola, function reply(msg) {
                var n = msg.content.toString()
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
        if (error0) {
            console.log(error0)
            throw error0
        }
        connection.createChannel(function (error1, channel) {
            if (error1) {
                console.log(error1)
                throw error1
            }
            channel.assertQueue(cola, {
                durable: false
            })
            channel.prefetch(1)
            console.log(' [x] esperando addRPC');
            channel.consume(cola, function reply(msg) {
                var parametro = msg.content.toString()

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
                durable: false
            })
            channel.prefetch(1)
            console.log(' [x] esperando discountRPC');
            channel.consume(cola, function reply(msg) {
                var parametro = msg.content.toString()
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