#! /usr/bin/env node

const express = require('express')
const bodyParser = require('body-parser')
const winston = require('winston')
const expressWinston = require('express-winston')
const cors = require('cors')
const rateLimit = require('express-rate-limit')
const swaggerUi = require('swagger-ui-express')
const cookieParser = require('cookie-parser')

const config = require('./config/index')
const db = require('./db/index')

const rootRoutes = require('./routes/index')
const tablesRoutes = require('./routes/tables')
const rowsRoutes = require('./routes/rows')
const authRoutes = require('./routes/auth')

const swaggerFile = require('./swagger/swagger.json')
const { setupExtensions } = require('./extensions')
const {
	createDefaultTables,
	createInitialUser,
	removeRevokedRefreshTokens,
	checkAuthConfigs
} = require('./controllers/auth')

const { runCLICommands } = require('./commands')
const { authConstants } = require('./constants')

const app = express()

app.use(bodyParser.json())
app.use(cookieParser())

// Activate wal mode
db.exec('PRAGMA journal_mode = WAL')

// Enable CORS
let corsOrigin = config.cors.origin

if (corsOrigin.includes('*')) {
	corsOrigin = '*'
}

const corsOptions = {
	origin: corsOrigin,
	credentials: true,
	allowedHeaders: ['Content-Type', 'Authorization']
}

app.use(cors(corsOptions))

// Log requests
if (config.verbose !== null) {
	app.use(
		expressWinston.logger({
			transports: [new winston.transports.Console()],
			format: winston.format.combine(
				winston.format.colorize(),

				winston.format.json()
			),
			meta: false,
			msg: 'HTTP {{req.method}} {{req.url}}',
			expressFormat: true,

			colorize: false
		})
	)
}

if (config.rateLimit.enabled) {
	const limiter = rateLimit({
		windowMs: config.rateLimit.windowMs,
		max: config.rateLimit.max, // Limit each IP to {max} requests per `window`
		standardHeaders: true, // Return rate limit info in the `RateLimit*` headers
		legacyHeaders: false // Disable the `XRateLimit*` headers
	})

	// Apply the rate limiting middleware to all requests
	app.use(limiter)
}

// If Auth mode is activated but if the tokenSecret value is undefined then throw an error
checkAuthConfigs({ auth: config.auth, tokenSecret: config.tokenSecret })

// If Auth mode is activated then create auth tables in the DB & create a super user if there are no users in the DB
if (config.auth) {
	createDefaultTables()
	createInitialUser()
} else {
	console.warn(
		'Warning: Soul is running in open mode without authentication or authorization for API endpoints. Please be aware that your API endpoints will not be secure.'
	)
}

// remove revoked refresh tokens every X days
setInterval(removeRevokedRefreshTokens, authConstants.REVOKED_REFRESH_TOKENS_REMOVAL_TIME_RANGE)

// If the user has passed custom CLI commands run the command and exit to avoid running the server
runCLICommands()

app.use('/api/docs', swaggerUi.serve, swaggerUi.setup(swaggerFile))
app.use('/api', rootRoutes)
app.use('/api/tables', tablesRoutes)
app.use('/api/tables', rowsRoutes)

app.use('/api/auth', authRoutes)

setupExtensions(app, db)

module.exports = app
