import { Router, type IRouter } from "express";
import healthRouter from "./health";
import reportRouter from "./report";
import paymentRouter from "./payment";
import authRouter from "./auth";
import adminRouter from "./admin";
import momentRouter from "./moment";
import usageRouter from "./usage";
import eventsRouter from "./events";
import shareRouter from "./share";
import cardsRouter from "./cards";
import uploadRouter from "./upload";
import internalRouter from "./internal";

const router: IRouter = Router();

router.use(authRouter);
router.use(healthRouter);
router.use(reportRouter);
router.use(paymentRouter);
router.use(adminRouter);
router.use(momentRouter);
router.use(usageRouter);
router.use(eventsRouter);
router.use(shareRouter);
router.use(cardsRouter);
router.use(uploadRouter);
router.use(internalRouter);

export default router;
