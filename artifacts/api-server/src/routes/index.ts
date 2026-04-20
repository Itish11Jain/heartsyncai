import { Router, type IRouter } from "express";
import healthRouter from "./health";
import reportRouter from "./report";
import paymentRouter from "./payment";

const router: IRouter = Router();

router.use(healthRouter);
router.use(reportRouter);
router.use(paymentRouter);

export default router;
