const express = require('express')
const path = require('path')
const morgan = require('morgan')
const bodyParser = require('body-parser')
const mongoose = require('mongoose')
const neo4j = require('neo4j-driver').v1
const neo4jDate = require('neo4j-driver').Date
const method = require('method-override')


const dbConfig = require('./src/config/database.config.js')

// INIT
const app = express()

// DATABASE

mongoose.connect(dbConfig.url, {
    useNewUrlParser: true,
    useUnifiedTopology: true
}).then(db => console.log('DB is connect'))
    .catch(err => console.error("DB ERROR; ", err));

// SETTINGS
app.set('port', process.env.PORT || 5003);

//VIEW ENGINE
app.set('views', path.join(__dirname, 'views'))
app.set('view engine', 'ejs')

// MIDDLEWARE
app.use(bodyParser.json())
app.use(morgan('dev'));
app.use(bodyParser.urlencoded({ extended: false }))
app.use(express.static(path.join(__dirname, 'public')))
app.use(method('method'));

// ROUTES
// app.get('/', (req, res) => {
//     session.run('MATCH (m:Movie {title:"Avengers"}) RETURN m')
//         .then((result) => {
//             var movies = []
//             result.records.forEach((record) => {
//                 //console.log(record._fields[0].properties)
//                 movies.push({

//                     //id: record._fields[0].properties.identy.low,
//                     title: record._fields[0].properties.title
//                 })
//                 //console.log(record._fields[0].properties)
//             })

//             session.run('MATCH (Person {name: "Cantinflas"}) RETURN Person')
//                 .then((result2) => {
//                     var actors = []
//                     result2.records.forEach((record) => {
//                         console.log(record._fields[0].properties)
//                         actors.push({
//                             name: record._fields[0].properties.name
//                         })

//                     })

//                     res.render('index', { actors, movies })
//                 })
//                 .catch((err) => {
//                     console.log(err)
//                 })

//         })


//         .catch((err) => {
//             console.log(err)
//         })
//     //res.send('It works')
// })

//app.post('/kudos/add', )

require('./src/routes/kudos.routes.js')(app)
require('./src/routes/user.routes.js')(app)

// INIT SERVER 
app.listen(app.get('port'), () => {
    console.log(`SERVER ON PORT ${app.get('port')}`);
})