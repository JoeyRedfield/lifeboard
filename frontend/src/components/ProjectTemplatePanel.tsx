import type { TaskProject, TaskTemplate } from "../types";

function formatYuan(amountInCent: number): string {
  return `¥${(amountInCent / 100).toFixed(2)}`;
}

interface Props {
  projects: TaskProject[];
  selectedProjectId: number | null;
  templates: TaskTemplate[];
  onSelectProject: (projectId: number) => void;
}

export default function ProjectTemplatePanel({
  projects,
  selectedProjectId,
  templates,
  onSelectProject,
}: Props) {
  return (
    <div className="board-two-column">
      <section className="card">
        <div className="card-header">
          <h2 className="card-title">任务项目</h2>
        </div>

        {projects.length === 0 ? (
          <p className="panel-empty-state">还没有项目。</p>
        ) : (
          <div className="project-list">
            {projects.map((project) => {
              const isActive = project.id === selectedProjectId;

              return (
                <button
                  key={project.id}
                  type="button"
                  className={`project-list-item${isActive ? " is-active" : ""}`}
                  onClick={() => onSelectProject(project.id)}
                >
                  <span className="project-list-name">{project.name}</span>
                  <span className="project-list-status">
                    {project.status === "active" ? "启用中" : project.status}
                  </span>
                </button>
              );
            })}
          </div>
        )}
      </section>

      <section className="card">
        <div className="card-header">
          <h2 className="card-title">任务模板</h2>
        </div>

        {templates.length === 0 ? (
          <p className="panel-empty-state">当前项目还没有任务模板。</p>
        ) : (
          <div className="template-list">
            {templates.map((template) => (
              <article key={template.id} className="template-item">
                <div className="template-item-header">
                  <h3 className="template-item-title">{template.name}</h3>
                  <span
                    className={`template-item-badge${
                      template.is_active ? " is-active" : ""
                    }`}
                  >
                    {template.is_active ? "启用" : "停用"}
                  </span>
                </div>
                <div className="template-item-meta">
                  <span>{template.default_estimated_duration_minutes} 分钟</span>
                  <span>{formatYuan(template.default_reward_amount)}</span>
                </div>
                {template.notes ? (
                  <p className="template-item-notes">{template.notes}</p>
                ) : null}
              </article>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
