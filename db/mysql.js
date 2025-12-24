// db/mysql.js
require("dotenv").config(); // <-- ALWAYS load from root

const mysql = require("mysql2/promise");

const pool = mysql.createPool({
    host: process.env.MYSQL_HOST || "localhost",
    user: process.env.MYSQL_USER || "root",
    password: process.env.MYSQL_PASSWORD, // ❗ DO NOT default to ""
    database: process.env.MYSQL_DB || "inventory_sql",
    waitForConnections: true,
    connectionLimit: 10
});

module.exports = pool;
