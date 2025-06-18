exports.up = function (knex) {
  return knex.schema.createTable("occupancy_data", function (table) {
    table.increments("id").primary(); // Auto-incrementing primary key

    table
      .string("places_google_place_id", 255)
      .notNullable()
      .references("id")
      .inTable("places")
      .onDelete("CASCADE");

    table.timestamp("timestamp", { useTz: true }).notNullable();

    table.string("occupancy_level", 50); // e.g., 'low', 'medium', 'high'
    table.float("occupancy_percentage").unsigned().nullable(); // 0 to 100, nullable if not available
    table.string("source", 100); // e.g., 'admin_manual_entry', 'sensor_data', 'api_feed'

    table.timestamps(true, true);

    table.index("places_google_place_id", "idx_occupancy_venue_id");
    table.index(
      ["places_google_place_id", "timestamp"],
      "idx_occupancy_venue_timestamp"
    );
  });
};

exports.down = function (knex) {
  return knex.schema.dropTable("occupancy_data");
};
