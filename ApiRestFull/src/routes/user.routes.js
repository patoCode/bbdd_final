module.exports = (app) => {
    const user = require('../controllers/user.controller.js');

    // Create
    app.post('/user/add', user.create)

    // Retrieve all
    app.get('/user/list', user.findAll)

    app.get('/user/:_id', user.findUser)

    app.delete('/user/:_id', user.delete)

    app.get('/search', user.search)
}