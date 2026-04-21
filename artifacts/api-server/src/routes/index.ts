import { Router, type IRouter } from "express";
import healthRouter from "./health";
import reportRouter from "./report";
import paymentRouter from "./payment";
import authRouter from "./auth";
import adminRouter from "./admin";

const router: IRouter = Router();

router.use(authRouter);
router.use(healthRouter);
router.use(reportRouter);
router.use(paymentRouter);
router.use(adminRouter);

export default router;
