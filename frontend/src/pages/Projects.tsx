import ProjectTemplatePanel from "../components/ProjectTemplatePanel";
import useProjectsBoard from "../hooks/useProjectsBoard";

export default function Projects() {
  const {
    projects,
    selectedProjectId,
    templates,
    loading,
    error,
    selectProject,
  } = useProjectsBoard();
  const rewardTodoAppUrl =
    import.meta.env.VITE_REWARD_TODO_APP_URL || "http://127.0.0.1:8088";

  return (
    <div>
      <h1 className="page-title">项目</h1>

      {loading ? (
        <div className="loading-container">
          <div className="loading-pulse" aria-label="加载中" />
        </div>
      ) : (
        <div className="projects-board">
          {error ? <div className="message message-error">{error}</div> : null}
          <div className="message">
            当前为只读视图。
            <a
              href={rewardTodoAppUrl}
              className="link-button"
              target="_blank"
              rel="noreferrer"
            >
              前往 Reward Todo 管理
            </a>
          </div>
          <ProjectTemplatePanel
            projects={projects}
            selectedProjectId={selectedProjectId}
            templates={templates}
            submittingProject={false}
            submittingTemplate={false}
            addingTemplateId={null}
            onSelectProject={selectProject}
            isReadonly
          />
        </div>
      )}
    </div>
  );
}
