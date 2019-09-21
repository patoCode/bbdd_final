const express = require('express')
const morgan = require('morgan')
const bodyParser = require('body-parser')
const mongoose = require('mongoose')


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

// MIDDLEWARE
app.use(bodyParser.json())
app.use(morgan('dev'));
app.use(bodyParser.urlencoded({ extended: true }))


// ROUTES
app.get('/', (req, res) => {
    res.json({ "message": "FINAL BBDD" });
})

require('./src/routes/kudos.routes.js')(app)
require('./src/routes/user.routes.js')(app)

// INIT SERVER 
app.listen(app.get('port'), () => {
    console.log(`SERVER ON PORT ${app.get('port')}`);
})