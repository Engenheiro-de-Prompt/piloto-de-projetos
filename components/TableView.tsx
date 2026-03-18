import React, { useMemo, useState, useEffect, useRef } from 'react';
import { Task, ColumnConfig } from '../types';
import { ChevronUpIcon, ChevronDownIcon, SettingsIcon, ParentTaskIcon, RecurrenceIcon } from './icons/Icons';
import CollapsibleSection from './CollapsibleSection';
import { createValidDate, formatDateForInput } from '../utils/dateUtils';
import { formatRuleToString } from '../utils/recurrenceUtils';
import ColumnConfigModal from './ColumnConfigModal';

interface EditingCellProps {
  task: Task;
  columnKey: string;
  config: ColumnConfig;
  onSave: (task: Task, columnKey: string, newValue: any) => void;
  onCancel: () => void;
}

const EditingCell: React.FC<EditingCellProps> = ({ task, columnKey, config, onSave, onCancel }) => {
  const initialValue = task[columnKey];
  const [currentValue, setCurrentValue] = useState(initialValue);
  
  const handleSave = () => {
    onSave(task, columnKey, currentValue);
  };
  
  const commonProps = {
    value: currentValue ?? '',
    onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => setCurrentValue(e.target.value),
    onBlur: handleSave,
    onKeyDown: (e: React.KeyboardEvent) => {
        if (e.key === 'Enter') handleSave();
        if (e.key === 'Escape') onCancel();
    },
    autoFocus: true,
    className: "w-full h-full px-2 py-1 bg-gray-900 border border-blue-500 rounded-md text-gray-200"
  };
  
  switch (config.format) {
      case 'categorical':
          return (
              <select {...commonProps}>
                  <option value="">Nenhuma</option>
                  {config.options?.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
          );
      case 'date':
          return <input type="date" {...commonProps} value={formatDateForInput(createValidDate(currentValue))}/>
      case 'number':
          return <input type="number" {...commonProps} />
      case 'text':
      default:
           if (Array.isArray(initialValue)) {
                return <input type="text" {...commonProps} value={Array.isArray(currentValue) ? currentValue.join(', ') : (currentValue || '')} onChange={(e) => setCurrentValue(e.target.value)} />;
           }
          return <input type="text" {...commonProps} />;
  }
};


interface TableViewProps {
  tasks: Task[];
  onTaskClick: (task: Task) => void;
  onUpdateTask: (task: Task) => void;
  allStatuses: string[];
  allPriorities: string[];
  showCompletedToggle?: boolean;
  onGoToParent?: (parentId: string) => void;
}

type SortKey = keyof Task | string;
type SortDirection = 'asc' | 'desc';

const priorityOrder: { [key: string]: number } = {
  'Urgente': 4,
  'Alta': 3,
  'Média': 2,
  'Baixa': 1,
};

const STANDARD_FIELDS = new Set(['Task_ID', 'Task_Name', 'Task_Content', 'Space_Name', 'Folder_Name', 'List_Name', 'Status', 'Priority', 'Tags', 'Assignees', 'Due_Date', 'Time_Spent_Text', 'Comments', 'history', 'Date_Created', 'Last_Modified', 'Parent_Task_ID', 'subtasks', 'Recurrence_Rule']);

const TableView: React.FC<TableViewProps> = ({ tasks, onTaskClick, onUpdateTask, allStatuses, allPriorities, showCompletedToggle = true, onGoToParent }) => {
  const [sortKey, setSortKey] = useState<SortKey>('Task_Name');
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc');
  const [editingCell, setEditingCell] = useState<{ taskId: string; columnKey: string } | null>(null);
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());
  
  const [columnConfigs, setColumnConfigs] = useState<Record<string, ColumnConfig>>({});
  const [isColumnManagerOpen, setIsColumnManagerOpen] = useState(false);
  const [configuringColumnKey, setConfiguringColumnKey] = useState<string | null>(null);
  const columnManagerRef = useRef<HTMLDivElement>(null);


  useEffect(() => {
    const defaultVisible = ['Task_Name', 'Status', 'Priority', 'Assignees', 'Due_Date'];
    
    const allKeys = new Set<string>(['Task_Name', 'Status', 'Priority', 'Assignees', 'Due_Date', 'Space_Name', 'Folder_Name', 'List_Name', 'Tags', 'Time_Spent_Text', 'Task_Content']);
    tasks.forEach(task => {
        Object.keys(task).forEach(key => {
            if (!STANDARD_FIELDS.has(key)) {
                allKeys.add(key);
            }
        });
    });

    setColumnConfigs(prev => {
        const newConfigs: Record<string, ColumnConfig> = { ...prev };
        allKeys.forEach(key => {
            if (!newConfigs[key]) {
                 newConfigs[key] = {
                    key,
                    label: key.replace(/_/g, ' '),
                    isVisible: defaultVisible.includes(key),
                    format: 'text',
                 }
            }
            // Set smart defaults
            if (key === 'Status' && !newConfigs[key].options) {
                newConfigs[key].format = 'categorical';
                newConfigs[key].options = allStatuses;
            }
            if (key === 'Priority' && !newConfigs[key].options) {
                newConfigs[key].format = 'categorical';
                newConfigs[key].options = allPriorities;
            }
            if (key === 'Due_Date' && newConfigs[key].format === 'text') {
                newConfigs[key].format = 'date';
            }
        });
        return newConfigs;
    });
  }, [tasks, allStatuses, allPriorities]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (columnManagerRef.current && !columnManagerRef.current.contains(event.target as Node)) {
        setIsColumnManagerOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const visibleColumns = useMemo(() => {
    // FIX: Explicitly typed 'c' as ColumnConfig to fix type inference issue where 'c' was treated as 'unknown'.
      return Object.values(columnConfigs).filter((c: ColumnConfig) => c.isVisible).map((c: ColumnConfig) => c.key);
  }, [columnConfigs]);
  
  const { completedTasks, activeTasks } = useMemo(() => {
      return {
          completedTasks: tasks.filter(t => t.Status === 'Concluído' && !t.Parent_Task_ID),
          activeTasks: tasks.filter(t => t.Status !== 'Concluído' && !t.Parent_Task_ID)
      };
  }, [tasks]);

  const sortedTasks = useMemo(() => {
    const tasksToSort = showCompletedToggle ? activeTasks : tasks.filter(t => !t.Parent_Task_ID);
    if (!sortKey) return tasksToSort;
    
    return [...tasksToSort].sort((a, b) => {
      const aValue = a[sortKey];
      const bValue = b[sortKey];
      
      if (sortKey === 'Priority') {
        const aPriority = priorityOrder[aValue as string] || 0;
        const bPriority = priorityOrder[bValue as string] || 0;
        return sortDirection === 'asc' ? aPriority - bPriority : bPriority - aPriority;
      }

      if (aValue == null) return 1;
      if (bValue == null) return -1;

      if (typeof aValue === 'string' && typeof bValue === 'string') {
        return sortDirection === 'asc' ? aValue.localeCompare(bValue) : bValue.localeCompare(aValue);
      }

      if (aValue < bValue) return sortDirection === 'asc' ? -1 : 1;
      if (aValue > bValue) return sortDirection === 'asc' ? 1 : -1;
      return 0;
    });
  }, [activeTasks, tasks, showCompletedToggle, sortKey, sortDirection]);

  const handleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      setSortKey(key);
      setSortDirection('asc');
    }
  };
  
  const handleCellSave = (task: Task, columnKey: string, newValue: any) => {
    let finalValue = newValue;
    const config = columnConfigs[columnKey];

    if (config && (config.key === 'Assignees' || config.key === 'Tags') && typeof newValue === 'string') {
        finalValue = newValue.split(',').map(s => s.trim()).filter(Boolean);
    } else if (config && config.format === 'date' && newValue) {
        finalValue = new Date(`${newValue}T00:00:00`).toISOString();
    }
    
    if (task[columnKey] !== finalValue) {
        onUpdateTask({ ...task, [columnKey]: finalValue });
    }
    setEditingCell(null);
  };
  
  const handleToggleColumn = (columnKey: string) => {
    setColumnConfigs(prev => ({
        ...prev,
        [columnKey]: { ...prev[columnKey], isVisible: !prev[columnKey].isVisible }
    }));
  };

  const handleAddNewColumn = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
        const newColumnName = e.currentTarget.value.trim();
        if (newColumnName && !columnConfigs[newColumnName]) {
            setColumnConfigs(prev => ({
                ...prev,
                [newColumnName]: {
                    key: newColumnName,
                    label: newColumnName,
                    format: 'text',
                    isVisible: true
                }
            }));
            e.currentTarget.value = '';
        }
    }
  };

  const renderCellContent = (task: Task, columnKey: string) => {
    const value = task[columnKey];
    if (value == null) return <span className="text-gray-500">N/D</span>;
    if (columnConfigs[columnKey]?.format === 'date') return createValidDate(value)?.toLocaleDateString() ?? <span className="text-gray-500">N/D</span>;
    if (Array.isArray(value)) return value.join(', ');
    return String(value);
  }

  const toggleRowExpansion = (taskId: string) => {
    setExpandedRows(prev => {
      const newSet = new Set(prev);
      if (newSet.has(taskId)) {
        newSet.delete(taskId);
      } else {
        newSet.add(taskId);
      }
      return newSet;
    });
  };

  const renderRows = (tasksToRender: Task[], level: number): React.ReactNode => {
    return tasksToRender.map(task => {
        const isExpanded = expandedRows.has(task.Task_ID);
        const recurrenceSummary = task.Recurrence_Rule ? formatRuleToString(JSON.parse(task.Recurrence_Rule)) : null;

        return (
            <React.Fragment key={task.Task_ID}>
                <tr className="bg-gray-800 border-b border-gray-700 hover:bg-gray-700">
                    {visibleColumns.map((key, index) => {
                        const isEditing = editingCell?.taskId === task.Task_ID && editingCell.columnKey === key;
                        const config = columnConfigs[key];
                        
                        const handleCellClick = () => {
                          if (isEditing || !config) return;
                          if (key === 'Task_Name') {
                            onTaskClick(task);
                          } else {
                            setEditingCell({ taskId: task.Task_ID, columnKey: key });
                          }
                        };
                        
                        const cellTitle = key === 'Task_Name' ? "Clique para ver detalhes" : "Clique para editar";

                        return (
                            <td 
                                key={key} 
                                onClick={handleCellClick}
                                className="px-6 py-2 font-medium text-gray-300 whitespace-nowrap cursor-pointer relative h-10"
                                title={cellTitle}
                                style={index === 0 ? { paddingLeft: `${1.5 + level * 1.5}rem` } : {}}
                            >
                                <div className="flex items-center">
                                    {index === 0 && (
                                        task.subtasks && task.subtasks.length > 0 ? (
                                            <button onClick={(e) => { e.stopPropagation(); toggleRowExpansion(task.Task_ID); }} className="mr-2 -ml-1 p-1 text-gray-500 hover:text-gray-200">
                                                <ChevronDownIcon className={`w-4 h-4 transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
                                            </button>
                                        ) : <div className="w-7 mr-2"></div>
                                    )}
                                    {isEditing && config
                                        ? <EditingCell task={task} columnKey={key} config={config} onSave={handleCellSave} onCancel={() => setEditingCell(null)} /> 
                                        : <span className="truncate">{renderCellContent(task, key)}</span>
                                    }
                                    {index === 0 && recurrenceSummary && (
                                        <RecurrenceIcon className="w-4 h-4 ml-2 text-cyan-400" title={recurrenceSummary} />
                                    )}
                                    {index === 0 && task.Parent_Task_ID && onGoToParent && (
                                        <button onClick={(e) => { e.stopPropagation(); onGoToParent(task.Parent_Task_ID!); }} title="Ir para tarefa pai" className="ml-2 text-gray-500 hover:text-blue-400">
                                            <ParentTaskIcon className="w-4 h-4" />
                                        </button>
                                    )}
                                </div>
                            </td>
                        );
                    })}
                </tr>
                {isExpanded && task.subtasks && task.subtasks.length > 0 && renderRows(task.subtasks, level + 1)}
            </React.Fragment>
        );
    });
  };

  const renderTable = (tasksToRender: Task[]) => (
    <div className="bg-gray-800 shadow-md rounded-lg overflow-hidden border border-gray-700">
      <div className="overflow-x-auto">
        <table className="w-full text-sm text-left text-gray-400">
          <thead className="text-xs text-gray-400 uppercase bg-gray-700/50">
            <tr>
              {visibleColumns.map(key => (
                <th key={key} scope="col" className="px-6 py-3 whitespace-nowrap">
                  <div className="flex items-center cursor-pointer" onClick={() => handleSort(key)}>
                    {columnConfigs[key]?.label || key.replace(/_/g, ' ')}
                    {sortKey === key && (sortDirection === 'asc' ? <ChevronUpIcon className="w-4 h-4 ml-1" /> : <ChevronDownIcon className="w-4 h-4 ml-1" />)}
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {renderRows(tasksToRender, 0)}
            {tasksToRender.length === 0 && (
                <tr>
                    <td colSpan={visibleColumns.length} className="text-center py-8 text-gray-500">Nenhuma tarefa para exibir.</td>
                </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );

  return (
    <div className="space-y-4">
        <div className="flex justify-end">
            <div className="relative" ref={columnManagerRef}>
                <button onClick={() => setIsColumnManagerOpen(prev => !prev)} className="flex items-center gap-2 text-sm px-3 py-2 bg-gray-700 hover:bg-gray-600 rounded-md">
                    <SettingsIcon className="w-5 h-5"/>
                    Gerenciar Colunas
                </button>
                {isColumnManagerOpen && (
                    <div className="absolute right-0 top-full mt-2 w-72 bg-gray-800 border border-gray-700 rounded-lg shadow-xl z-10 p-4">
                        <h4 className="font-semibold mb-2">Colunas Visíveis</h4>
                        <div className="max-h-60 overflow-y-auto space-y-1 pr-2 text-sm">
                            {/* FIX: Explicitly typed 'config' as ColumnConfig to fix type inference issue where 'config' was treated as 'unknown'. */}
                            {Object.values(columnConfigs).map((config: ColumnConfig) => (
                                <div key={config.key} className="flex items-center justify-between gap-2 p-1 hover:bg-gray-700 rounded-md">
                                    <label className="flex items-center gap-2 flex-grow cursor-pointer">
                                        <input type="checkbox" checked={config.isVisible} onChange={() => handleToggleColumn(config.key)} className="form-checkbox bg-gray-700 border-gray-600 text-blue-500 focus:ring-blue-500/50"/>
                                        <span className="capitalize">{config.label}</span>
                                    </label>
                                    <button onClick={() => { setConfiguringColumnKey(config.key); setIsColumnManagerOpen(false); }} className="p-1 text-gray-400 hover:text-white">
                                      <SettingsIcon className="w-4 h-4" />
                                    </button>
                                </div>
                            ))}
                        </div>
                        <div className="mt-4 pt-4 border-t border-gray-700">
                            <label className="text-sm font-semibold">Adicionar Nova Coluna</label>
                            <input
                                type="text"
                                placeholder="Pressione Enter para adicionar"
                                onKeyDown={handleAddNewColumn}
                                className="mt-1 w-full px-2 py-1 text-sm bg-gray-900 border border-gray-600 rounded-md text-gray-200"
                            />
                        </div>
                    </div>
                )}
            </div>
        </div>

        {renderTable(sortedTasks)}

        {showCompletedToggle && completedTasks.length > 0 && (
            <CollapsibleSection title={`Concluídas (${completedTasks.length})`} defaultCollapsed>
                <div className="mt-4">
                    {renderTable(completedTasks)}
                </div>
            </CollapsibleSection>
        )}
        
        {configuringColumnKey && columnConfigs[configuringColumnKey] && (
            <ColumnConfigModal
              columnConfig={columnConfigs[configuringColumnKey]}
              onClose={() => setConfiguringColumnKey(null)}
              onSave={(newConfig) => {
                  setColumnConfigs(prev => ({
                    ...prev,
                    [newConfig.key]: newConfig
                  }));
                  setConfiguringColumnKey(null);
              }}
            />
        )}
    </div>
  );
};

export default TableView;
