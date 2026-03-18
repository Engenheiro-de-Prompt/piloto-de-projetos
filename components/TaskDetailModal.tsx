import React, { useState, useEffect, useMemo } from 'react';
import { Task, Comment, RecurrenceRule } from '../types';
import { XIcon, PlayIcon, PauseIcon, ClockIcon, TrashIcon, PlusIcon, ParentTaskIcon, RecurrenceIcon } from './icons/Icons';
import { createValidDate, formatDateForInput } from '../utils/dateUtils';
import { parseTimeTextToSeconds, formatSecondsToTimeText } from '../utils/timeUtils';
import { formatRuleToString } from '../utils/recurrenceUtils';
import CollapsibleSection from './CollapsibleSection';
import RecurrenceEditor from './RecurrenceEditor';


interface TaskDetailModalProps {
  task: Task;
  onClose: () => void;
  onUpdate: (taskData: Task) => void;
  allStatuses: string[];
  allPriorities: string[];
  onCreateTask: (taskData: Omit<Task, 'Task_ID'>) => void;
  onSelectTaskById: (taskId: string) => void;
}

const formatSecondsToClock = (seconds: number = 0): string => {
    const h = Math.floor(seconds / 3600).toString().padStart(2, '0');
    const m = Math.floor((seconds % 3600) / 60).toString().padStart(2, '0');
    const s = Math.floor(seconds % 60).toString().padStart(2, '0');
    return `${h}:${m}:${s}`;
};

const TaskDetailModal: React.FC<TaskDetailModalProps> = ({ task, onClose, onUpdate, allStatuses, allPriorities, onCreateTask, onSelectTaskById }) => {
    const [editableTask, setEditableTask] = useState<Task>(task);
    const [trackedSeconds, setTrackedSeconds] = useState<number>(0);
    const [newComment, setNewComment] = useState('');
    const [isTracking, setIsTracking] = useState(false);
    const [isAddingField, setIsAddingField] = useState(false);
    const [newFieldName, setNewFieldName] = useState('');
    const [newFieldValue, setNewFieldValue] = useState('');
    const [newSubtaskName, setNewSubtaskName] = useState('');
    const [isRecurrenceEditorOpen, setRecurrenceEditorOpen] = useState(false);


    useEffect(() => {
        setEditableTask(task);
        setTrackedSeconds(parseTimeTextToSeconds(task.Time_Spent_Text || ''));
    }, [task]);

    const comments = useMemo((): Comment[] => {
        try {
            return JSON.parse(editableTask.Comments || '[]');
        } catch {
            return [];
        }
    }, [editableTask.Comments]);
    
    const recurrenceRule = useMemo((): RecurrenceRule | null => {
        try {
            return editableTask.Recurrence_Rule ? JSON.parse(editableTask.Recurrence_Rule) : null;
        } catch {
            return null;
        }
    }, [editableTask.Recurrence_Rule]);

    const handleFieldChange = (field: keyof Task, value: any) => {
        setEditableTask(prev => ({ ...prev, [field]: value }));
    };
    
    const handleCustomFieldChange = (field: string, value: any) => {
        setEditableTask(prev => ({ ...prev, [field]: value }));
    };

    const handleSave = () => {
        const finalTaskState = {
            ...editableTask,
            Time_Spent_Text: formatSecondsToTimeText(trackedSeconds)
        };
        delete finalTaskState.history; 
        delete finalTaskState.subtasks;
        onUpdate(finalTaskState);
        onClose();
    };
    
    const handleAddComment = () => {
        if (!newComment.trim()) return;
        const comment: Comment = {
            author: "Usuário",
            text: newComment.trim(),
            timestamp: new Date().toISOString()
        };
        const updatedComments = [...comments, comment];
        handleFieldChange('Comments', JSON.stringify(updatedComments));
        setNewComment('');
    };

    const handleAddNewField = () => {
        if (newFieldName.trim() && !editableTask.hasOwnProperty(newFieldName.trim())) {
            handleCustomFieldChange(newFieldName.trim(), newFieldValue);
        }
        setNewFieldName('');
        setNewFieldValue('');
        setIsAddingField(false);
    }
    
    const handleDeleteCustomField = (keyToDelete: string) => {
        setEditableTask(prev => {
            const newT = { ...prev };
            newT[keyToDelete] = ""; 
            return newT;
        });
    };

    const handleAddSubtask = () => {
        if (!newSubtaskName.trim()) return;
        
        const subtaskData = {
            Task_Name: newSubtaskName.trim(),
            Parent_Task_ID: editableTask.Task_ID,
            Space_Name: editableTask.Space_Name,
            Folder_Name: editableTask.Folder_Name,
            List_Name: editableTask.List_Name,
            Status: allStatuses.includes('A Fazer') ? 'A Fazer' : (allStatuses[0] || 'A Fazer'),
        };
        onCreateTask(subtaskData);
        setNewSubtaskName('');
    };

    const handleViewParent = () => {
        if (editableTask.Parent_Task_ID) {
            onSelectTaskById(editableTask.Parent_Task_ID);
        }
    };
    
    const handleRecurrenceSave = (rule: RecurrenceRule) => {
        handleFieldChange('Recurrence_Rule', JSON.stringify(rule));
        setRecurrenceEditorOpen(false);
    };

    const handleRecurrenceRemove = () => {
        handleFieldChange('Recurrence_Rule', undefined);
        setRecurrenceEditorOpen(false);
    };

    useEffect(() => {
        let interval: number | null = null;
        if (isTracking) {
            interval = window.setInterval(() => {
                setTrackedSeconds(prev => prev + 1);
            }, 1000);
        }
        return () => {
            if (interval) clearInterval(interval);
        };
    }, [isTracking]);
    
    const standardFields = useMemo(() => new Set(['Task_ID', 'Task_Name', 'Task_Content', 'Space_Name', 'Folder_Name', 'List_Name', 'Status', 'Priority', 'Tags', 'Assignees', 'Due_Date', 'Time_Spent_Text', 'Comments', 'history', 'Date_Created', 'Last_Modified', 'Parent_Task_ID', 'subtasks', 'Recurrence_Rule']), []);
    
    const { filledCustomFields, emptyCustomFields } = useMemo(() => {
        const filled: string[] = [];
        const empty: string[] = [];
        Object.keys(editableTask).forEach(key => {
            if (!standardFields.has(key)) {
                if (editableTask[key] !== '' && editableTask[key] != null) {
                    filled.push(key);
                } else {
                    empty.push(key);
                }
            }
        });
        return { filledCustomFields: filled, emptyCustomFields: empty };
    }, [editableTask, standardFields]);

    const renderCustomFieldInput = (key: string) => (
      <div key={key} className="flex items-end space-x-2">
          <div className="flex-grow">
              <label className="text-sm font-semibold text-gray-400 capitalize">{key.replace(/_/g, ' ')}</label>
              <input type="text" value={editableTask[key] || ''} onChange={e => handleCustomFieldChange(key, e.target.value)} className="mt-1 w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-gray-200" />
          </div>
          <button onClick={() => handleDeleteCustomField(key)} className="p-2 text-gray-500 hover:text-red-400 rounded-md hover:bg-gray-700">
              <TrashIcon className="w-5 h-5"/>
          </button>
      </div>
    );

    const validDueDate = createValidDate(editableTask.Due_Date);
    const dueDateForInput = formatDateForInput(validDueDate);
    const recurrenceSummary = recurrenceRule ? formatRuleToString(recurrenceRule) : null;


    return (
        <div className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-50 p-4" onClick={onClose}>
            <div className="bg-gray-800 rounded-lg shadow-xl w-full max-w-4xl border border-gray-700 flex flex-col max-h-[90vh]" onClick={e => e.stopPropagation()}>
                <div className="p-4 border-b border-gray-700 flex justify-between items-center flex-shrink-0">
                    <div className="flex-grow">
                        {editableTask.Parent_Task_ID && (
                            <button onClick={handleViewParent} className="text-sm text-blue-400 hover:text-blue-300 flex items-center mb-1">
                                <ParentTaskIcon className="w-4 h-4 mr-2"/>
                                <span>Ver tarefa pai</span>
                            </button>
                        )}
                        <input
                            type="text"
                            value={editableTask.Task_Name}
                            onChange={(e) => handleFieldChange('Task_Name', e.target.value)}
                            className="text-2xl font-bold text-gray-100 bg-transparent w-full focus:outline-none focus:ring-1 focus:ring-blue-500 rounded-md px-2"
                        />
                    </div>
                    <button onClick={onClose} className="text-gray-400 hover:text-white ml-4 self-start">
                        <XIcon className="w-6 h-6" />
                    </button>
                </div>
                
                <div className="flex-grow overflow-y-auto p-6">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
                        {/* Status */}
                        <div>
                            <label className="text-sm font-semibold text-gray-400">Status</label>
                            <select value={editableTask.Status} onChange={e => handleFieldChange('Status', e.target.value)} className="mt-1 w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-gray-200">
                                {allStatuses.map(s => <option key={s} value={s}>{s}</option>)}
                            </select>
                        </div>
                        {/* Priority */}
                        <div>
                            <label className="text-sm font-semibold text-gray-400">Prioridade</label>
                             <select value={editableTask.Priority || ''} onChange={e => handleFieldChange('Priority', e.target.value)} className="mt-1 w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-gray-200">
                                <option value="">Nenhuma</option>
                                {allPriorities.map(p => <option key={p} value={p}>{p}</option>)}
                            </select>
                        </div>
                         {/* Due Date */}
                        <div className="relative">
                            <label className="text-sm font-semibold text-gray-400">Data de Entrega</label>
                            <div className="flex items-center space-x-2">
                                <input
                                    type="date"
                                    value={dueDateForInput}
                                    onChange={e => {
                                        const newDate = e.target.value ? new Date(`${e.target.value}T00:00:00`).toISOString() : '';
                                        handleFieldChange('Due_Date', newDate);
                                        // If recurrence exists, update its nextDueDate if it's in the past
                                        if (recurrenceRule && newDate) {
                                            const rule = { ...recurrenceRule, nextDueDate: newDate };
                                            handleFieldChange('Recurrence_Rule', JSON.stringify(rule));
                                        }
                                    }}
                                    className="mt-1 w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-gray-200"/>
                                 <button onClick={() => setRecurrenceEditorOpen(true)} className="mt-1 p-2 bg-gray-700 hover:bg-gray-600 rounded-lg" title="Configurar recorrência">
                                    <RecurrenceIcon className={`w-5 h-5 ${recurrenceRule ? 'text-cyan-400' : 'text-gray-400'}`} />
                                </button>
                            </div>
                             {recurrenceSummary && (
                                <p className="text-xs text-cyan-400 mt-1">{recurrenceSummary}</p>
                            )}
                             {isRecurrenceEditorOpen && (
                                <RecurrenceEditor 
                                    rule={recurrenceRule}
                                    baseDate={editableTask.Due_Date}
                                    onSave={handleRecurrenceSave}
                                    onRemove={handleRecurrenceRemove}
                                    onClose={() => setRecurrenceEditorOpen(false)}
                                />
                            )}
                        </div>
                         {/* Assignees */}
                        <div>
                             <label className="text-sm font-semibold text-gray-400">Responsáveis</label>
                             <input type="text" value={Array.isArray(editableTask.Assignees) ? editableTask.Assignees.join(', ') : (editableTask.Assignees || '')} onChange={e => handleFieldChange('Assignees', e.target.value.split(',').map(s => s.trim()))} className="mt-1 w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-gray-200" placeholder="Separados por vírgula" />
                        </div>
                    </div>
                     {/* Time Tracking */}
                     <div className="mb-6 bg-gray-700/50 p-4 rounded-lg flex items-center justify-between">
                        <div className="flex items-center">
                            <ClockIcon className="w-6 h-6 mr-3 text-teal-400"/>
                            <div>
                                <h4 className="text-sm font-semibold text-gray-400">Tempo Rastreado</h4>
                                <p className="text-2xl font-mono text-gray-100">{formatSecondsToClock(trackedSeconds)}</p>
                            </div>
                        </div>
                        <button onClick={() => setIsTracking(!isTracking)} className={`px-4 py-2 rounded-lg font-semibold flex items-center ${isTracking ? 'bg-red-600 hover:bg-red-700' : 'bg-green-600 hover:bg-green-700'}`}>
                            {isTracking ? <><PauseIcon className="w-5 h-5 mr-2"/> Pausar</> : <><PlayIcon className="w-5 h-5 mr-2"/> Iniciar</>}
                        </button>
                    </div>

                    {/* Description */}
                    <div className="mb-6">
                        <h3 className="text-lg font-semibold text-gray-300 mb-2">Descrição</h3>
                        <textarea value={editableTask.Task_Content || ''} onChange={e => handleFieldChange('Task_Content', e.target.value)} rows={5} className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-gray-200" placeholder="Adicione uma descrição detalhada..."></textarea>
                    </div>

                    {/* Subtasks Section */}
                    <div className="mb-6">
                        <h3 className="text-lg font-semibold text-gray-300 mb-2">Subtarefas</h3>
                        <div className="space-y-2 max-h-40 overflow-y-auto bg-gray-900/50 p-3 rounded-lg">
                            {editableTask.subtasks && editableTask.subtasks.length > 0 ? (
                            editableTask.subtasks.map(subtask => (
                                <div key={subtask.Task_ID} onClick={() => onSelectTaskById(subtask.Task_ID)} className="flex justify-between items-center p-2 rounded-md hover:bg-gray-700 cursor-pointer">
                                <span className="text-gray-300">{subtask.Task_Name}</span>
                                <span className="text-xs bg-gray-600 text-gray-400 px-2 py-1 rounded-full">{subtask.Status}</span>
                                </div>
                            ))
                            ) : <p className="text-sm text-gray-500">Nenhuma subtarefa.</p>}
                        </div>
                        <div className="mt-3 flex space-x-2">
                            <input 
                                type="text" 
                                value={newSubtaskName}
                                onChange={e => setNewSubtaskName(e.target.value)}
                                onKeyDown={e => { if(e.key === 'Enter') handleAddSubtask() }}
                                placeholder="Adicionar uma subtarefa..." 
                                className="flex-grow w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-gray-200" 
                            />
                            <button onClick={handleAddSubtask} className="bg-blue-600 text-white font-semibold px-4 py-2 rounded-lg hover:bg-blue-700 flex-shrink-0">
                                Adicionar
                            </button>
                        </div>
                    </div>

                    {/* Custom Fields */}
                    <div className="mb-6">
                        <h3 className="text-lg font-semibold text-gray-300 mb-2">Campos Personalizados</h3>
                        <div className="space-y-3">
                          {filledCustomFields.map(key => renderCustomFieldInput(key))}
                        </div>

                        {emptyCustomFields.length > 0 && (
                            <div className="mt-4">
                                <CollapsibleSection title={`Campos Vazios (${emptyCustomFields.length})`} defaultCollapsed>
                                    <div className="space-y-3 mt-4">
                                        {emptyCustomFields.map(key => renderCustomFieldInput(key))}
                                    </div>
                                </CollapsibleSection>
                            </div>
                        )}

                        {isAddingField ? (
                            <div className="mt-4 p-3 bg-gray-700/50 rounded-lg flex items-end space-x-2">
                                <div className="flex-grow">
                                    <label className="text-sm font-semibold text-gray-400">Nome do Campo</label>
                                    <input type="text" value={newFieldName} onChange={e => setNewFieldName(e.target.value)} className="mt-1 w-full px-3 py-2 bg-gray-900 border border-gray-600 rounded-lg text-gray-200" placeholder="Ex: Custo"/>
                                </div>
                                 <div className="flex-grow">
                                    <label className="text-sm font-semibold text-gray-400">Valor</label>
                                    <input type="text" value={newFieldValue} onChange={e => setNewFieldValue(e.target.value)} className="mt-1 w-full px-3 py-2 bg-gray-900 border border-gray-600 rounded-lg text-gray-200"/>
                                </div>
                                <button onClick={handleAddNewField} className="bg-blue-600 text-white font-semibold px-4 py-2 rounded-lg hover:bg-blue-700">Adicionar</button>
                            </div>
                        ) : (
                            <button onClick={() => setIsAddingField(true)} className="mt-4 flex items-center text-sm text-blue-400 hover:text-blue-300">
                                <PlusIcon className="w-4 h-4 mr-2"/>
                                Adicionar Campo Personalizado
                            </button>
                        )}
                    </div>

                    {/* History */}
                    {task.history && task.history.length > 0 && (
                        <CollapsibleSection title="Histórico de Eventos" defaultCollapsed>
                            <div className="mt-4 space-y-4 max-h-48 overflow-y-auto bg-gray-900/50 p-3 rounded-lg">
                                {task.history.map((event, index) => {
                                    const eventDate = createValidDate(event.Last_Modified) || createValidDate(event.Date_Created);
                                    return (
                                        <div key={index} className="text-sm border-b border-gray-700/50 pb-2 last:border-b-0">
                                            <p className="font-semibold text-gray-400">
                                                Alterado em: <span className="text-gray-300">{eventDate?.toLocaleString() ?? 'Data inválida'}</span>
                                            </p>
                                            <ul className="list-disc pl-5 mt-1 text-gray-500">
                                                <li>Status: <span className="text-gray-400">{event.Status}</span></li>
                                                <li>Prioridade: <span className="text-gray-400">{event.Priority || 'N/D'}</span></li>
                                                <li>Responsáveis: <span className="text-gray-400">{Array.isArray(event.Assignees) ? event.Assignees.join(', ') : event.Assignees || 'N/D'}</span></li>
                                            </ul>
                                        </div>
                                    );
                                })}
                            </div>
                        </CollapsibleSection>
                    )}

                    {/* Comments */}
                    <div className="mt-6">
                        <h3 className="text-lg font-semibold text-gray-300 mb-2">Comentários</h3>
                        <div className="space-y-4 max-h-48 overflow-y-auto bg-gray-900/50 p-3 rounded-lg">
                            {comments.length > 0 ? comments.map((c, i) => (
                                <div key={i} className="text-sm">
                                    <p className="font-semibold text-gray-300">{c.author} <span className="text-xs text-gray-500 ml-2">{new Date(c.timestamp).toLocaleString()}</span></p>
                                    <p className="text-gray-400">{c.text}</p>
                                </div>
                            )) : <p className="text-sm text-gray-500">Nenhum comentário ainda.</p>}
                        </div>
                         <div className="mt-4 flex space-x-2">
                            <input type="text" value={newComment} onChange={e => setNewComment(e.target.value)} placeholder="Adicionar um comentário..." className="flex-grow w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-gray-200" />
                            <button onClick={handleAddComment} className="bg-blue-600 text-white font-semibold px-4 py-2 rounded-lg hover:bg-blue-700">Enviar</button>
                        </div>
                    </div>
                </div>

                <div className="p-4 bg-gray-800/50 border-t border-gray-700 flex justify-end flex-shrink-0">
                    <button onClick={handleSave} className="bg-blue-600 text-white font-bold px-6 py-2 rounded-lg hover:bg-blue-700 transition-colors duration-200">
                        Salvar Alterações
                    </button>
                </div>
            </div>
        </div>
    );
};

export default TaskDetailModal;