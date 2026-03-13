import { Router, type IRouter } from "express";
import healthRouter from "./health";
import sourcesRouter from "./sources";
import tasksRouter from "./tasks";
import sourceRatingsRouter from "./source-ratings";

const router: IRouter = Router();

router.use(healthRouter);
router.use(sourcesRouter);
router.use(tasksRouter);
router.use(sourceRatingsRouter);

export default router;
