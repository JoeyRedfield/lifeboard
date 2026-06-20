import ProjectTemplatePanel from "../components/ProjectTemplatePanel";
import useProjectsBoard from "../hooks/useProjectsBoard";

export default function Projects() {
  const {
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
  } = useProjectsBoard();

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
          {successMessage ? (
            <div className="message message-success">{successMessage}</div>
          ) : null}
          <ProjectTemplatePanel
            projects={projects}
            selectedProjectId={selectedProjectId}
            templates={templates}
            submittingProject={submittingProject}
            submittingTemplate={submittingTemplate}
            addingTemplateId={addingTemplateId}
            onSelectProject={selectProject}
            onCreateProject={submitProject}
            onCreateTemplate={submitTemplate}
            onAddToToday={addTemplateToToday}
          />
        </div>
      )}
    </div>
  );
}
