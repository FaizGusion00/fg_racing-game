import { Router, type IRouter } from "express";
import healthRouter from "./health";
import leaderboardRouter from "./leaderboard";
import authRouter from "./auth";
import profileRouter from "./profile";

const router: IRouter = Router();

router.use(healthRouter);
router.use(leaderboardRouter);
router.use(authRouter);
router.use(profileRouter);

export default router;
