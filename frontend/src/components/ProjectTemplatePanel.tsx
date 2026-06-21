import { useState } from "react";
import type { TaskProject, TaskTemplate } from "../types";

function formatYuan(amountInCent: number): string {
  return `¥${(amountInCent / 100).toFixed(2)}`;
}

interface Props {
  projects: TaskProject[];
  selectedProjectId: number | null;
  templates: TaskTemplate[];
  submittingProject: boolean;
  submittingTemplate: boolean;
  addingTemplateId: number | null;
  onSelectProject: (projectId: number) => void;
  onCreateProject?: (name: string) => Promise<void>;
  onCreateTemplate?: (payload: {
    name: string;
    defaultEstimatedDurationMinutes: number;
    defaultRewardAmount: number;
  }) => Promise<void>;
  onAddToToday?: (template: TaskTemplate) => Promise<void>;
  isReadonly?: boolean;
}

export default function ProjectTemplatePanel({
  projects,
  selectedProjectId,
  templates,
  submittingProject,
  submittingTemplate,
  addingTemplateId,
  onSelectProject,
  onCreateProject,
  onCreateTemplate,
  onAddToToday,
  isReadonly = false,
}: Props) {
  const [projectName, setProjectName] = useState("");
  const [templateName, setTemplateName] = useState("");
  const [durationValue, setDurationValue] = useState("");
  const [rewardValue, setRewardValue] = useState("");
  const [projectFormError, setProjectFormError] = useState<string | null>(null);
  const [templateFormError, setTemplateFormError] = useState<string | null>(null);

  const handleProjectSubmit = async () => {
    const trimmedName = projectName.trim();

    if (trimmedName === "") {
      setProjectFormError("项目名称不能为空。");
      return;
    }

    setProjectFormError(null);

    if (!onCreateProject) return;
    try {
      await onCreateProject(trimmedName);
      setProjectName("");
    } catch {}
  };

  const handleTemplateSubmit = async () => {
    const trimmedName = templateName.trim();
    const duration = Number(durationValue);
    const reward = Number(rewardValue);

    if (trimmedName === "") {
      setTemplateFormError("模板名称不能为空。");
      return;
    }

    if (!Number.isInteger(duration) || duration <= 0) {
      setTemplateFormError("默认时长需要填写正整数分钟。");
      return;
    }

    if (!Number.isInteger(reward) || reward < 0) {
      setTemplateFormError("默认奖励金额需要填写非负整数。");
      return;
    }

    setTemplateFormError(null);

    if (!onCreateTemplate) return;
    try {
      await onCreateTemplate({
        name: trimmedName,
        defaultEstimatedDurationMinutes: duration,
        defaultRewardAmount: reward,
      });
      setTemplateName("");
      setDurationValue("");
      setRewardValue("");
    } catch {}
  };

  return (
    <div className="board-two-column">
      <section className="card">
        <div className="card-header">
          <h2 className="card-title">任务项目</h2>
        </div>

        {isReadonly ? null : <div className="project-create-form">
          <label className="board-field">
            <span>项目名称</span>
            <input
              type="text"
              value={projectName}
              onChange={(event) => setProjectName(event.target.value)}
              placeholder="例如：写作"
              disabled={submittingProject}
            />
          </label>

          {projectFormError ? (
            <div className="message message-error">{projectFormError}</div>
          ) : null}

          <button
            type="button"
            className="btn btn-primary"
            onClick={() => void handleProjectSubmit()}
            disabled={submittingProject}
          >
            {submittingProject ? "创建中..." : "创建项目"}
          </button>
        </div>}

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

        {isReadonly ? null : <div className="project-create-form">
          <label className="board-field">
            <span>模板名称</span>
            <input
              type="text"
              value={templateName}
              onChange={(event) => setTemplateName(event.target.value)}
              placeholder="例如：力量训练 20 分钟"
              disabled={selectedProjectId === null || submittingTemplate}
            />
          </label>

          <div className="template-create-grid">
            <label className="board-field">
              <span>默认时长（分钟）</span>
              <input
                type="number"
                min="1"
                inputMode="numeric"
                value={durationValue}
                onChange={(event) => setDurationValue(event.target.value)}
                placeholder="20"
                disabled={selectedProjectId === null || submittingTemplate}
              />
            </label>

            <label className="board-field">
              <span>默认奖励金额（分）</span>
              <input
                type="number"
                min="0"
                inputMode="numeric"
                value={rewardValue}
                onChange={(event) => setRewardValue(event.target.value)}
                placeholder="1200"
                disabled={selectedProjectId === null || submittingTemplate}
              />
            </label>
          </div>

          {templateFormError ? (
            <div className="message message-error">{templateFormError}</div>
          ) : null}

          <button
            type="button"
            className="btn btn-primary"
            onClick={() => void handleTemplateSubmit()}
            disabled={selectedProjectId === null || submittingTemplate}
          >
            {submittingTemplate ? "创建中..." : "创建模板"}
          </button>
        </div>}

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
                {isReadonly ? null : (
                  <div className="template-item-actions">
                    <button
                      type="button"
                      className="btn"
                      onClick={() => onAddToToday && void onAddToToday(template)}
                      disabled={addingTemplateId === template.id}
                    >
                      {addingTemplateId === template.id ? "加入中..." : "加入今日"}
                    </button>
                  </div>
                )}
              </article>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
