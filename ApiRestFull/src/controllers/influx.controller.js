
const InfluxLib = require('influxdb-nodejs')
const clientInflux = new InfluxLib('http://127.0.0.1:8086/BBDD_MONITOR')
const os = require('os')
const osUtils = require('os-utils')
const Influx = {}

Influx.insert = async (cpuVal, memoria, evento, detalle) => {
    let cpuDATA = Math.random() * 2000000;

    await clientInflux.write('ABC')
        .tag({
            evento,
        })
        .field({
            cpuDATA,
            memoria,
            evento,
            detalle
        })
        .queue()
    await clientInflux.syncWrite()
        .then(() => console.info('INSERT CORRECT!!!!'))
        .catch(err => console.error(`sync write queue fail, ${err.message}`))

}

async function cpuFunction(v) {
    return v
}


module.exports = Influx


