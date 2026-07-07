const test = require("node:test");
const assert = require("node:assert/strict");

const {
  normalizeIngredientName,
  resolveOrCreateIngredientId
} = require("../../src/lib/ingredients");

test("normalizeIngredientName lowercases and trims ingredient names", () => {
  assert.equal(normalizeIngredientName("  Heavy Cream  "), "heavy cream");
});

test("normalizeIngredientName collapses punctuation and repeated whitespace", () => {
  assert.equal(
    normalizeIngredientName("Extra-virgin   olive oil!!!"),
    "extra virgin olive oil"
  );
});

test("normalizeIngredientName strips accents into a plain canonical form", () => {
  assert.equal(normalizeIngredientName("Crème fraîche"), "creme fraiche");
});

test("normalizeIngredientName returns an empty string for unsupported input", () => {
  assert.equal(normalizeIngredientName("..."), "");
  assert.equal(normalizeIngredientName(null), "");
});

test("resolveOrCreateIngredientId reuses an existing canonical ingredient row", async () => {
  const ingredientId = await resolveOrCreateIngredientId("  Garlic!! ", {
    from(tableName) {
      assert.equal(tableName, "ingredients");

      return {
        select(columns) {
          assert.equal(columns, "id");
          return {
            eq(columnName, value) {
              assert.equal(columnName, "name");
              assert.equal(value, "garlic");
              return {
                maybeSingle() {
                  return Promise.resolve({
                    data: { id: "ingredient-1" },
                    error: null
                  });
                }
              };
            }
          };
        }
      };
    }
  });

  assert.equal(ingredientId, "ingredient-1");
});

test("resolveOrCreateIngredientId creates a canonical ingredient row when missing", async () => {
  let insertWasCalled = false;
  const ingredientId = await resolveOrCreateIngredientId("Paprika", {
    from(tableName) {
      assert.equal(tableName, "ingredients");

      return {
        select(columns) {
          assert.equal(columns, "id");
          return {
            eq(columnName, value) {
              assert.equal(columnName, "name");
              assert.equal(value, "paprika");
              return {
                maybeSingle() {
                  return Promise.resolve({
                    data: null,
                    error: null
                  });
                }
              };
            }
          };
        },
        insert(row) {
          insertWasCalled = true;
          assert.deepEqual(row, {
            name: "paprika"
          });

          return {
            select(columns) {
              assert.equal(columns, "id");
              return {
                single() {
                  return Promise.resolve({
                    data: { id: "ingredient-2" },
                    error: null
                  });
                }
              };
            }
          };
        }
      };
    }
  });

  assert.equal(insertWasCalled, true);
  assert.equal(ingredientId, "ingredient-2");
});
