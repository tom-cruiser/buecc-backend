import express from "express";
import {
  createProject,
  getProjects,
  getProject,
  updateProject,
  deleteProject,
} from "../controllers/projects.js";

const router = express.Router();

router.route("/").post(createProject).get(getProjects);

router.route("/:id").get(getProject).put(updateProject).delete(deleteProject);

export default router;
