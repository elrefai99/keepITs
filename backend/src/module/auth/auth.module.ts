import { Router } from "express";
import { googleController } from "./auth.controller";

const router: Router = Router()

router.post("/google", googleController)

export default router
