const User = require('../models/user.model.js')
const neo4j = require('neo4j-driver').v1
const osUtils = require('os-utils')
const os = require('os')

const Influx = require('../controllers/influx.controller')
const Helper = {}

Helper.createUsuario = (username) => {
    var driver = neo4j.driver('bolt://localhost:7687', neo4j.auth.basic('neo4j', '123'))
    var session = driver.session()

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
    session.run('CREATE (a:User {name:{nickParam}, nick: {nickParam}, fecha:{dateParam}}) RETURN a.nick', { nickParam: name, dateParam: fecha })
        .then(async (result) => {
            console.log("CREADO EN NEO4J")
            await Influx.insert(osUtils.cpuUsage((v) => {
                return v
            }), os.freemem(), 'CREATE-N4J-USER', 'N4J - Creado el usuario ' + name)
        })
        .catch(async (err) => {
            console.log(err)
            await Influx.insert(osUtils.cpuUsage((v) => {
                return v
            }), os.freemem(), 'ERROR', 'N4J - Al crear usuario ' + name)
        })
}

Helper.deleteUser = (username) => {
    var driver = neo4j.driver('bolt://localhost:7687', neo4j.auth.basic('neo4j', '123'))
    var session = driver.session()
    session.run('MATCH (n:User {nick:{nickParam}}) DETACH DELETE n', { nickParam: username })
        .then(async (result) => {
            console.log("Eliminado EN Neo4J")
            await Influx.insert(osUtils.cpuUsage((v) => {
                return v
            }), os.freemem(), 'DELETE-N4J-USER', 'N4J - Eliminar al usuario ' + username)
        })
        .catch(async (err) => {
            console.log(err, 'el usuario no existe')
            await Influx.insert(osUtils.cpuUsage((v) => {
                return v
            }), os.freemem(), 'ERROR', 'N4J - Al eliminar el usuario ' + username)

        })

}

Helper.generateUuid = async () => {
    return await (Math.random().toString() +
        Math.random().toString() +
        Math.random().toString())
}


Helper.addQty = async (name) => {
    const userBD = await User.findOne({ username: name })
    if (userBD) {
        userBD.qty = userBD.qty + 1
        await Influx.insert(osUtils.cpuUsage((v) => {
            return v
        }), os.freemem(), 'ADD', 'SUMAR KUDOS A ' + name)
        await userBD.save()

    } else {
        res.status(500).json({ error: 'Internal Error' })
    }
}

Helper.missQty = async (name) => {
    const userBD = await User.findOne({ username: name })

    if (userBD) {
        if (parseInt(userBD.qty) > 0) {
            userBD.qty = userBD.qty - 1
            await Influx.insert(osUtils.cpuUsage((v) => {
                return v
            }), os.freemem(), 'SUBSTRACT', 'RESTAR KUDOS A ' + name)
        }
        await userBD.save()
    } else {
        res.status(500).json({ error: 'Internal Error' })
    }

}

module.exports = Helper