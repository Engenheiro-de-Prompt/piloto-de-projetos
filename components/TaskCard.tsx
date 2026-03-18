import React from 'react';
import { Task } from '../types';
import { UserIcon, CalendarIcon, TagIcon, ClockIcon, ParentTaskIcon, SubtaskIcon, RecurrenceIcon } from './icons/Icons';
import { createValidDate } from '../utils/dateUtils';
import { formatRuleToString } from '../utils/recurrenceUtils';

interface TaskCardProps {
  task: Task;
  onClick: () => void;
  onGoToParent?: (parentId: string) => void;
}

const PriorityPill: React.FC<{ priority?: string }> = ({ priority }) => {
    if (!priority) return null;
    const colors: { [key: string]: string } = {
        'Urgente': 'bg-purple-900/50 text-purple-300 border border-purple-700/50',
        'Alta': 'bg-red-900/50 text-red-300 border border-red-700/50',
        'Média': 'bg-yellow-900/50 text-yellow-300 border border-yellow-700/50',
        'Baixa': 'bg-blue-900/50 text-blue-300 border border-blue-700/50'
    };
    return <span className={`px-2 py-0.5 text-xs font-semibold rounded-full ${colors[priority] || 'bg-gray-600 text-gray-300'}`}>{priority}</span>
}


const TaskCard: React.FC<TaskCardProps> = ({ task, onClick, onGoToParent }) => {
  const validDueDate = createValidDate(task.Due_Date);
  const recurrenceSummary = task.Recurrence_Rule ? formatRuleToString(JSON.parse(task.Recurrence_Rule)) : null;


  return (
    <div onClick={onClick} className="bg-gray-700 rounded-lg shadow-sm border border-gray-600 p-4 cursor-pointer hover:shadow-lg hover:border-blue-500/50 transition-all duration-200">
      <div className="flex justify-between items-start">
        <p className="font-semibold text-gray-200 leading-tight pr-2">{task.Task_Name}</p>
        <div className="flex-shrink-0">
         <PriorityPill priority={task.Priority}/>
        </div>
      </div>
      {task.Task_Content && (
        <p className="text-sm text-gray-400 mt-2 line-clamp-2">{task.Task_Content}</p>
      )}
      <div className="mt-4 flex justify-between items-center text-sm text-gray-400">
        <div className="flex items-center space-x-3">
            {task.Assignees && (Array.isArray(task.Assignees) ? task.Assignees.length > 0 : task.Assignees) && <UserIcon className="w-4 h-4" title={Array.isArray(task.Assignees) ? task.Assignees.join(', ') : task.Assignees} />}
            {validDueDate && (
                <div className="flex items-center">
                    <CalendarIcon className="w-4 h-4 mr-1"/>
                    <span>{validDueDate.toLocaleDateString()}</span>
                </div>
            )}
             {task.Time_Spent_Text && task.Time_Spent_Text !== '0 m' && (
                <div className="flex items-center">
                    <ClockIcon className="w-4 h-4 mr-1 text-teal-400"/>
                    <span className="text-teal-400">{task.Time_Spent_Text}</span>
                </div>
            )}
        </div>
        <div className="flex items-center space-x-2">
             {recurrenceSummary && (
                <RecurrenceIcon className="w-4 h-4 text-cyan-400" title={recurrenceSummary} />
             )}
            {task.Parent_Task_ID && onGoToParent && (
                <button
                title="Ir para a tarefa pai"
                onClick={(e) => { e.stopPropagation(); onGoToParent(task.Parent_Task_ID!); }}
                className="flex items-center text-xs bg-gray-600/50 p-1 rounded hover:bg-gray-600"
                >
                <ParentTaskIcon className="w-4 h-4" />
                </button>
            )}
            {task.subtasks && task.subtasks.length > 0 && (
                <div className="flex items-center text-xs bg-gray-600/50 px-2 py-0.5 rounded" title={`${task.subtasks.length} subtarefas`}>
                <SubtaskIcon className="w-4 h-4 mr-1" />
                <span>{task.subtasks.length}</span>
                </div>
            )}
            {task.Tags && task.Tags.length > 0 && (
                <div className="flex items-center bg-gray-600/50 px-2 py-0.5 rounded">
                    <TagIcon className="w-3 h-3 mr-1 text-gray-500"/>
                    <span className="text-xs">{task.Tags[0]}</span>
                </div>
            )}
        </div>
      </div>
    </div>
  );
};

export default TaskCard;