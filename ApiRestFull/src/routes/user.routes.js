module.exports = (app) => {
    const user = require('../controllers/user.controller.js');

    // Create
    app.post('/user/add', user.create)

    // Retrieve all
    app.get('/user/list', user.findAll)

    app.get('/user/:_id', user.findUser)

    app.post('/user/delete/:_id', user.delete)

    app.post('/user/search', user.search)
}