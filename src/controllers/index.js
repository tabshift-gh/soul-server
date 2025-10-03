const version = require('../../package.json').version

// Root endpoint
const root = async (req, res) => {
	/*
    #swagger.tags = ['Root']
    #swagger.summary = 'Timestamp'
    #swagger.description = 'Endpoint to return server timestamp'
  */

	res.json({
		message: 'Soul is running...',
		data: {
			version,
			timestamp: new Date().toISOString()
		}
	})
}

const health = async (req, res) => {
	/*
    #swagger.tags = ['Root']
    #swagger.summary = 'Health Check'
    #swagger.description = 'Endpoint to return server health status'
  */

	res.send('OK')
}

module.exports = {
	root,
	health
}
