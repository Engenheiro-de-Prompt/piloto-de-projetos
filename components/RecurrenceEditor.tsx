import React, { useState, useEffect } from 'react';
import { RecurrenceRule } from '../types';
import { XIcon } from './icons/Icons';
import { calculateNextDueDate } from '../utils/recurrenceUtils';

interface RecurrenceEditorProps {
    rule: RecurrenceRule | null;
    baseDate?: string;
    onSave: (rule: RecurrenceRule) => void;
    onRemove: () => void;
    onClose: () => void;
}

const WEEKDAYS = [
    { label: 'D', value: 0 }, { label: 'S', value: 1 }, { label: 'T', value: 2 },
    { label: 'Q', value: 3 }, { label: 'Q', value: 4 }, { label: 'S', value: 5 },
    { label: 'S', value: 6 }
];

const DEFAULT_RULE: RecurrenceRule = {
    frequency: 'weekly',
    interval: 1,
    daysOfWeek: [new Date().getDay()],
    mode: 'reopen',
    creationOptions: {
        keepStructure: true,
        keepDetails: true,
        keepContent: false,
        keepData: false,
    }
};

const RecurrenceEditor: React.FC<RecurrenceEditorProps> = ({ rule, baseDate, onSave, onRemove, onClose }) => {
    const [currentRule, setCurrentRule] = useState<RecurrenceRule>(rule || DEFAULT_RULE);
    
    useEffect(() => {
        // If there's no rule, initialize one with today's day of the week selected
        if (!rule) {
            const initialDay = baseDate ? new Date(baseDate).getDay() : new Date().getDay();
            setCurrentRule({ ...DEFAULT_RULE, daysOfWeek: [initialDay] });
        } else {
            setCurrentRule(rule);
        }
    }, [rule, baseDate]);
    
    const handleDayToggle = (day: number) => {
        const days = currentRule.daysOfWeek || [];
        const newDays = days.includes(day)
            ? days.filter(d => d !== day)
            : [...days, day];
        if (newDays.length > 0) {
            setCurrentRule(prev => ({ ...prev, daysOfWeek: newDays }));
        }
    };

    const handleSave = () => {
        const fromDate = new Date(baseDate || Date.now());
        const nextDueDate = calculateNextDueDate(currentRule, fromDate);
        onSave({ ...currentRule, nextDueDate: nextDueDate.toISOString() });
    };

    return (
        <div className="absolute top-full right-0 mt-2 w-96 bg-gray-800 border border-gray-700 rounded-lg shadow-xl z-20 p-4" onClick={e => e.stopPropagation()}>
            <div className="flex justify-between items-center mb-4">
                <h3 className="font-semibold text-lg text-gray-200">Editor de Recorrência</h3>
                <button onClick={onClose}><XIcon className="w-5 h-5 text-gray-400 hover:text-white" /></button>
            </div>
            
            {/* Frequency */}
            <div className="mb-4">
                <label className="text-sm font-semibold text-gray-400">Repetir</label>
                <select 
                    value={currentRule.frequency} 
                    onChange={e => setCurrentRule(prev => ({ ...prev, frequency: e.target.value as 'weekly' | 'monthly' }))}
                    className="mt-1 w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-gray-200"
                >
                    <option value="weekly">Semanalmente</option>
                    <option value="monthly">Mensalmente</option>
                </select>
            </div>

            {/* Weekly Options */}
            {currentRule.frequency === 'weekly' && (
                <div className="mb-4">
                    <label className="text-sm font-semibold text-gray-400">Nos dias</label>
                    <div className="mt-2 flex justify-between">
                        {WEEKDAYS.map(day => (
                            <button 
                                key={day.value}
                                onClick={() => handleDayToggle(day.value)}
                                className={`w-9 h-9 rounded-full font-bold text-sm flex items-center justify-center transition-colors ${
                                    currentRule.daysOfWeek?.includes(day.value) 
                                        ? 'bg-blue-600 text-white' 
                                        : 'bg-gray-700 hover:bg-gray-600 text-gray-300'
                                }`}
                            >
                                {day.label}
                            </button>
                        ))}
                    </div>
                </div>
            )}
            
            {/* Monthly Options */}
            {currentRule.frequency === 'monthly' && (
                 <div className="mb-4">
                    <label className="text-sm font-semibold text-gray-400">Dia do Mês</label>
                    <input 
                        type="number" 
                        min="1" max="31"
                        value={currentRule.dayOfMonth || 1} 
                        onChange={e => setCurrentRule(prev => ({...prev, dayOfMonth: parseInt(e.target.value, 10)}))}
                        className="mt-1 w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-gray-200"
                    />
                </div>
            )}
            
             {/* Action Mode */}
            <div className="mb-4">
                 <label className="text-sm font-semibold text-gray-400">Quando a tarefa for concluída</label>
                 <div className="mt-2 space-y-2">
                    <label className="flex items-center p-2 bg-gray-700/50 rounded-lg cursor-pointer">
                        <input type="radio" name="mode" value="reopen" checked={currentRule.mode === 'reopen'} onChange={() => setCurrentRule(prev => ({...prev, mode: 'reopen'}))} className="form-radio bg-gray-700 border-gray-600 text-blue-500"/>
                        <span className="ml-3 text-sm text-gray-300">Reabrir esta tarefa na próxima data</span>
                    </label>
                     <label className="flex items-center p-2 bg-gray-700/50 rounded-lg cursor-pointer">
                        <input type="radio" name="mode" value="create_new" checked={currentRule.mode === 'create_new'} onChange={() => setCurrentRule(prev => ({...prev, mode: 'create_new'}))} className="form-radio bg-gray-700 border-gray-600 text-blue-500"/>
                        <span className="ml-3 text-sm text-gray-300">Criar uma nova tarefa</span>
                    </label>
                 </div>
            </div>

            {/* Creation Options */}
            {currentRule.mode === 'create_new' && (
                <div className="mb-4 p-3 border border-gray-700 rounded-lg">
                    <h4 className="text-sm font-semibold text-gray-400 mb-2">Preservar na nova tarefa:</h4>
                    <div className="space-y-2 text-sm">
                        {[
                            { key: 'keepStructure', label: 'Estrutura (Espaço, Pasta, Lista, Tarefa Pai)' },
                            { key: 'keepDetails', label: 'Detalhes (Nome, Responsáveis, Prioridade)' },
                            { key: 'keepContent', label: 'Conteúdo (Descrição, Subtarefas)' },
                            { key: 'keepData', label: 'Dados (Tempo, Comentários, Campos Extras)' },
                        ].map(opt => (
                            <label key={opt.key} className="flex items-center">
                                <input 
                                    type="checkbox" 
                                    checked={currentRule.creationOptions?.[opt.key as keyof typeof currentRule.creationOptions] || false}
                                    onChange={e => setCurrentRule(prev => ({...prev, creationOptions: { ...prev.creationOptions, [opt.key]: e.target.checked } as any }))}
                                    className="form-checkbox bg-gray-700 border-gray-600 text-blue-500 focus:ring-blue-500/50"
                                />
                                <span className="ml-2 text-gray-300">{opt.label}</span>
                            </label>
                        ))}
                    </div>
                </div>
            )}
            
            {/* Actions */}
            <div className="flex justify-between items-center mt-4 pt-4 border-t border-gray-700">
                <button onClick={onRemove} className="text-sm text-red-400 hover:text-red-300">Remover Recorrência</button>
                <button onClick={handleSave} className="bg-blue-600 text-white font-bold px-4 py-2 rounded-lg hover:bg-blue-700">Salvar</button>
            </div>
        </div>
    );
};

export default RecurrenceEditor;