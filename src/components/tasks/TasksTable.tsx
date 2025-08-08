"use client";

import { useEffect, useRef, memo } from "react";
import { CheckSquare, Loader2 } from "lucide-react";
import { useVirtualizer } from "@tanstack/react-virtual";
import TaskCard from "./TaskCard";

export interface Task {
  id: number;
  subject: string;
  description?: string;
  dueDate: string;
  status?: string;
  priority?: string;
  category?: string;
  estimatedHours?: number;
  actualHours?: number;
  assignedTo?: number;
  reminderDate?: string;
  tags?: string[];
  isRecurring?: boolean;
  completedAt?: string;
  updatedAt?: string;
  lead: {
    id: number;
    name: string;
    company?: string;
  };
  creator?: {
    id: number;
    name: string;
    username: string;
  };
  assignee?: {
    id: number;
    name: string;
    username: string;
  };
}

interface TasksTableProps {
  tasks: Task[];
  hasNextPage: boolean;
  isFetchingNextPage: boolean;
  onFetchNextPage: () => void;
  onToggleTaskCompletion: (task: Task) => void;
  onEditTask: (task: Task) => void;
  onDeleteTask: (task: Task) => void;
  isLoading?: boolean;
  className?: string;
}

const TasksTable = memo(function TasksTable({
  tasks,
  hasNextPage,
  isFetchingNextPage,
  onFetchNextPage,
  onToggleTaskCompletion,
  onEditTask,
  onDeleteTask,
  isLoading = false,
  className = "",
}: TasksTableProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  // Virtual scrolling setup
  const parentRef = useRef<HTMLDivElement>(null);
  const rowVirtualizer = useVirtualizer({
    count: hasNextPage ? tasks.length + 1 : tasks.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 200,
    overscan: 5, // Render 5 extra items outside viewport for smooth scrolling
  });

  // Proper infinite scroll detection for virtual scrolling
  useEffect(() => {
    const scrollElement = parentRef.current;
    if (!scrollElement) return;

    const handleScroll = () => {
      // Get virtual scroller metrics
      const totalSize = rowVirtualizer.getTotalSize();
      const { scrollTop, clientHeight } = scrollElement;

      // Calculate how much content is left to scroll
      const scrollableDistance = totalSize - clientHeight;
      const scrollProgress =
        scrollableDistance > 0 ? scrollTop / scrollableDistance : 1;

      // Trigger fetch when 80% scrolled through the virtual content
      if (scrollProgress >= 0.8 && hasNextPage && !isFetchingNextPage) {
        onFetchNextPage();
      }
    };

    scrollElement.addEventListener("scroll", handleScroll);
    return () => scrollElement.removeEventListener("scroll", handleScroll);
  }, [
    hasNextPage,
    isFetchingNextPage,
    onFetchNextPage,
    rowVirtualizer,
    tasks.length,
  ]);

  if (isLoading) {
    return (
      <div ref={containerRef} className={`h-full ${className}`}>
        <div className="flex items-center justify-center h-full">
          <Loader2 className="h-8 w-8 animate-spin" />
          <span className="ml-2">Loading tasks...</span>
        </div>
      </div>
    );
  }

  if (tasks.length === 0 && !hasNextPage) {
    return (
      <div ref={containerRef} className={`h-full ${className}`}>
        <div className="flex items-center justify-center h-full text-gray-500">
          <CheckSquare className="h-8 w-8 mr-2" />
          <span>No tasks found</span>
        </div>
      </div>
    );
  }

  return (
    <div ref={containerRef} className={`h-full ${className}`}>
      <div
        ref={parentRef}
        className="overflow-auto h-full"
        style={{
          contain: "strict",
        }}
      >
        <div
          style={{
            height: `${rowVirtualizer.getTotalSize()}px`,
            width: "100%",
            position: "relative",
          }}
        >
          {rowVirtualizer.getVirtualItems().map((virtualRow) => {
            const isLoaderRow = virtualRow.index > tasks.length - 1;
            const task = tasks[virtualRow.index];

            return (
              <div
                key={virtualRow.key}
                style={{
                  position: "absolute",
                  top: `${virtualRow.start}px`,
                  left: 0,
                  width: "100%",
                  height: `${virtualRow.size}px`,
                }}
              >
                {isLoaderRow ? (
                  hasNextPage ? (
                    <div className="flex items-center justify-center p-4">
                      <Loader2 className="h-6 w-6 animate-spin" />
                      <span className="ml-2">Loading more tasks...</span>
                    </div>
                  ) : (
                    <div className="flex items-center justify-center p-4 text-gray-500">
                      <CheckSquare className="h-5 w-5 mr-2" />
                      No more tasks to load
                    </div>
                  )
                ) : (
                  <div className="p-1 sm:p-2">
                    <TaskCard
                      task={task}
                      onToggleCompletion={onToggleTaskCompletion}
                      onEdit={onEditTask}
                      onDelete={onDeleteTask}
                    />
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
});

export default TasksTable;
