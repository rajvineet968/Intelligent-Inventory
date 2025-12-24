const pool = require("./mysql");

async function test() {
    const [rows] = await pool.query("SELECT 1 + 1 AS result");
    console.log(rows);
    process.exit();
}

test();
