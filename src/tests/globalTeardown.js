const { dropTestDatabase } = require(".");

const globalTearDown = async () => {
	console.log("Test suite finished");
	console.log("Dropping test database...");
	await dropTestDatabase();
};

module.exports = globalTearDown;
