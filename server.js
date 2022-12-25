import { createServer } from 'http'

const PORT = 8888

createServer((_, res) => {
    res.writeHead(200, { 'Content-Type': 'text/plain' })
    res.write('Hello World!')
    res.end()
}).listen(PORT)

console.log(`Node.js web server at port ${PORT} is running...`)