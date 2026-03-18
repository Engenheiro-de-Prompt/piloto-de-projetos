import React, { useState } from 'react';
import { Webhook } from '../types';
import { XIcon, TrashIcon, PlusIcon } from './icons/Icons';

interface WebhookManagerModalProps {
    webhooks: Webhook[];
    onClose: () => void;
    onUpdate: (webhooks: Webhook[]) => void;
}

const WebhookManagerModal: React.FC<WebhookManagerModalProps> = ({ webhooks, onClose, onUpdate }) => {
    const [localWebhooks, setLocalWebhooks] = useState(webhooks);
    const [newWebhookName, setNewWebhookName] = useState('');
    const [newWebhookUrl, setNewWebhookUrl] = useState('');
    const [error, setError] = useState('');

    const handleAdd = () => {
        if (!newWebhookName.trim() || !newWebhookUrl.trim()) {
            setError('Nome e URL são obrigatórios.');
            return;
        }
        const newWebhook: Webhook = {
            id: 'wh_' + Date.now() + Math.random().toString(36).substring(2, 9),
            name: newWebhookName.trim(),
            url: newWebhookUrl.trim()
        };
        setLocalWebhooks([...localWebhooks, newWebhook]);
        setNewWebhookName('');
        setNewWebhookUrl('');
        setError('');
    };

    const handleDelete = (id: string) => {
        setLocalWebhooks(localWebhooks.filter(wh => wh.id !== id));
    };

    const handleSave = () => {
        onUpdate(localWebhooks);
        onClose();
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-50 p-4" onClick={onClose}>
            <div className="bg-gray-800 rounded-lg shadow-xl w-full max-w-2xl border border-gray-700 flex flex-col max-h-[90vh]" onClick={e => e.stopPropagation()}>
                <div className="p-5 border-b border-gray-700 flex justify-between items-center">
                    <h2 className="text-xl font-bold text-gray-100">Gerenciar Webhooks</h2>
                    <button onClick={onClose} className="text-gray-400 hover:text-white">
                        <XIcon className="w-6 h-6" />
                    </button>
                </div>
                
                <div className="p-6 flex-grow overflow-y-auto space-y-6">
                    <div>
                        <h3 className="text-lg font-semibold text-gray-300 mb-2">Webhooks Atuais</h3>
                        <div className="space-y-2">
                            {localWebhooks.map(wh => (
                                <div key={wh.id} className="flex items-center justify-between bg-gray-700/50 p-3 rounded-lg">
                                    <div>
                                        <p className="font-semibold text-gray-200">{wh.name}</p>
                                        <p className="text-xs text-gray-400 truncate max-w-md">{wh.url}</p>
                                    </div>
                                    <button onClick={() => handleDelete(wh.id)} className="p-2 text-gray-500 hover:text-red-400 rounded-md hover:bg-gray-700">
                                        <TrashIcon className="w-5 h-5"/>
                                    </button>
                                </div>
                            ))}
                            {localWebhooks.length === 0 && <p className="text-gray-500">Nenhum webhook configurado.</p>}
                        </div>
                    </div>
                    
                    <div>
                        <h3 className="text-lg font-semibold text-gray-300 mb-2">Adicionar Novo Webhook</h3>
                        <div className="p-4 bg-gray-900/50 rounded-lg space-y-4">
                            <input
                                type="text"
                                value={newWebhookName}
                                onChange={e => setNewWebhookName(e.target.value)}
                                placeholder="Nome da Conexão (ex: Marketing)"
                                className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-gray-200"
                            />
                            <input
                                type="url"
                                value={newWebhookUrl}
                                onChange={e => setNewWebhookUrl(e.target.value)}
                                placeholder="URL do App da Web do Google"
                                className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-gray-200"
                            />
                            {error && <p className="text-sm text-red-400">{error}</p>}
                             <button onClick={handleAdd} className="flex items-center justify-center w-full bg-blue-600/80 text-white px-4 py-2 rounded-lg hover:bg-blue-600 transition-colors">
                                <PlusIcon className="w-5 h-5 mr-2" />
                                Adicionar
                            </button>
                        </div>
                    </div>
                </div>

                <div className="p-4 bg-gray-800/50 border-t border-gray-700 flex justify-end">
                    <button onClick={handleSave} className="bg-blue-600 text-white font-bold px-6 py-2 rounded-lg hover:bg-blue-700">
                        Salvar e Fechar
                    </button>
                </div>
            </div>
        </div>
    );
};

export default WebhookManagerModal;
