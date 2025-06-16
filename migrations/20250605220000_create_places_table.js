exports.up = async function (knex) {
  // Enable PostGIS extension
  await knex.raw(`CREATE EXTENSION IF NOT EXISTS postgis`);

  return knex.schema.createTable("places", function (table) {
    // Primary Key
    table.string("id", 255).primary();

    // Basic Information
    table.string("name", 255).notNullable();
    table.string("national_phone_number", 50);
    table.string("international_phone_number", 50);
    table.string("formatted_address", 500).notNullable();
    table.string("short_formatted_address", 255);
    table.string("website_uri", 500);
    table.string("maps_uri", 500); // fixed casing
    table.float("rating");
    table.integer("user_rating_count");
    table.string("price_level", 50);
    table.string("business_status", 50);
    table.string("primary_type_display_name", 100);
    table.text("editorial_summary_text");
    table.string("editorial_summary_language_code", 10);
    table.text("generative_summary_overview_text");
    table.string("generative_summary_overview_language_code", 10);
    table.text("review_summary_text");
    table.string("review_summary_language_code", 10);
    table.string("time_zone_id", 100);

    // Location
    table.decimal("latitude", 10, 7);
    table.decimal("longitude", 10, 7);
    table.jsonb("viewport");
    table.string("plus_code_global_code", 20);
    table.string("plus_code_compound_code", 255);

    // Address Components
    table.jsonb("address_components");

    // Features/Services
    table.boolean("open_now");
    table.boolean("takeout");
    table.boolean("delivery");
    table.boolean("dine_in");
    table.boolean("curbside_pickup");
    table.boolean("reservable");
    table.boolean("serves_breakfast");
    table.boolean("serves_lunch");
    table.boolean("serves_dinner");
    table.boolean("serves_beer");
    table.boolean("serves_wine");
    table.boolean("serves_brunch");
    table.boolean("serves_vegetarian_food");
    table.boolean("outdoor_seating");
    table.boolean("live_music");
    table.boolean("menu_for_children");
    table.boolean("serves_cocktails");
    table.boolean("serves_dessert");
    table.boolean("serves_coffee");
    table.boolean("good_for_children");
    table.boolean("allows_dogs");
    table.boolean("restroom");
    table.boolean("good_for_groups");
    table.boolean("good_for_watching_sports");

    // Additional JSONB fields
    table.jsonb("payment_options");
    table.jsonb("parking_options");
    table.jsonb("accessibility_options");
    table.jsonb("regular_opening_hours");
    table.jsonb("current_opening_hours");
    table.jsonb("regular_secondary_opening_hours");
    table.jsonb("current_secondary_opening_hours");
    table.jsonb("types");
    table.jsonb("reviews");
    table.jsonb("photos");
    table.jsonb("price_range");
    table.jsonb("containing_places");
    table.jsonb("address_descriptor");
    table.jsonb("maps_links");

    // Spatial Point column (PostGIS)
    table.specificType("location_geo", "GEOGRAPHY(Point, 4326)"); // Use GEOGRAPHY for Earth distances

    // Indexes
    table.index(["latitude", "longitude"]);
    table.index("name");
    table.index("primary_type_display_name");
    table.index("rating");
    table.index("price_level");
    table.index("business_status");

    // GIN Indexes
    table.index("types", null, "GIN");
    table.index("address_components", null, "GIN");
    table.index("regular_opening_hours", null, "GIN");

    // GIST Index for PostGIS geometry point
    table.index("location_geo", null, "GIST");
  });
};

exports.down = function (knex) {
  return knex.schema.dropTable("places");
};
