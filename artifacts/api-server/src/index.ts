import app from "./app";
import { logger } from "./lib/logger";
import { initDb } from "./lib/db";

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

      // The background-removal model is loaded lazily on the first sticker
      // request (birthday cards only). We deliberately do NOT warm it at
      // startup so instances that never remove a background don't carry its
      // memory cost — which otherwise creates memory pressure that slows down
      // ordinary photo/audio uploads on small production instances.
    });
  })
  .catch((err) => {
    logger.error({ err }, "Failed to initialize database");
    process.exit(1);
  });
