"use client";

import { memo } from "react";
import { CheckSquare, Loader2 } from "lucide-react";
import TaskCard from "./TaskCard";
import { Task } from "./TasksTable";

interface TaskListProps {
  tasks: Task[];
  onToggleTaskCompletion: (task: Task) => void;
  onEditTask: (task: Task) => void;
  onDeleteTask: (task: Task) => void;
  isLoading?: boolean;
  className?: string;
  emptyMessage?: string;
}

const TaskList = memo(function TaskList({
  tasks,
  onToggleTaskCompletion,
  onEditTask,
  onDeleteTask,
  isLoading = false,
  className = "",
  emptyMessage = "No tasks found",
}: TaskListProps) {
  if (isLoading) {
    return (
      <div className={`h-full ${className}`}>
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin" />
          <span className="ml-2">Loading tasks...</span>
        </div>
      </div>
    );
  }

  if (tasks.length === 0) {
    return (
      <div className={`h-full ${className}`}>
        <div className="flex items-center justify-center py-12 text-gray-500">
          <CheckSquare className="h-8 w-8 mr-2" />
          <span>{emptyMessage}</span>
        </div>
      </div>
    );
  }

  return (
    <div className={`space-y-4 ${className}`}>
      {tasks.map((task) => (
        <TaskCard
          key={task.id}
          task={task}
          onToggleCompletion={onToggleTaskCompletion}
          onEdit={onEditTask}
          onDelete={onDeleteTask}
        />
      ))}
    </div>
  );
});

export default TaskList;
