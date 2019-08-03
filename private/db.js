const mysql = require('mysql')

const connection = mysql.createConnection({
	host: '127.0.0.1',
	user: 'root',
	password: 'xvzk7788ooo',
	database: 'hypertube',
	port: '3306'
});
connection.connect()

module.exports = connection
