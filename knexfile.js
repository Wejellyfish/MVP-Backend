
// // Update with your config settings.

// /**
//  * @type { Object.<string, import("knex").Knex.Config> }
//  */
// module.exports = {

//   development: {
//     client: 'sqlite3',
//     connection: {
//       filename: './dev.sqlite3'
//     }
//   },

//   staging: {
//     client: 'postgresql',
//     connection: {
//       database: 'my_db',
//       user:     'username',
//       password: 'password'
//     },
//     pool: {
//       min: 2,
//       max: 10
//     },
//     migrations: {
//       tableName: 'knex_migrations'
//     }
//   },

//   production: {
//     client: 'postgresql',
//     connection: {
//       database: 'my_db',
//       user:     'username',
//       password: 'password'
//     },
//     pool: {
//       min: 2,
//       max: 10
//     },
//     migrations: {
//       tableName: 'knex_migrations'
//     }
//   }

// };


// // devlopment mode
// require("dotenv").config();

// module.exports = {
//   development: {
//     client: "pg",
//     connection: {
//       host: process.env.DB_HOST,
//       user: process.env.DB_USER,
//       password: process.env.DB_PASS,
//       database: process.env.DB_NAME,
//     },
//     migrations: {
//       directory: "./src/db/migrations",
//     },
//     seeds: {
//       directory: "./src/db/seeds",
//     },
//   },
// };

require("dotenv").config();

module.exports = {
    development: {
        client: "pg",
        connection: {
            host: process.env.DB_HOST || "localhost",
            user: process.env.DB_USER || "postgres",
            password: process.env.DB_PASS || "299792458m/S",
            database: process.env.DB_NAME || "test1",
        },
        migrations: {
            directory: "./migrations",
        },
    },
};