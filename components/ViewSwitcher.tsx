
import React from 'react';
import { ViewType } from '../types';
import { HomeIcon, KanbanIcon, ListIcon, TableIcon } from './icons/Icons';

interface ViewSwitcherProps {
  currentView: ViewType;
  onViewChange: (view: ViewType) => void;
}

const views: { id: ViewType; name: string; icon: React.FC<React.SVGProps<SVGSVGElement>> }[] = [
  { id: 'home', name: 'Início', icon: HomeIcon },
  { id: 'kanban', name: 'Kanban', icon: KanbanIcon },
  { id: 'list', name: 'Lista', icon: ListIcon },
  { id: 'table', name: 'Tabela', icon: TableIcon },
];

const ViewSwitcher: React.FC<ViewSwitcherProps> = ({ currentView, onViewChange }) => {
  return (
    <div className="flex items-center bg-gray-900 rounded-lg p-1 border border-gray-700">
      {views.map((view) => (
        <button
          key={view.id}
          onClick={() => onViewChange(view.id)}
          className={`px-3 py-1 text-sm font-semibold flex items-center rounded-md transition-colors ${
            currentView === view.id
              ? 'bg-gray-700 text-blue-300'
              : 'text-gray-400 hover:bg-gray-700/50'
          }`}
        >
          <view.icon className="w-4 h-4 mr-2" />
          {view.name}
        </button>
      ))}
    </div>
  );
};

export default ViewSwitcher;
