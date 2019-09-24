
const _ = require('lodash');
const Influx = require('influxdb-nodejs');
const client = new Influx('http://127.0.0.1:8086/mydb');
const onHeaders = require('on-headers');

// set the http stats schema
client.schema('logger', {
    use: 'integer',
    code: 'integer',
    bytes: 'integer',
    url: 'string',
});
client.on('writeQueue', () => {
    // sync write queue if the length is 100
    if (client.writeQueueLength === 100) {
        client.syncWrite()
            .then(() => {
                console.info('sync write success');
            })
            .catch(console.error);
    }
});

function httpStats(req, res, next) {
    const start = Date.now();
    onHeaders(res, () => {
        const code = res.statusCode;
        const use = Date.now() - start;
        const method = req.method;
        const bytes = parseInt(res.get('Content-Length') || 0, 10);
        const tags = {
            spdy: _.sortedIndex([100, 300, 1000, 3000], use),
            type: code / 100 | 0,
            method,
        };
        const fields = {
            use,
            code,
            bytes,
            url: req.url,
            route: req.route.path
        };
        // use queue for better performance
        client.write('http')
            .tag(tags)
            .field(fields)
            .queue();
    });
    next();
}

client.createDatabase().catch(err => {
    console.error('create database fail err:', err);
});

app.use(httpStats);

app.use((req, res, next) => {
    setTimeout(next, _.random(0, 5000));
});

app.get('/users/me', (req, res) => {
    res.json({
        account: 'vicanso',
        name: 'Tree Xie',
    });
});

app.get('/book/:id', (req, res) => {
    const {
        id,
    } = req.params;
    res.json({
        id: id,
        name: 'my book',
        author: 'vicanso',
    });
});

app.get('/order/:id', (req, res) => {
    res.status(400).json({
        error: 'The id is not valid',
    });
});

app.get('/author/:id', (req, res) => {
    res.status(500).json({
        error: 'The database is disconnected',
    });
});

let server;
const finish = () => {
    console.info(`listen on http://127.0.0.1:${server.address().port}/`);
};
if (process.env.PORT) {
    server = app.listen(process.env.PORT, finish);
} else {
    server = app.listen(finish);
}