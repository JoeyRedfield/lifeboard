import { useCallback, useEffect, useState } from "react";
import {
  createDailyTask,
  createProject,
  createTaskTemplate,
  fetchProjects,
  fetchTaskTemplates,
} from "../api/client";
import type { TaskProject, TaskTemplate } from "../types";

export function useProjectsBoard() {
  const [projects, setProjects] = useState<TaskProject[]>([]);
  const [selectedProjectId, setSelectedProjectId] = useState<number | null>(null);
  const [templates, setTemplates] = useState<TaskTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [submittingProject, setSubmittingProject] = useState(false);
  const [submittingTemplate, setSubmittingTemplate] = useState(false);
  const [addingTemplateId, setAddingTemplateId] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

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
    setSuccessMessage(null);

    try {
      const templatesData = await fetchTaskTemplates(projectId);
      setSelectedProjectId(projectId);
      setTemplates(templatesData);
    } catch (loadError) {
      console.error(loadError);
      setError("模板加载失败，请稍后重试。");
    }
  }, []);

  const submitProject = useCallback(async (name: string) => {
    setSubmittingProject(true);
    setError(null);
    setSuccessMessage(null);

    try {
      const project = await createProject({ name });
      await loadBoard();
      setSelectedProjectId(project.id);

      try {
        const templatesData = await fetchTaskTemplates(project.id);
        setTemplates(templatesData);
      } catch (templateError) {
        console.error(templateError);
        setTemplates([]);
        setError("新项目已创建，但模板加载失败，请稍后重试。");
      }

      setSuccessMessage("项目已创建。");
    } catch (submitError) {
      console.error(submitError);
      setError("创建项目失败，请稍后重试。");
      throw submitError;
    } finally {
      setSubmittingProject(false);
    }
  }, [loadBoard]);

  const submitTemplate = useCallback(
    async (payload: {
      name: string;
      defaultEstimatedDurationMinutes: number;
      defaultRewardAmount: number;
    }) => {
      if (selectedProjectId === null) {
        setError("请先创建并选择项目。");
        return;
      }

      setSubmittingTemplate(true);
      setError(null);
      setSuccessMessage(null);

      try {
        await createTaskTemplate({
          project_id: selectedProjectId,
          name: payload.name,
          default_estimated_duration_minutes:
            payload.defaultEstimatedDurationMinutes,
          default_reward_amount: payload.defaultRewardAmount,
          notes: "",
        });

        const templatesData = await fetchTaskTemplates(selectedProjectId);
        setTemplates(templatesData);
        setSuccessMessage("模板已创建。");
      } catch (submitError) {
        console.error(submitError);
        setError("创建模板失败，请稍后重试。");
        throw submitError;
      } finally {
        setSubmittingTemplate(false);
      }
    },
    [selectedProjectId]
  );

  const addTemplateToToday = useCallback(async (template: TaskTemplate) => {
    setAddingTemplateId(template.id);
    setError(null);
    setSuccessMessage(null);

    try {
      await createDailyTask({
        task_template_id: template.id,
        estimated_duration_minutes: template.default_estimated_duration_minutes,
        reward_amount: template.default_reward_amount,
      });
      setSuccessMessage("已加入今日任务。");
    } catch (submitError) {
      console.error(submitError);
      setError("加入今日失败，请稍后重试。");
      throw submitError;
    } finally {
      setAddingTemplateId(null);
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
    successMessage,
    submittingProject,
    submittingTemplate,
    addingTemplateId,
    selectProject,
    submitProject,
    submitTemplate,
    addTemplateToToday,
    reload: loadBoard,
  };
}

export default useProjectsBoard;
