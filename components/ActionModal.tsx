import React, { useState, useEffect } from 'react';
import { XIcon } from './icons/Icons';

interface ActionModalProps {
    action: 'CREATE' | 'RENAME' | 'DELETE';
    structure: 'workspace' | 'folder' | 'list';
    context?: any;
    onConfirm: (value: string) => void;
    onClose: () => void;
}

const ActionModal: React.FC<ActionModalProps> = ({ action, structure, context, onConfirm, onClose }) => {
    const [inputValue, setInputValue] = useState('');

    useEffect(() => {
        if (action === 'RENAME' && context?.name) {
            setInputValue(context.name);
        }
    }, [action, context]);

    const structureMap = {
        workspace: 'Workspace',
        folder: 'Pasta',
        list: 'Lista'
    };

    const titleMap = {
        CREATE: `Criar Novo ${structureMap[structure]}`,
        RENAME: `Renomear ${structureMap[structure]}`,
        DELETE: `Excluir ${structureMap[structure]}`,
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (action === 'DELETE' || inputValue.trim()) {
            onConfirm(inputValue.trim());
        }
    };
    
    // Check for DELETE action on a list and also trigger rename if it matches context name
    const handleRenameClick = () => {
        if (action === 'RENAME' && context?.name === inputValue) {
            onConfirm(inputValue)
        }
    }
    
    // Trigger rename also on DELETE action
    const handleDeleteClick = () => {
        if (action === 'DELETE' && context?.name) {
            onConfirm(context.name)
        }
    }

    return (
        <div className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-50 p-4" onClick={onClose}>
            <div className="bg-gray-800 rounded-lg shadow-xl w-full max-w-md border border-gray-700" onClick={e => e.stopPropagation()}>
                <div className="p-5 border-b border-gray-700 flex justify-between items-center">
                    <h2 className="text-lg font-bold text-gray-100">{titleMap[action]}</h2>
                    <button onClick={onClose} className="text-gray-400 hover:text-white">
                        <XIcon className="w-6 h-6" />
                    </button>
                </div>
                <form onSubmit={handleSubmit}>
                    <div className="p-6">
                        {action !== 'DELETE' ? (
                            <div>
                                <label className="block text-sm font-medium text-gray-400 mb-2">Nome do {structureMap[structure]}</label>
                                <input
                                    type="text"
                                    value={inputValue}
                                    onChange={(e) => setInputValue(e.target.value)}
                                    required
                                    autoFocus
                                    className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-gray-200"
                                />
                            </div>
                        ) : (
                            <p className="text-gray-300">
                                Você tem certeza que deseja excluir o {structureMap[structure]} <strong className="font-semibold text-red-400">{context?.name}</strong>?
                                <br />
                                <span className="text-sm text-gray-400">Todas as tarefas contidas serão permanentemente removidas. Esta ação não pode ser desfeita.</span>
                            </p>
                        )}
                    </div>
                    <div className="p-4 bg-gray-800/50 border-t border-gray-700 flex justify-end space-x-3">
                        <button type="button" onClick={onClose} className="bg-gray-600 text-white px-4 py-2 rounded-lg hover:bg-gray-700">
                            Cancelar
                        </button>
                        <button type="submit" className={`${action === 'DELETE' ? 'bg-red-600 hover:bg-red-700' : 'bg-blue-600 hover:bg-blue-700'} text-white font-bold px-4 py-2 rounded-lg`}>
                            {action === 'DELETE' ? 'Excluir' : 'Salvar'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default ActionModal;