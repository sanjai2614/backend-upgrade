import express from "express";
import {
  createTask,
  getTasks,
  getTaskById,
  updateTask,
  deleteTask,
  getTaskStats
} from "../controllers/taskController.js";
import protect from "../middleware/authMiddleware.js";

const router = express.Router();

router.route("/").post(protect, createTask).get(protect, getTasks);
router.route("/stats").get(protect,getTaskStats)
router
  .route("/:id")
  .get(protect, getTaskById)
  .patch(protect, updateTask)
  .delete(protect, deleteTask);


export default router;
