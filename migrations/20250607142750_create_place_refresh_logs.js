// 20250607183000_create_place_refresh_logs.js

exports.up = function (knex) {
  return knex.schema.createTable("place_refresh_logs", function (table) {
    table.increments("id").primary();

    // Timestamps
    table.timestamp("started_at").notNullable().defaultTo(knex.fn.now());
    table.timestamp("ended_at");

    // Insert/Update/Error tracking
    table.integer("places_inserted").notNullable().defaultTo(0);
    table.integer("places_updated").notNullable().defaultTo(0);
    table.integer("places_failed").notNullable().defaultTo(0);

    // Status of the operation
    table.string("status", 50).notNullable(); // e.g., 'in_progress', 'success', 'error'

    // Optional error message if something failed
    table.jsonb("error_messages");

    // Optional: index for querying recent logs quickly
    table.index(["started_at"], "idx_place_refresh_logs_started_at");
    table.index(["status"], "idx_place_refresh_logs_status");
  });
};

exports.down = function (knex) {
  return knex.schema.dropTable("place_refresh_logs");
};
