const { createServer } = require('http')
const next = require('next')

const dev = false
const hostname = 'localhost'
const port = process.env.PORT || 3000

const app = next({ 
  dev, 
  hostname, 
  port, 
  dir: __dirname,
  customServer: true
})
const handle = app.getRequestHandler()

app.prepare().then(() => {
  createServer(async (req, res) => {
    try {
      await handle(req, res)
    } catch (err) {
      console.error('Error:', err)
      res.statusCode = 500
      res.end('internal server error')
    }
  }).listen(port, () => console.log('Ready on http://localhost:' + port))
})
