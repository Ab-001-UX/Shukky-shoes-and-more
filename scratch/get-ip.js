import os from 'os'

const nets = os.networkInterfaces()
const results = {}

for (const name of Object.keys(nets)) {
    for (const net of nets[name]) {
        // Skip over non-IPv4 and internal (i.e. 127.0.0.1) addresses
        // 'IPv4' is for node <= 17, 4 is for node >= 18
        const familyV4Value = typeof net.family === 'string' ? 'IPv4' : 4
        if (net.family === familyV4Value && !net.internal) {
            if (!results[name]) {
                results[name] = []
            }
            results[name].push(net.address)
        }
    }
}

console.log('Available network addresses for mobile access:')
console.log(JSON.stringify(results, null, 2))
