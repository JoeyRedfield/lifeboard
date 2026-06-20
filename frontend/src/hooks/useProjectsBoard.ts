import { useCallback, useEffect, useState } from "react";
import { fetchProjects, fetchTaskTemplates } from "../api/client";
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
      const projectsData = await fetchProjects();
      setProjects(projectsData);

      const initialProjectId = projectsData[0]?.id ?? null;
      setSelectedProjectId(initialProjectId);

      if (initialProjectId === null) {
        setTemplates([]);
        return;
      }

      const templatesData = await fetchTaskTemplates(initialProjectId);
      setTemplates(templatesData);
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
      const templatesData = await fetchTaskTemplates(projectId);
      setSelectedProjectId(projectId);
      setTemplates(templatesData);
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
    selectProject,
    reload: loadBoard,
  };
}

export default useProjectsBoard;
