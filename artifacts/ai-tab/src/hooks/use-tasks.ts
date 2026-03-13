import { useGetAiTasks } from "@workspace/api-client-react";

export function useTasks() {
  return useGetAiTasks();
}
