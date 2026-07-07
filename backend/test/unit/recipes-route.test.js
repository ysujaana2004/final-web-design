const test = require("node:test");
const assert = require("node:assert/strict");

const { createRecipesRouter } = require("../../src/routes/recipes");

function getPostHandler(router) {
  const routeLayer = router.stack.find(
    (layer) => layer.route?.path === "/" && layer.route.methods?.post
  );

  assert.ok(routeLayer, "POST / route should exist");
  return routeLayer.route.stack[0].handle;
}

function createMockResponse() {
  return {
    body: null,
    statusCode: 200,
    json(payload) {
      this.body = payload;
      return this;
    },
    status(code) {
      this.statusCode = code;
      return this;
    }
  };
}

test("POST /api/recipes returns a generated recipe and cleans up temporary audio", async () => {
  const cleanupCalls = [];
  const saveCalls = [];
  const router = createRecipesRouter({
    cleanupDownloadedAudio: async (tempDirectory) => {
      cleanupCalls.push(tempDirectory);
    },
    downloadAudio: async (videoUrl) => ({
      filePath: "/tmp/audio.mp3",
      sourceUrl: `${videoUrl}?normalized=true`,
      tempDirectory: "/tmp/recipe-download"
    }),
    generateRecipeFromAudio: async () => ({
      title: "Garlic Toast",
      ingredients: ["Bread", "Butter", "Garlic"],
      instructions: ["Toast the bread.", "Spread the garlic butter."]
    }),
    saveGeneratedRecipe: async (payload) => {
      saveCalls.push(payload);
      return {
        id: "recipe-123"
      };
    }
  });
  const handler = getPostHandler(router);
  const response = createMockResponse();
  let nextWasCalled = false;

  await handler(
    {
      body: {
        videoUrl: "https://www.instagram.com/reel/test/",
        user_id: "user-123"
      }
    },
    response,
    () => {
      nextWasCalled = true;
    }
  );

  assert.equal(response.statusCode, 201);
  assert.deepEqual(response.body, {
    sourceUrl: "https://www.instagram.com/reel/test/?normalized=true",
    recipe: {
      title: "Garlic Toast",
      ingredients: ["Bread", "Butter", "Garlic"],
      instructions: ["Toast the bread.", "Spread the garlic butter."]
    },
    recipeId: "recipe-123"
  });
  assert.equal(nextWasCalled, false);
  assert.deepEqual(cleanupCalls, ["/tmp/recipe-download"]);
  assert.deepEqual(saveCalls, [
    {
      sourceUrl: "https://www.instagram.com/reel/test/?normalized=true",
      recipe: {
        title: "Garlic Toast",
        ingredients: ["Bread", "Butter", "Garlic"],
        instructions: ["Toast the bread.", "Spread the garlic butter."]
      },
      userId: "user-123"
    }
  ]);
});

test("POST /api/recipes rejects requests without a videoUrl", async () => {
  let downloadWasCalled = false;
  const router = createRecipesRouter({
    downloadAudio: async () => {
      downloadWasCalled = true;
      throw new Error("download should not run");
    }
  });
  const handler = getPostHandler(router);
  const response = createMockResponse();

  await handler(
    {
      body: {}
    },
    response,
    () => {}
  );

  assert.equal(response.statusCode, 400);
  assert.deepEqual(response.body, {
    error: 'A non-empty "videoUrl" string is required.'
  });
  assert.equal(downloadWasCalled, false);
});

test("POST /api/recipes rejects requests without a user", async () => {
  let downloadWasCalled = false;
  const router = createRecipesRouter({
    downloadAudio: async () => {
      downloadWasCalled = true;
      throw new Error("download should not run");
    }
  });
  const handler = getPostHandler(router);
  const response = createMockResponse();

  await handler(
    {
      body: {
        videoUrl: "https://www.instagram.com/reel/test/"
      }
    },
    response,
    () => {}
  );

  assert.equal(response.statusCode, 400);
  assert.deepEqual(response.body, {
    error: 'A "user_id" is required unless DEV_TEST_USER_ID is configured.'
  });
  assert.equal(downloadWasCalled, false);
});

test("POST /api/recipes cleans up temporary audio when Gemini fails", async () => {
  const cleanupCalls = [];
  const router = createRecipesRouter({
    cleanupDownloadedAudio: async (tempDirectory) => {
      cleanupCalls.push(tempDirectory);
    },
    downloadAudio: async () => ({
      filePath: "/tmp/audio.mp3",
      sourceUrl: "https://www.tiktok.com/@cook/video/123",
      tempDirectory: "/tmp/recipe-download"
    }),
    generateRecipeFromAudio: async () => {
      throw new Error("Gemini is temporarily unavailable.");
    }
  });
  const handler = getPostHandler(router);
  const response = createMockResponse();
  const nextCalls = [];

  await handler(
    {
      body: {
        videoUrl: "https://www.tiktok.com/@cook/video/123",
        user_id: "user-123"
      }
    },
    response,
    (error) => {
      nextCalls.push(error);
    }
  );

  assert.equal(response.body, null);
  assert.equal(nextCalls.length, 1);
  assert.equal(nextCalls[0].message, "Gemini is temporarily unavailable.");
  assert.deepEqual(cleanupCalls, ["/tmp/recipe-download"]);
});

test("POST /api/recipes cleans up temporary audio when recipe saving fails", async () => {
  const cleanupCalls = [];
  const router = createRecipesRouter({
    cleanupDownloadedAudio: async (tempDirectory) => {
      cleanupCalls.push(tempDirectory);
    },
    downloadAudio: async () => ({
      filePath: "/tmp/audio.mp3",
      sourceUrl: "https://www.instagram.com/reel/test/",
      tempDirectory: "/tmp/recipe-download"
    }),
    generateRecipeFromAudio: async () => ({
      title: "Garlic Toast",
      ingredients: ["Bread", "Butter", "Garlic"],
      instructions: ["Toast the bread.", "Spread the garlic butter."]
    }),
    saveGeneratedRecipe: async () => {
      throw new Error("Recipe insert failed.");
    }
  });
  const handler = getPostHandler(router);
  const response = createMockResponse();
  const nextCalls = [];

  await handler(
    {
      body: {
        videoUrl: "https://www.instagram.com/reel/test/",
        user_id: "user-123"
      }
    },
    response,
    (error) => {
      nextCalls.push(error);
    }
  );

  assert.equal(response.body, null);
  assert.equal(nextCalls.length, 1);
  assert.equal(nextCalls[0].message, "Recipe insert failed.");
  assert.deepEqual(cleanupCalls, ["/tmp/recipe-download"]);
});
