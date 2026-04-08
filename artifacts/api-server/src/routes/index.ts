import { Router, type IRouter } from "express";
import healthRouter from "./health";
import authRouter from "./auth";
import projectsRouter from "./projects";
import contractsRouter from "./contracts";
import changeOrdersRouter from "./change_orders";
import photosRouter from "./photos";
import activityRouter from "./activity";
import uploadsRouter from "./uploads";
import expensesRouter from "./expenses";
import phasesRouter from "./phases";
import organizationsRouter from "./organizations";
import documentsRouter from "./documents";
import networkRouter from "./network";
import dailyLogsRouter from "./daily-logs";
import vendorsRouter from "./vendors";

const router: IRouter = Router();

router.use(healthRouter);
router.use(authRouter);
router.use(projectsRouter);
router.use(contractsRouter);
router.use(changeOrdersRouter);
router.use(photosRouter);
router.use(activityRouter);
router.use("/uploads", uploadsRouter);
router.use(expensesRouter);
router.use(phasesRouter);
router.use(organizationsRouter);
router.use(documentsRouter);
router.use(networkRouter);
router.use(dailyLogsRouter);
router.use(vendorsRouter);

export default router;
