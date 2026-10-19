import Task from "../models/Task.js";
import asyncHandler from "../utils/asyncHandler.js";
import AppError from "../utils/AppError.js";

// create task
export const createTask = asyncHandler(async (req, res) => {

  if (!req.body || typeof req.body !== "object" || Array.isArray(req.body)) {
  throw new AppError("Request body must be a valid JSON object", 400);
}

const { title, description, priority, dueDate } = req.body;

  // Validate title
  if (
    typeof title !== "string" ||
    title.trim().length < 2 ||
    title.trim().length > 100
  ) {
    throw new AppError("Title must be between 2 and 100 characters", 400);
  }

  // Validate description
  if (
    description !== undefined &&
    (typeof description !== "string" || description.length > 1000)
  ) {
    throw new AppError(
      "Description must be a string with at most 1000 characters",
      400,
    );
  }

  // Validate priority
  if (priority !== undefined && !["low", "medium", "high"].includes(priority)) {
    throw new AppError("Invalid task priority", 400);
  }

  // Validate due date
  if (dueDate !== undefined && dueDate !== null) {
    if (
      typeof dueDate !== "string" ||
      dueDate.trim() === "" ||
      Number.isNaN(Date.parse(dueDate))
    ) {
      throw new AppError("Invalid due date", 400);
    }
  }

  const task = await Task.create({
    title: title.trim(),
    description: description ?? "",
    priority: priority ?? "medium",
    dueDate: dueDate ?? null,
    user: req.auth.userId,
  });

  res.status(201).json({
    success: true,
    message: "Task created successfully",
    task,
  });
});

// get all tasks
export const getTasks = asyncHandler(async (req, res) => {
  let {
    page = "1",
    limit = "10",
    status,
    priority,
    search,
    sortBy = "createdAt",
    order = "desc",
  } = req.query;

  page = Number(page);
  limit = Number(limit);

  if (
    !Number.isInteger(page) ||
    !Number.isInteger(limit) ||
    page < 1 ||
    limit < 1
  ) {
    throw new AppError("Page and limit must be positive integers", 400);
  }


limit = Math.min(limit, 100);

if (!Number.isSafeInteger((page - 1) * limit)) {
  throw new AppError("Page number is too large", 400);
}

const skip = (page - 1) * limit;


  const allowedSortFields = [
    "createdAt",
    "updatedAt",
    "dueDate",
    "title",
    "priority",
  ];

  if (!allowedSortFields.includes(sortBy)) {
    throw new AppError("Invalid sort field", 400);
  }

  if (!["asc", "desc"].includes(order)) {
    throw new AppError("Sort order must be asc or desc", 400);
  }

  const sortOrder = order === "asc" ? 1 : -1;

  const sortOptions = {
    [sortBy]: sortOrder,
    _id:1,
  };

  // Only the logged-in user's tasks
  const filter = {
    user: req.auth.userId,
  };

  // Filter by status
  if (status !== undefined) {
    if (
      typeof status !== "string" ||
      !["pending", "in-progress", "completed"].includes(status)
    ) {
      throw new AppError("Invalid task status", 400);
    }

    filter.status = status;
  }

  // Filter by priority
  if (priority !== undefined) {
    if (
      typeof priority !== "string" ||
      !["low", "medium", "high"].includes(priority)
    ) {
      throw new AppError("Invalid task priority", 400);
    }

    filter.priority = priority;
  }

  // Search by task title
  if (search !== undefined) {
    if (typeof search !== "string" || search.trim().length > 100) {
      throw new AppError(
        "Search must be a string of at most 100 characters",
        400,
      );
    }

    const searchTerm = search.trim();

    if (searchTerm) {
      const escapedSearch = searchTerm.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

      filter.title = {
        $regex: escapedSearch,
        $options: "i",
      };
    }
  }

  const [tasks, totalTasks] = await Promise.all([
    Task.find(filter).sort(sortOptions).skip(skip).limit(limit),

    Task.countDocuments(filter),
  ]);

  res.status(200).json({
    success: true,
    count: tasks.length,
    totalTasks,
    totalPages: Math.ceil(totalTasks / limit),
    currentPage: page,
    tasks,
  });
});

// get single task
export const getTaskById = asyncHandler(async (req, res) => {
  const task = await Task.findOne({
    _id: req.params.id,
    user: req.auth.userId,
  });

  if (!task) {
    throw new AppError("Task not found", 404);
  }

  res.status(200).json({
    success: true,
    task,
  });
});

// update task
export const updateTask = asyncHandler(async (req, res) => {
  if (!req.body || typeof req.body !== "object" || Array.isArray(req.body)) {
  throw new AppError("Request body must be a valid JSON object", 400);
}
  const allowedFields = [
    "title",
    "description",
    "status",
    "priority",
    "dueDate",
  ];

  const updates = {};

  for (const field of allowedFields) {
    if (req.body[field] !== undefined) {
      updates[field] = req.body[field];
    }
  }

  if (Object.keys(updates).length === 0) {
    throw new AppError("At least one valid field is required", 400);
  }

  // Validate title
  if (updates.title !== undefined) {
    if (
      typeof updates.title !== "string" ||
      updates.title.trim().length < 2 ||
      updates.title.trim().length > 100
    ) {
      throw new AppError("Title must be between 2 and 100 characters", 400);
    }

    updates.title = updates.title.trim();
  }

  // Validate description
  if (updates.description !== undefined) {
    if (
      typeof updates.description !== "string" ||
      updates.description.trim().length > 1000
    ) {
      throw new AppError(
        "Description must be a string with at most 1000 characters",
        400,
      );
    }

    updates.description = updates.description.trim();
  }

  // Validate status
  if (
    updates.status !== undefined &&
    !["pending", "in-progress", "completed"].includes(updates.status)
  ) {
    throw new AppError("Invalid task status", 400);
  }

  // Validate priority
  if (
    updates.priority !== undefined &&
    !["low", "medium", "high"].includes(updates.priority)
  ) {
    throw new AppError("Invalid task priority", 400);
  }

  // Validate due date
  if (updates.dueDate !== undefined && updates.dueDate !== null) {
    if (
      typeof updates.dueDate !== "string" ||
      updates.dueDate.trim() === "" ||
      Number.isNaN(Date.parse(updates.dueDate))
    ) {
      throw new AppError("Invalid due date", 400);
    }
  }

  const task = await Task.findOneAndUpdate(
    {
      _id: req.params.id,
      user: req.auth.userId,
    },
    { $set: updates },
    {
      returnDocument: "after",
      runValidators: true,
    },
  );

  if (!task) {
    throw new AppError("Task not found", 404);
  }

  res.status(200).json({
    success: true,
    message: "Task updated successfully",
    task,
  });
});

// delete task

export const deleteTask = asyncHandler(async (req, res) => {
  const task = await Task.findOneAndDelete({
    _id: req.params.id,
    user: req.auth.userId,
  });

  if (!task) {
    throw new AppError("Task not found", 404);
  }

  res.status(200).json({
    success: true,
    message: "Task deleted successfully",
  });
});



export const getTaskStats = asyncHandler(async (req, res) => {
  const userFilter = {
    user: req.auth.userId,
  };

  const [totalTasks, pending, inProgress, completed, highPriority] =
    await Promise.all([
      Task.countDocuments(userFilter),

      Task.countDocuments({
        ...userFilter,
        status: "pending",
      }),

      Task.countDocuments({
        ...userFilter,
        status: "in-progress",
      }),

      Task.countDocuments({
        ...userFilter,
        status: "completed",
      }),

      Task.countDocuments({
        ...userFilter,
        priority: "high",
      }),
    ]);

  res.status(200).json({
    success: true,
    stats: {
      totalTasks,
      pending,
      inProgress,
      completed,
      highPriority,
    },
  });
});
