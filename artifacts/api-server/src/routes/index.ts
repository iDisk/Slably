import { Router, type IRouter } from "express";
import healthRouter from "./health";
import authRouter from "./auth";
import projectsRouter from "./projects";
import contractsRouter from "./contracts";
import changeOrdersRouter from "./change_orders";
import photosRouter from "./photos";
import activityRouter from "./activity";
import uploadsRouter from "./uploads";

const router: IRouter = Router();

router.use(healthRouter);
router.use(authRouter);
router.use(projectsRouter);
router.use(contractsRouter);
router.use(changeOrdersRouter);
router.use(photosRouter);
router.use(activityRouter);
router.use("/uploads", uploadsRouter);

export default router;
