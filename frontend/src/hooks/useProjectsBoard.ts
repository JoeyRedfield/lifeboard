import { useCallback, useEffect, useState } from "react";
import {
  fetchRewardTodoProjects,
  fetchRewardTodoTemplates,
} from "../api/client";
import type { TaskProject, TaskTemplate } from "../types";

export function useProjectsBoard() {
  const [projects, setProjects] = useState<TaskProject[]>([]);
  const [selectedProjectId, setSelectedProjectId] = useState<number | null>(null);
  const [templates, setTemplates] = useState<TaskTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadBoard = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const projectsPayload = await fetchRewardTodoProjects();
      setProjects(projectsPayload.items);

      const initialProjectId = projectsPayload.items[0]?.id ?? null;
      setSelectedProjectId(initialProjectId);

      if (initialProjectId === null) {
        setTemplates([]);
        return;
      }

      const templatesPayload = await fetchRewardTodoTemplates(initialProjectId);
      setTemplates(templatesPayload.items);
    } catch (loadError) {
      console.error(loadError);
      setError("项目页加载失败，请稍后重试。");
    } finally {
      setLoading(false);
    }
  }, []);

  const selectProject = useCallback(async (projectId: number) => {
    setError(null);

    try {
      const templatesPayload = await fetchRewardTodoTemplates(projectId);
      setSelectedProjectId(projectId);
      setTemplates(templatesPayload.items);
    } catch (loadError) {
      console.error(loadError);
      setError("模板加载失败，请稍后重试。");
    }
  }, []);

  useEffect(() => {
    void loadBoard();
  }, [loadBoard]);

  return {
    projects,
    selectedProjectId,
    templates,
    loading,
    error,
    successMessage: null,
    submittingProject: false,
    submittingTemplate: false,
    addingTemplateId: null,
    selectProject,
    submitProject: undefined,
    submitTemplate: undefined,
    addTemplateToToday: undefined,
    reload: loadBoard,
  };
}

export default useProjectsBoard;
