"use client";

import { memo } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import {
  Calendar,
  User,
  Building,
  Edit,
  Trash2,
  Timer,
  Tag,
  Repeat,
  Check,
  Clock,
  AlertCircle,
  MoreHorizontal,
} from "lucide-react";
import { Task } from "./TasksTable";
import { getPriorityColor, getTaskStatusColor } from "@/lib/utils";

interface TaskCardProps {
  task: Task;
  onToggleCompletion: (task: Task) => void;
  onEdit: (task: Task) => void;
  onDelete: (task: Task) => void;
}

const TaskCard = memo(function TaskCard({
  task,
  onToggleCompletion,
  onEdit,
  onDelete,
}: TaskCardProps) {
  const isCompleted = task.status === "Completed";
  const dueDate = new Date(task.dueDate);
  const isOverdue = dueDate < new Date() && !isCompleted;
  const isDueToday = dueDate.toDateString() === new Date().toDateString();

  return (
    <Card className="group hover:shadow-lg hover:shadow-blue-50 transition-all duration-200 border-l-4 border-l-gray-200 hover:border-l-blue-400">
      <CardContent className="p-3 sm:p-4">
        <div className="space-y-3">
          {/* Header Row - Title, Status, Priority */}
          <div className="flex items-start justify-between gap-2">
            <div className="flex items-start gap-2 sm:gap-3 flex-1 min-w-0">
              {/* Completion Checkbox */}
              <button
                onClick={() => onToggleCompletion(task)}
                className={`flex-shrink-0 w-5 h-5 rounded border-2 flex items-center justify-center transition-all mt-0.5 ${
                  isCompleted
                    ? "bg-green-500 border-green-500 text-white"
                    : "border-gray-300 hover:border-green-400 hover:bg-green-50"
                }`}
                title={isCompleted ? "Mark as pending" : "Mark as completed"}
              >
                {isCompleted && <Check className="h-3 w-3" />}
              </button>

              <div className="flex-1 min-w-0">
                {/* Task Title */}
                <h3
                  className={`font-semibold text-sm sm:text-base leading-tight ${
                    isCompleted ? "text-gray-500 line-through" : "text-gray-900"
                  }`}
                >
                  {task.subject}
                </h3>

                {/* Quick indicators - moved below title on mobile */}
                <div className="flex items-center gap-1.5 mt-1 sm:hidden">
                  {task.isRecurring && (
                    <div
                      className="p-0.5 rounded bg-blue-100 text-blue-600"
                      title="Recurring Task"
                    >
                      <Repeat className="h-3 w-3" />
                    </div>
                  )}
                  {isOverdue && (
                    <div
                      className="p-0.5 rounded bg-red-100 text-red-600"
                      title="Overdue"
                    >
                      <AlertCircle className="h-3 w-3" />
                    </div>
                  )}
                  {isDueToday && !isOverdue && (
                    <div
                      className="p-0.5 rounded bg-yellow-100 text-yellow-600"
                      title="Due Today"
                    >
                      <Clock className="h-3 w-3" />
                    </div>
                  )}
                </div>
              </div>

              {/* Quick indicators - desktop */}
              <div className="hidden sm:flex items-center gap-1.5 flex-shrink-0">
                {task.isRecurring && (
                  <div
                    className="p-0.5 rounded bg-blue-100 text-blue-600"
                    title="Recurring Task"
                  >
                    <Repeat className="h-3 w-3" />
                  </div>
                )}
                {isOverdue && (
                  <div
                    className="p-0.5 rounded bg-red-100 text-red-600"
                    title="Overdue"
                  >
                    <AlertCircle className="h-3 w-3" />
                  </div>
                )}
                {isDueToday && !isOverdue && (
                  <div
                    className="p-0.5 rounded bg-yellow-100 text-yellow-600"
                    title="Due Today"
                  >
                    <Clock className="h-3 w-3" />
                  </div>
                )}
              </div>
            </div>

            {/* Status and Priority badges */}
            <div className="flex flex-col sm:flex-row items-end sm:items-center gap-1 sm:gap-2 flex-shrink-0">
              <Badge
                variant="outline"
                className={`text-xs ${getTaskStatusColor(task.status)}`}
              >
                {task.status}
              </Badge>
              {task.priority && (
                <Badge
                  variant="outline"
                  className={`text-xs ${getPriorityColor(task.priority)}`}
                >
                  {task.priority}
                </Badge>
              )}
            </div>
          </div>

          {/* Description */}
          {task.description && (
            <p className="text-sm text-gray-600 line-clamp-2 leading-relaxed">
              {task.description}
            </p>
          )}

          {/* Metadata Row */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 text-xs text-gray-500">
            <div className="flex items-center gap-3 sm:gap-4 flex-wrap">
              {/* Due Date */}
              <div className="flex items-center gap-1">
                <Calendar className="h-3.5 w-3.5 flex-shrink-0" />
                <span className={isOverdue ? "text-red-600 font-medium" : ""}>
                  {dueDate.toLocaleDateString()}
                </span>
              </div>

              {/* Lead */}
              <div className="flex items-center gap-1 min-w-0">
                <Building className="h-3.5 w-3.5 flex-shrink-0" />
                <Link
                  href={`/leads/${task.lead.id}`}
                  className="text-blue-600 hover:underline max-w-24 sm:max-w-32 truncate"
                  title={`${task.lead.name}${
                    task.lead.company ? ` (${task.lead.company})` : ""
                  }`}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  {task.lead.name}
                </Link>
              </div>

              {/* Assignee */}
              {task.assignee && (
                <div className="flex items-center gap-1 min-w-0">
                  <User className="h-3.5 w-3.5 flex-shrink-0" />
                  <span
                    className="max-w-20 sm:max-w-24 truncate"
                    title={task.assignee.name}
                  >
                    {task.assignee.name}
                  </span>
                </div>
              )}

              {/* Time Estimate - hidden on mobile if space is limited */}
              {task.estimatedHours != null && (
                <div className="hidden sm:flex items-center gap-1">
                  <Timer className="h-3.5 w-3.5" />
                  <span>{task.estimatedHours}h</span>
                </div>
              )}

              {/* Category */}
              {task.category && (
                <Badge
                  variant="secondary"
                  className="text-xs px-2 py-0 hidden sm:inline-flex"
                >
                  {task.category}
                </Badge>
              )}
            </div>

            {/* Action Buttons */}
            <div className="flex items-center gap-1 opacity-60 group-hover:opacity-100 transition-opacity flex-shrink-0 self-end sm:self-auto">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onEdit(task)}
                className="h-7 w-7 p-0 hover:bg-blue-100 hover:text-blue-600"
                title="Edit task"
              >
                <Edit className="h-3.5 w-3.5" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onDelete(task)}
                className="h-7 w-7 p-0 hover:bg-red-100 hover:text-red-600"
                title="Delete task"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            </div>
          </div>

          {/* Mobile-only additional info */}
          <div className="sm:hidden flex items-center gap-3 text-xs text-gray-500">
            {/* Time Estimate on mobile */}
            {task.estimatedHours != null && (
              <div className="flex items-center gap-1">
                <Timer className="h-3.5 w-3.5" />
                <span>{task.estimatedHours}h</span>
              </div>
            )}
            {/* Category on mobile */}
            {task.category && (
              <Badge variant="secondary" className="text-xs px-2 py-0">
                {task.category}
              </Badge>
            )}
          </div>

          {/* Tags Row */}
          {task.tags && task.tags.length > 0 && (
            <div className="flex items-center gap-1.5 flex-wrap">
              <Tag className="h-3.5 w-3.5 text-gray-400" />
              {task.tags.slice(0, 3).map((tag, index) => (
                <Badge
                  key={index}
                  variant="secondary"
                  className="text-xs px-2 py-0.5"
                >
                  {tag}
                </Badge>
              ))}
              {task.tags.length > 3 && (
                <Badge variant="secondary" className="text-xs px-2 py-0.5">
                  +{task.tags.length - 3}
                </Badge>
              )}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
});

export default TaskCard;
