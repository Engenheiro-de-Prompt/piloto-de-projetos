import React, { useState } from 'react';
import { getAppsScriptCode } from '../utils/appsScript';
import { ClipboardCopyIcon } from './icons/Icons';

interface OnboardingProps {
  onWebhookAdd: (webhook: { name: string, url: string }) => void;
}

const Onboarding: React.FC<OnboardingProps> = ({ onWebhookAdd }) => {
  const [webhookUrl, setWebhookUrl] = useState('');
  const [webhookName, setWebhookName] = useState('');
  const [copied, setCopied] = useState(false);
  
  const appScriptCode = getAppsScriptCode();

  const handleCopy = () => {
    navigator.clipboard.writeText(appScriptCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (webhookUrl.trim() && webhookName.trim()) {
      onWebhookAdd({ name: webhookName.trim(), url: webhookUrl.trim() });
    }
  };

  return (
    <div className="min-h-screen bg-gray-900 flex items-center justify-center p-4">
      <div className="max-w-4xl w-full bg-gray-800 rounded-2xl shadow-xl overflow-hidden border border-gray-700">
        <div className="p-8 md:p-12">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-blue-600 rounded-lg">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
            </div>
            <h1 className="text-3xl font-bold text-gray-100">Bem-vindo ao Piloto de Projetos</h1>
          </div>
          <p className="mt-4 text-gray-400">
            Vamos conectar sua Planilha Google para potencializar sua gestão de projetos. Esta é uma configuração única.
          </p>

          <div className="mt-8 space-y-6">
            {/* Passo 1 */}
            <div className="transition-opacity duration-500 opacity-100">
              <div className="flex items-center">
                <div className="flex-shrink-0 bg-blue-600 text-white rounded-full h-8 w-8 flex items-center justify-center font-bold">1</div>
                <h2 className="ml-4 text-xl font-semibold text-gray-200">Copie o Google Apps Script</h2>
              </div>
              <div className="mt-4 ml-12">
                <p className="text-gray-400 mb-4">Este script funciona como um backend seguro, permitindo que o aplicativo leia e escreva dados na sua planilha.</p>
                <div className="relative bg-gray-900 rounded-lg p-4 border border-gray-700">
                  <pre className="text-sm text-gray-300 overflow-x-auto">
                    <code className="language-javascript">{appScriptCode.substring(0, 300)}...</code>
                  </pre>
                  <button onClick={handleCopy} className="absolute top-2 right-2 bg-gray-700 hover:bg-gray-600 text-white px-3 py-1 rounded-md text-sm flex items-center">
                    {copied ? <><svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" /></svg> Copiado!</> : <><ClipboardCopyIcon className="h-4 w-4 mr-2" /> Copiar Código</>}
                  </button>
                </div>
              </div>
            </div>

            {/* Passo 2 */}
            <div className="transition-opacity duration-500 opacity-100">
              <div className="flex items-center">
                <div className="flex-shrink-0 bg-blue-600 text-white rounded-full h-8 w-8 flex items-center justify-center font-bold">2</div>
                <h2 className="ml-4 text-xl font-semibold text-gray-200">Implante como um App da Web</h2>
              </div>
              <div className="mt-4 ml-12 prose prose-sm max-w-none text-gray-400">
                <ol className="list-decimal pl-5 space-y-2">
                  <li>Abra a Planilha Google que você deseja usar.</li>
                  <li>Vá para <strong>Extensões &gt; Apps Script</strong>.</li>
                  <li>Apague qualquer código de exemplo e cole o script que você acabou de copiar.</li>
                  <li>Clique em <strong>Implantar &gt; Nova implantação</strong>.</li>
                  <li>No ícone de engrenagem ("Selecionar tipo"), escolha <strong>App da Web</strong>.</li>
                  <li>Em "Quem tem acesso", selecione <strong>Qualquer pessoa</strong>. Isso é necessário para o app funcionar, mas seus dados só são acessíveis por esta URL secreta.</li>
                  <li>Clique em <strong>Implantar</strong> e autorize as permissões.</li>
                  <li>Copie a <strong>URL do app da Web</strong> fornecida. Você precisará dela no próximo passo.</li>
                </ol>
              </div>
            </div>

            {/* Passo 3 */}
            <div className="transition-opacity duration-500 opacity-100">
              <div className="flex items-center">
                <div className="flex-shrink-0 bg-blue-600 text-white rounded-full h-8 w-8 flex items-center justify-center font-bold">3</div>
                <h2 className="ml-4 text-xl font-semibold text-gray-200">Conecte ao Piloto de Projetos</h2>
              </div>
              <form onSubmit={handleSubmit} className="mt-4 ml-12 space-y-4">
                <p className="text-gray-400">Dê um nome para esta conexão e cole a URL do app da Web que você copiou do Google Apps Script abaixo.</p>
                <div>
                  <label className="text-sm font-semibold text-gray-400">Nome da Conexão</label>
                  <input
                    type="text"
                    value={webhookName}
                    onChange={(e) => setWebhookName(e.target.value)}
                    placeholder="Ex: Projetos da Empresa"
                    required
                    className="mt-1 w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-gray-200 focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="text-sm font-semibold text-gray-400">URL do App da Web</label>
                  <input
                    type="url"
                    value={webhookUrl}
                    onChange={(e) => setWebhookUrl(e.target.value)}
                    placeholder="https://script.google.com/macros/s/..."
                    required
                    className="mt-1 w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-gray-200 focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div className="flex justify-end">
                  <button type="submit" className="bg-blue-600 text-white font-bold px-6 py-2 rounded-lg hover:bg-blue-700 transition-colors duration-200">
                    Conectar
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Onboarding;