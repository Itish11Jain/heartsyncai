import app from "./app";
import { logger } from "./lib/logger";
import { initDb } from "./lib/db";
import { warmBgRemove } from "./lib/bgRemove";

const rawPort = process.env["PORT"];

if (!rawPort) {
  throw new Error(
    "PORT environment variable is required but was not provided.",
  );
}

const port = Number(rawPort);

if (Number.isNaN(port) || port <= 0) {
  throw new Error(`Invalid PORT value: "${rawPort}"`);
}

initDb()
  .then(() => {
    logger.info("Database tables ready");

    app.listen(port, (err) => {
      if (err) {
        logger.error({ err }, "Error listening on port");
        process.exit(1);
      }

      logger.info({ port }, "Server listening");

      // Warm the background-removal model in the background so the first
      // sticker request doesn't pay the model load cost.
      warmBgRemove();
    });
  })
  .catch((err) => {
    logger.error({ err }, "Failed to initialize database");
    process.exit(1);
  });
