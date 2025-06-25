/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = async function (knex) {
    await knex.schema.createTable('favorite_places', (table) => {
        table.increments('id').primary();
        table.integer('user_id').unsigned().notNullable();
        table.string('place_id', 255).notNullable();
        table.timestamp('created_at').defaultTo(knex.fn.now());

        // Foreign keys
        table.foreign('user_id').references('id').inTable('users').onDelete('CASCADE');
        table.foreign('place_id').references('id').inTable('places').onDelete('CASCADE');

        // Unique constraint to prevent duplicates
        table.unique(['user_id', 'place_id']);
    });
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = async function (knex) {
    await knex.schema.dropTableIfExists('favorite_places');
};
