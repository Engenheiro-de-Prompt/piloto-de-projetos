import React from 'react';

interface FilterBarProps {
    onSearch: (term: string) => void;
    onPriorityChange: (priority: string) => void;
    onAssigneeChange: (assignee: string) => void;
    allAssignees: string[];
    allPriorities: string[];
}

const FilterBar: React.FC<FilterBarProps> = ({ onSearch, onPriorityChange, onAssigneeChange, allAssignees, allPriorities }) => {
    return (
        <div className="p-4 bg-gray-800/50 border-b border-gray-700 flex flex-col md:flex-row items-center gap-4">
            <input
                type="text"
                placeholder="Pesquisar tarefas..."
                onChange={(e) => onSearch(e.target.value)}
                className="w-full md:w-1/3 px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-gray-200 placeholder-gray-400"
            />
            <div className="w-full md:w-auto flex flex-grow gap-4">
                <select 
                    onChange={(e) => onPriorityChange(e.target.value)}
                    className="flex-1 px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-gray-200"
                >
                    <option value="">Toda Prioridade</option>
                    {allPriorities.map(p => <option key={p} value={p}>{p}</option>)}
                </select>
                <select 
                    onChange={(e) => onAssigneeChange(e.target.value)}
                    className="flex-1 px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-gray-200"
                >
                    <option value="">Todo Responsável</option>
                    {allAssignees.map(assignee => (
                        <option key={assignee} value={assignee}>{assignee}</option>
                    ))}
                </select>
            </div>
        </div>
    );
};

export default FilterBar;