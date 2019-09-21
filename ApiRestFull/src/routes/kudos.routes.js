module.exports = (app) => {
    const kudos = require('../controllers/kudos.controller.js');

    // Create
    app.post('/kudos', kudos.create);

    // Retrieve all
    app.get('/list', kudos.findAll);

    // Retrieve a single 
    app.get('/kudos/:kudosId', kudos.findOne);

    // Update
    app.put('/kudos/:kudosId', kudos.update);

    // Delete
    app.delete('/kudos/:_id', kudos.delete)
}