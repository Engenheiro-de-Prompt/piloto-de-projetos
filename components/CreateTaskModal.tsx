import React, { useState } from 'react';
import { Task } from '../types';
import { XIcon } from './icons/Icons';

interface CreateTaskModalProps {
    onClose: () => void;
    onCreate: (taskData: Omit<Task, 'Task_ID'>) => void;
    listContext: { Space_Name: string; Folder_Name: string; List_Name: string; webhookId: string; webhookUrl: string; } | null;
    allAssignees: string[];
    allStatuses: string[];
    allPriorities: string[];
}

const CreateTaskModal: React.FC<CreateTaskModalProps> = ({ onClose, onCreate, listContext, allAssignees, allStatuses, allPriorities }) => {
    const [taskData, setTaskData] = useState({
        Task_Name: '',
        Task_Content: '',
        Status: allStatuses.includes('A Fazer') ? 'A Fazer' : (allStatuses[0] || ''),
        Priority: allPriorities.includes('Média') ? 'Média' : (allPriorities[0] || ''),
        Assignees: '',
        Due_Date: '',
    });

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        setTaskData(prev => ({ ...prev, [name]: value }));
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!taskData.Task_Name.trim() || !listContext) return;
        
        const newTaskData: Omit<Task, 'Task_ID'> = {
            ...taskData,
            ...listContext,
            Assignees: taskData.Assignees ? taskData.Assignees.split(',').map(s => s.trim()) : [],
            Due_Date: taskData.Due_Date ? new Date(`${taskData.Due_Date}T00:00:00`).toISOString() : undefined,
        };
        onCreate(newTaskData);
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-50 p-4" onClick={onClose}>
            <div className="bg-gray-800 rounded-lg shadow-xl w-full max-w-lg border border-gray-700 relative" onClick={e => e.stopPropagation()}>
                <div className="p-6 border-b border-gray-700 flex justify-between items-center">
                    <h2 className="text-xl font-bold text-gray-100">Criar Nova Tarefa</h2>
                    <button onClick={onClose} className="text-gray-400 hover:text-white">
                        <XIcon className="w-6 h-6" />
                    </button>
                </div>
                <form onSubmit={handleSubmit}>
                    <div className="p-6 space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-400 mb-1">Nome da Tarefa</label>
                            <input name="Task_Name" type="text" value={taskData.Task_Name} onChange={handleChange} placeholder="Ex: Desenvolver nova landing page" required className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-gray-200" />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-400 mb-1">Descrição</label>
                            <textarea name="Task_Content" value={taskData.Task_Content} onChange={handleChange} rows={3} placeholder="Adicione mais detalhes..." className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-gray-200" />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                             <div>
                                <label className="block text-sm font-medium text-gray-400 mb-1">Status</label>
                                <select name="Status" value={taskData.Status} onChange={handleChange} className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-gray-200">
                                    {allStatuses.map(s => <option key={s} value={s}>{s}</option>)}
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-400 mb-1">Prioridade</label>
                                <select name="Priority" value={taskData.Priority} onChange={handleChange} className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-gray-200">
                                    {allPriorities.map(p => <option key={p} value={p}>{p}</option>)}
                                </select>
                            </div>
                        </div>
                         <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-400 mb-1">Responsáveis</label>
                                <input name="Assignees" type="text" value={taskData.Assignees} onChange={handleChange} list="assignees-list" placeholder="Separados por vírgula" className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-gray-200" />
                                <datalist id="assignees-list">
                                    {allAssignees.map(a => <option key={a} value={a} />)}
                                </datalist>
                            </div>
                             <div>
                                <label className="block text-sm font-medium text-gray-400 mb-1">Data de Entrega</label>
                                <input name="Due_Date" type="date" value={taskData.Due_Date} onChange={handleChange} className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-gray-200" />
                            </div>
                        </div>
                    </div>
                    <div className="p-6 bg-gray-800/50 border-t border-gray-700 flex justify-end">
                        <button type="submit" disabled={!listContext} className="bg-blue-600 text-white font-bold px-6 py-2 rounded-lg hover:bg-blue-700 transition-colors duration-200 disabled:bg-gray-500 disabled:cursor-not-allowed">
                            Criar Tarefa
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default CreateTaskModal;