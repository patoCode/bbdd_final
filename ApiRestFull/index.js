const express = require('express')
const path = require('path')
const morgan = require('morgan')
const bodyParser = require('body-parser')
const mongoose = require('mongoose')
const neo4j = require('neo4j-driver').v1
const neo4jDate = require('neo4j-driver').Date
const method = require('method-override')
const solr = require('solr-node')
const influx = require('influxdb-nodejs')

const elastic = require('@elastic/elasticsearch')


//var people = require('./people.json')


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

var client = new elastic.Client({
    node: 'http://localhost:9200'
})


/** */
async function run() {
    // Let's start by indexing some data
    // await client.index({
    //     index: 'denis',
    //     // type: '_doc', // uncomment this line if you are using Elasticsearch ≤ 6
    //     body: {
    //         character: 'Ned Stark',
    //         quote: 'Winter is coming.'
    //     }
    // })

    // await client.index({
    //     index: 'game-of-thrones',
    //     // type: '_doc', // uncomment this line if you are using Elasticsearch ≤ 6
    //     body: {
    //         character: 'Daenerys Targaryen',
    //         quote: 'I am the blood of the dragon.'
    //     }
    // })

    // await client.index({
    //     index: 'game-of-thrones',
    //     // type: '_doc', // uncomment this line if you are using Elasticsearch ≤ 6
    //     body: {
    //         character: 'Tyrion Lannister',
    //         quote: 'A mind needs books like a sword needs a whetstone.'
    //     }
    // })
    // await client.index({
    //     index: 'denis',
    //     // type: '_doc', // uncomment this line if you are using Elasticsearch ≤ 6
    //     body: {
    //         character: 'Goku Lannister',
    //         quote: 'A mind needs winther yamcha a sword needs a whetstone.'
    //     }
    // })

    // // here we are forcing an index refresh, otherwise we will not
    // // get any result in the consequent search
    await client.indices.refresh({ index: 'game-of-thrones' })

    // Let's search!
    const { body } = await client.search({
        index: 'game-of-thrones',
        // type: '_doc', // uncomment this line if you are using Elasticsearch ≤ 6
        body: {
            query: {
                fuzzy: { character: 'Tierion' }
            }
        }
    })

    console.log(body.hits.hits)
}
run().catch(console.log)

/** */
app.get('/', (req, res) => {
    res.send('Its works!!!')
})
require('./src/routes/kudos.routes.js')(app)
require('./src/routes/user.routes.js')(app)

// INIT SERVER 
app.listen(app.get('port'), () => {
    console.log(`SERVER ON PORT ${app.get('port')}`);
})