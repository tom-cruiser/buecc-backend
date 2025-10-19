import express from "express";
import { subscribeUser } from "../controllers/newsletterController.js";

const router = express.Router();

router.post("/subscribe", subscribeUser);

export default router;
