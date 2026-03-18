import React, { useState } from 'react';
import { ColumnConfig } from '../types';
import { XIcon, PlusIcon, TrashIcon } from './icons/Icons';

interface ColumnConfigModalProps {
    columnConfig: ColumnConfig;
    onSave: (config: ColumnConfig) => void;
    onClose: () => void;
}

const ColumnConfigModal: React.FC<ColumnConfigModalProps> = ({ columnConfig, onSave, onClose }) => {
    const [config, setConfig] = useState<ColumnConfig>(columnConfig);
    const [newOption, setNewOption] = useState('');

    const handleFormatChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        const newFormat = e.target.value as ColumnConfig['format'];
        setConfig(prev => ({
            ...prev,
            format: newFormat,
            options: newFormat === 'categorical' ? (prev.options || []) : undefined
        }));
    };

    const handleOptionChange = (index: number, value: string) => {
        const newOptions = [...(config.options || [])];
        newOptions[index] = value;
        setConfig(prev => ({ ...prev, options: newOptions }));
    };

    const handleAddOption = () => {
        if (newOption.trim()) {
            const newOptions = [...(config.options || []), newOption.trim()];
            setConfig(prev => ({ ...prev, options: newOptions }));
            setNewOption('');
        }
    };

    const handleDeleteOption = (index: number) => {
        const newOptions = [...(config.options || [])];
        newOptions.splice(index, 1);
        setConfig(prev => ({ ...prev, options: newOptions }));
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-50 p-4" onClick={onClose}>
            <div className="bg-gray-800 rounded-lg shadow-xl w-full max-w-md border border-gray-700" onClick={e => e.stopPropagation()}>
                <div className="p-5 border-b border-gray-700 flex justify-between items-center">
                    <h2 className="text-lg font-bold text-gray-100">Configurar Coluna: <span className="capitalize">{config.label}</span></h2>
                    <button onClick={onClose} className="text-gray-400 hover:text-white"><XIcon className="w-6 h-6" /></button>
                </div>
                <div className="p-6 space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-400 mb-1">Formato da Coluna</label>
                        <select value={config.format} onChange={handleFormatChange} className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-gray-200">
                            <option value="text">Texto</option>
                            <option value="number">Número</option>
                            <option value="date">Data</option>
                            <option value="categorical">Categórico (Seleção)</option>
                        </select>
                    </div>

                    {config.format === 'categorical' && (
                        <div>
                            <h4 className="text-sm font-medium text-gray-400 mb-2">Opções da Categoria</h4>
                            <div className="space-y-2 max-h-48 overflow-y-auto pr-2">
                                {(config.options || []).map((option, index) => (
                                    <div key={index} className="flex items-center space-x-2">
                                        <input
                                            type="text"
                                            value={option}
                                            onChange={(e) => handleOptionChange(index, e.target.value)}
                                            className="flex-grow px-3 py-1 bg-gray-900 border border-gray-600 rounded-md text-gray-200"
                                        />
                                        <button onClick={() => handleDeleteOption(index)} className="p-1 text-gray-500 hover:text-red-400">
                                            <TrashIcon className="w-5 h-5" />
                                        </button>
                                    </div>
                                ))}
                            </div>
                            <div className="mt-3 flex items-center space-x-2">
                                <input
                                    type="text"
                                    value={newOption}
                                    onChange={(e) => setNewOption(e.target.value)}
                                    placeholder="Nova opção"
                                    onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleAddOption(); } }}
                                    className="flex-grow px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-gray-200"
                                />
                                <button onClick={handleAddOption} className="p-2 bg-blue-600 hover:bg-blue-700 rounded-lg flex-shrink-0">
                                    <PlusIcon className="w-5 h-5 text-white" />
                                </button>
                            </div>
                        </div>
                    )}
                </div>
                <div className="p-4 bg-gray-800/50 border-t border-gray-700 flex justify-end">
                    <button onClick={() => onSave(config)} className="bg-blue-600 text-white font-bold px-6 py-2 rounded-lg hover:bg-blue-700">
                        Salvar
                    </button>
                </div>
            </div>
        </div>
    );
};

export default ColumnConfigModal;
