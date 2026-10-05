// config/reset.js
// Run this ONCE (and any time you change data/pokemon.js) with:
//
//     npm run reset
//
// It drops the table, rebuilds it, and re-inserts every Pokémon from
// data/pokemon.js. That file is no longer what the app reads — it is now
// just the seed source. The app reads the database.

import pool from "./database.js";
import pokemon from "../data/pokemon.js";

// --- 1. The schema -------------------------------------------------------
// Postgres convention is snake_case for column names, so `pokedexNumber`
// in JavaScript becomes `pokedex_number` here. index.js renames them back
// when it SELECTs, so none of your HTML templates have to change.
//
// TEXT[] is a Postgres array column. It stores ["fire","fighting"] as a real
// array, and the pg driver hands it back to JavaScript as a real array —
// so `p.types.map(...)` in your templates keeps working untouched.

const createTableQuery = `
  DROP TABLE IF EXISTS pokemon;

  CREATE TABLE pokemon (
    id              SERIAL PRIMARY KEY,
    slug            VARCHAR(50)  NOT NULL UNIQUE,
    name            VARCHAR(50)  NOT NULL,
    pokedex_number  INTEGER      NOT NULL,
    category        VARCHAR(100) NOT NULL,
    types           TEXT[]       NOT NULL,
    team_role       VARCHAR(100) NOT NULL,
    ability         VARCHAR(100) NOT NULL,
    signature_move  VARCHAR(100) NOT NULL,
    height          VARCHAR(20)  NOT NULL,
    weight          VARCHAR(20)  NOT NULL,
    description     TEXT         NOT NULL,
    image           TEXT         NOT NULL
  );
`;

async function createTable() {
  await pool.query(createTableQuery);
  console.log("🗃️  Table created");
}

// --- 2. The seed data ----------------------------------------------------
// $1, $2, $3... are placeholders. The driver sends the values separately
// from the query text, which is what makes this safe from SQL injection.
// NEVER build a query by gluing strings together with user input.

async function seedTable() {
  const insertQuery = `
    INSERT INTO pokemon
      (slug, name, pokedex_number, category, types,
       team_role, ability, signature_move, height, weight, description, image)
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
  `;

  for (const p of pokemon) {
    await pool.query(insertQuery, [
      p.slug,
      p.name,
      p.pokedexNumber,
      p.category,
      p.types,
      p.teamRole,
      p.ability,
      p.signatureMove,
      p.height,
      p.weight,
      p.description,
      p.image,
    ]);
    console.log(`   ✅ ${p.name}`);
  }
}

// --- 3. Run both, then close the connection ------------------------------

async function reset() {
  try {
    await createTable();
    await seedTable();
    console.log(`\n🎉 Seeded ${pokemon.length} Pokémon.`);
  } catch (error) {
    console.error("❌ Reset failed:", error.message);
  } finally {
    // Without this the script hangs forever with an open connection.
    await pool.end();
  }
}

reset();
