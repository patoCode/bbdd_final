const kudos = require('../controllers/kudos.controller.js');
const User = require('../models/user.model.js')

const neo4j = require('neo4j-driver').v1
const neo4jDate = require('neo4j-driver').Date

module.exports = (app) => {
    var driver = neo4j.driver('bolt://localhost:7687', neo4j.auth.basic('neo4j', '123'))
    var session = driver.session()

    app.get('/kudos/', async (req, res) => {
        kudos.user
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
                session.run('MATCH (e:User)-[:ENVIA]->(k:Kudos) , (k:Kudos)-[:RECIBE]->(r:User) RETURN e.nick, k.idKudos, k.fecha, k.tema, k.texto, r.nick ORDER BY k.fecha')
                    .then(async (kudosN4J) => {
                        var kudos = []

                        const userMongo = await User.find().sort({ username: -1 })

                        kudosN4J.records.map(record => {
                            kudos.push({
                                id: record.get("k.idKudos"),
                                tema: record.get("k.tema"),
                                envia: record.get("e.nick"),
                                recibe: record.get("r.nick")
                            })
                        });

                        res.render('index', { kudos, userMongo })
                    })
                    .catch((err) => {
                        console.log(err)
                    })
            })
            .catch((err) => {
                console.log(err)
            })



    })

    app.get('/kudos/user/del', kudos.deleteUserN4J)

    // Create
    app.post('/kudos/add', kudos.create)

    // Retrieve all
    app.get('/kudos/list', kudos.findAll)

    // Retrieve a single 
    app.get('/kudos/:kudosId', kudos.findOne)

    // Update
    app.post('/kudos/search', kudos.search)

    app.get('/search/kudos', kudos.searchView)

    // Delete
    app.post('/kudos/delete/:kudosId', kudos.delete)

    app.get('/user/kudos', kudos.user)
}