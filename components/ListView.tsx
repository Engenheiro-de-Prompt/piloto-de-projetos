import React, { useMemo } from 'react';
import { Task } from '../types';
import TaskCard from './TaskCard';
import CollapsibleSection from './CollapsibleSection';

interface ListViewProps {
  tasks: Task[];
  onTaskClick: (task: Task) => void;
  onGoToParent: (parentId: string) => void;
}

const TaskListItem: React.FC<{ 
  task: Task; 
  level: number; 
  onTaskClick: (task: Task) => void; 
  onGoToParent: (id: string) => void 
}> = ({ task, level, onTaskClick, onGoToParent }) => {
  return (
    <div style={{ marginLeft: `${level * 24}px` }}>
      <TaskCard task={task} onClick={() => onTaskClick(task)} onGoToParent={onGoToParent} />
      {task.subtasks && task.subtasks.length > 0 && (
        <div className="mt-3 space-y-3">
          {task.subtasks.map(subtask => (
            <TaskListItem key={subtask.Task_ID} task={subtask} level={level + 1} onTaskClick={onTaskClick} onGoToParent={onGoToParent} />
          ))}
        </div>
      )}
    </div>
  );
};


const ListView: React.FC<ListViewProps> = ({ tasks, onTaskClick, onGoToParent }) => {
  const { completedTasks, activeTasks } = useMemo(() => {
    // Separa apenas as tarefas raiz em seções ativas e concluídas.
    // As subtarefas serão renderizadas sob seus pais, independentemente do status.
    const completedRootTasks = tasks.filter(t => t.Status === 'Concluído');
    const activeRootTasks = tasks.filter(t => t.Status !== 'Concluído');
    return { completedTasks: completedRootTasks, activeTasks: activeRootTasks };
  }, [tasks]);

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="space-y-3">
        {activeTasks.map(task => (
          <TaskListItem key={task.Task_ID} task={task} level={0} onTaskClick={onTaskClick} onGoToParent={onGoToParent} />
        ))}
      </div>

      {completedTasks.length > 0 && (
        <CollapsibleSection title={`Concluídas (${completedTasks.length})`} defaultCollapsed={true}>
          <div className="space-y-3 mt-4">
            {completedTasks.map(task => (
             <TaskListItem key={task.Task_ID} task={task} level={0} onTaskClick={onTaskClick} onGoToParent={onGoToParent} />
            ))}
          </div>
        </CollapsibleSection>
      )}
    </div>
  );
};

export default ListView;