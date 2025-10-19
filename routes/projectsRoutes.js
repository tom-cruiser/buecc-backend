import express from "express";
import {
  createProject,
  getProjects,
  getProject,
  updateProject,
  deleteProject,
  upload,
} from "../controllers/projects.js";

const router = express.Router();

router.route("/").post(upload, createProject).get(getProjects);

router.route("/:id").get(getProject).put(upload, updateProject).delete(deleteProject);

export default router;
