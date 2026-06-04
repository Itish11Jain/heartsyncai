import express, { type Express } from "express";
import cors from "cors";
import compression from "compression";
import pinoHttp from "pino-http";
import { clerkMiddleware } from "@clerk/express";
import { CLERK_PROXY_PATH, clerkProxyMiddleware } from "./middlewares/clerkProxyMiddleware";
import router from "./routes";
import { logger } from "./lib/logger";

const app: Express = express();

// The app runs behind Replit's proxy (dev preview + Autoscale deployment), which
// terminates TLS and forwards over http. Trust the proxy so `req.protocol`
// reflects `x-forwarded-proto` (https) — otherwise uploaded photo/audio/sticker
// URLs are built as http:// and become mixed content on the https card page.
app.set("trust proxy", true);

app.use(
  pinoHttp({
    logger,
    serializers: {
      req(req) {
        return {
          id: req.id,
          method: req.method,
          url: req.url?.split("?")[0],
        };
      },
      res(res) {
        return {
          statusCode: res.statusCode,
        };
      },
    },
  }),
);

// Compress JSON/text responses; skip already-compressed media streams
app.use(compression({ filter: (req, res) => {
  const ct = res.getHeader("Content-Type") as string ?? "";
  if (/image\/|audio\/|video\//.test(ct)) return false;
  return compression.filter(req, res);
}}));

// Clerk proxy must come before body parsers (streams raw bytes)
app.use(CLERK_PROXY_PATH, clerkProxyMiddleware());

app.use(cors({ credentials: true, origin: true }));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use(clerkMiddleware());

app.use("/api", router);

export default app;
