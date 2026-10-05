
import express from "express";
import path from "path";
import { fileURLToPath } from "url";
import pool from "./config/database.js"; // ← was: import pokemon from "./data/pokemon.js"

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const app = express();
const PORT = 3000;

// Serve static files (custom.css) from /public
app.use(express.static(path.join(__dirname, "public")));

/* ------------------------------ Database -------------------------------- */


const FIELDS = `
  slug,
  name,
  pokedex_number  AS "pokedexNumber",
  category,
  types,
  team_role       AS "teamRole",
  ability,
  signature_move  AS "signatureMove",
  height,
  weight,
  description,
  image
`;

/* ----------------------------- HTML helpers ----------------------------- */

// Shared page shell. Picocss comes in via CDN; custom.css layers on top.
function layout(title, body) {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${title}</title>
  <link
    rel="stylesheet"
    href="https://cdn.jsdelivr.net/npm/@picocss/pico@2/css/pico.min.css"
  />
  <link rel="stylesheet" href="/custom.css" />
</head>
<body>
  <main class="container">
    ${body}
  </main>
  <footer class="site-footer container">
    <small>Pokédex: Elite Four Edition</small>
  </footer>
</body>
</html>`;
}

// A row of colored type badges for a given Pokémon.
function typeBadges(types) {
  return `<div class="type-badges">
    ${types
      .map(
        (t) =>
          `<span class="type-badge" style="background: var(--type-${t})">${t}</span>`
      )
      .join("")}
  </div>`;
}

// One card on the home page. The whole card is a link to the detail page.
function card(p) {
  const accent = `var(--type-${p.types[0]})`;
  return `<a class="poke-card" href="/pokemon/${p.slug}" style="--card-accent: ${accent}">
    <span class="role-eyebrow">${p.teamRole}</span>
    <img src="${p.image}" alt="${p.name}" />
    <p class="dex-no">#${String(p.pokedexNumber).padStart(3, "0")}</p>
    <h3>${p.name}</h3>
    <p>${p.category}</p>
    ${typeBadges(p.types)}
  </a>`;
}

// Stretch feature: the type filter form.
function filterForm(allTypes, selected) {
  const options = allTypes
    .map(
      (t) =>
        `<option value="${t}" ${t === selected ? "selected" : ""}>${t}</option>`
    )
    .join("");

  return `<form class="filter-form" method="GET" action="/">
    <label for="type">Filter by type</label>
    <select id="type" name="type">
      <option value="">All types</option>
      ${options}
    </select>
    <button type="submit">Search</button>
    ${selected ? `<a href="/" role="button" class="secondary">Clear</a>` : ""}
  </form>`;
}

/* -------------------------------- Routes -------------------------------- */

// Home page: title + the team displayed as cards (stretch feature)
// Now `async` because talking to a database takes time.
app.get("/", async (req, res) => {
  try {
    const selectedType = req.query.type || "";

    // Build the list of types for the dropdown.
    // unnest() flattens the TEXT[] array column into one row per value.
    const typesResult = await pool.query(
      `SELECT DISTINCT unnest(types) AS type FROM pokemon ORDER BY type`
    );
    const allTypes = typesResult.rows.map((r) => r.type);

    // $1 = ANY(types) asks "is this value inside the array column?"
    const result = selectedType
      ? await pool.query(
          `SELECT ${FIELDS} FROM pokemon WHERE $1 = ANY(types) ORDER BY pokedex_number`,
          [selectedType]
        )
      : await pool.query(
          `SELECT ${FIELDS} FROM pokemon ORDER BY pokedex_number`
        );

    const cards = result.rows.map(card).join("");

    const body = `
    <header>
      <hgroup>
        <h1>The Team to Beat the Elite Four</h1>
        <p>Six Pokémon, one run at the Champion. Click any card for the full breakdown.</p>
      </hgroup>
    </header>
    ${filterForm(allTypes, selectedType)}
    <section class="team-grid">
      ${cards || "<p>No Pokémon match that type.</p>"}
    </section>`;

    res.send(layout("Pokédex: Elite Four Edition", body));
  } catch (error) {
    console.error(error);
    res.status(500).send(
      layout(
        "Error",
        `<h1>Database error</h1><p>Could not load the team. Is DATABASE_URL set correctly?</p>`
      )
    );
  }
});

// Detail page: unique endpoint per Pokémon, shows ALL fields
app.get("/pokemon/:slug", async (req, res, next) => {
  try {
    // $1 is a parameter placeholder. The slug from the URL is sent to
    // Postgres separately from the query text, so a malicious slug can't
    // inject SQL. This is the single most important habit in this project.
    const result = await pool.query(
      `SELECT ${FIELDS} FROM pokemon WHERE slug = $1`,
      [req.params.slug]
    );

    if (result.rows.length === 0) return next(); // no match -> 404 handler

    const p = result.rows[0];
    const accent = `var(--type-${p.types[0]})`;

    const body = `
    <a class="back-link" href="/">&larr; Back to the team</a>
    <article>
      <div class="detail-hero">
        <img src="${p.image}" alt="${p.name}" />
        <div>
          <span class="role-eyebrow" style="color: ${accent}">${p.teamRole}</span>
          <h1>${p.name}</h1>
          <p class="dex-no">#${String(p.pokedexNumber).padStart(3, "0")} &middot; ${p.category}</p>
          ${typeBadges(p.types)}
        </div>
      </div>

      <p>${p.description}</p>

      <table>
        <tbody>
          <tr><th scope="row">Pokédex №</th><td>#${String(p.pokedexNumber).padStart(3, "0")}</td></tr>
          <tr><th scope="row">Category</th><td>${p.category}</td></tr>
          <tr><th scope="row">Type</th><td>${p.types.join(", ")}</td></tr>
          <tr><th scope="row">Team role</th><td>${p.teamRole}</td></tr>
          <tr><th scope="row">Ability</th><td>${p.ability}</td></tr>
          <tr><th scope="row">Signature move</th><td>${p.signatureMove}</td></tr>
          <tr><th scope="row">Height</th><td>${p.height}</td></tr>
          <tr><th scope="row">Weight</th><td>${p.weight}</td></tr>
        </tbody>
      </table>
    </article>`;

    res.send(layout(`${p.name} — Pokédex`, body));
  } catch (error) {
    console.error(error);
    next();
  }
});

// 404 handler: runs when no route above matched
app.use((req, res) => {
  const body = `
    <header>
      <hgroup>
        <h1>404 — Pokémon not found</h1>
        <p>That route isn't on the roster. It may have fainted.</p>
      </hgroup>
    </header>
    <a class="back-link" href="/">&larr; Back to the team</a>`;
  res.status(404).send(layout("404 — Not Found", body));
});

app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});
