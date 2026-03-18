import React, { useMemo, useState } from 'react';
import { Task } from '../types';
import TaskCard from './TaskCard';
import { ChevronDownIcon } from './icons/Icons';

interface KanbanBoardProps {
  tasks: Task[];
  onTaskClick: (task: Task) => void;
  onGoToParent: (parentId: string) => void;
}

const STATUS_ORDER = ['A Fazer', 'Em Andamento', 'Em Revisão', 'Bloqueado', 'Concluído'];

const KanbanColumn: React.FC<{ title: string; tasks: Task[]; onTaskClick: (task: Task) => void; onGoToParent: (parentId: string) => void; }> = ({ title, tasks, onTaskClick, onGoToParent }) => {
  const [isCollapsed, setIsCollapsed] = useState(title === 'Concluído');

  const statusColorMap: { [key: string]: string } = {
    'A Fazer': 'border-t-gray-400',
    'Em Andamento': 'border-t-blue-400',
    'Em Revisão': 'border-t-purple-400',
    'Concluído': 'border-t-green-400',
    'Bloqueado': 'border-t-red-400',
  };

  return (
    <div className="w-80 bg-gray-800 rounded-lg p-3 flex-shrink-0 flex flex-col transition-all duration-300">
      <div className={`flex justify-between items-center mb-4 pb-2 border-b-2 border-gray-700 ${statusColorMap[title] || 'border-t-gray-500'}`}>
        <h3 className="font-semibold text-gray-300">{title}</h3>
        <div className="flex items-center space-x-2">
            <span className="bg-gray-700 text-gray-300 text-sm font-bold px-2 py-1 rounded-full">{tasks.length}</span>
            {title === 'Concluído' && (
              <button onClick={() => setIsCollapsed(!isCollapsed)} className="text-gray-400 hover:text-white">
                  <ChevronDownIcon className={`w-5 h-5 transition-transform ${isCollapsed ? '' : 'rotate-180'}`} />
              </button>
            )}
        </div>
      </div>
      {!isCollapsed && (
        <div className="flex-1 overflow-y-auto space-y-3 pr-1">
          {tasks.map(task => (
            <TaskCard key={task.Task_ID} task={task} onClick={() => onTaskClick(task)} onGoToParent={onGoToParent} />
          ))}
        </div>
      )}
    </div>
  );
};


const KanbanBoard: React.FC<KanbanBoardProps> = ({ tasks, onTaskClick, onGoToParent }) => {
  const columns = useMemo(() => {
    const grouped: { [key: string]: Task[] } = {};
    
    STATUS_ORDER.forEach(status => {
        grouped[status] = [];
    });

    tasks.forEach(task => {
      const status = task.Status || 'A Fazer';
      if (!grouped[status]) {
        grouped[status] = []; 
      }
      grouped[status].push(task);
    });
    
    return Object.entries(grouped).sort(([a], [b]) => {
      const indexA = STATUS_ORDER.indexOf(a);
      const indexB = STATUS_ORDER.indexOf(b);
      if (indexA === -1 && indexB === -1) return a.localeCompare(b);
      if (indexA === -1) return 1;
      if (indexB === -1) return -1;
      return indexA - indexB;
    });

  }, [tasks]);

  return (
    <div className="flex space-x-4 overflow-x-auto pb-4 h-full">
      {columns.map(([status, tasksInColumn]) => (
        <KanbanColumn key={status} title={status} tasks={tasksInColumn} onTaskClick={onTaskClick} onGoToParent={onGoToParent} />
      ))}
    </div>
  );
};

export default KanbanBoard;