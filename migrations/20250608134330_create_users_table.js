/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = function (knex) {
    return knex.schema.dropTableIfExists("users").then(() => {
        return knex.schema.createTable("users", function (table) {
            table.increments("id").primary();

            table.string("fullName").nullable();
            table.string("email").nullable().unique();
            table.string("phoneNumber").nullable();
            table.string("city").nullable();
            table.string("area").nullable();
            table.text("bio").nullable();
            table.string("profileImage").nullable();
            table.boolean("isVerified").defaultTo(false);

            table.timestamps(true, true); // adds created_at and updated_at
        });
    });
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = function (knex) {
    return knex.schema.dropTableIfExists("users");
};
