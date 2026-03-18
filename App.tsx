
import React, { useState, useEffect, useCallback } from 'react';
import Onboarding from './components/Onboarding';
import MainLayout from './components/MainLayout';
import { Task, Webhook } from './types';
import { fetchData } from './services/googleSheetService';
import { createValidDate } from './utils/dateUtils';

interface AggregatedData {
  rootTasks: Task[];
  allTasksMap: Map<string, Task>;
}

// Helper to get the first non-empty value from a list of possible keys
const coalesce = (obj: any, keys: string[]): any => {
  for (const key of keys) {
    const value = obj[key];
    if (value !== undefined && value !== null && value !== '') {
      return value;
    }
  }
  return undefined;
};

// Helper to normalize a raw row from the sheet into a consistent Task object
const normalizeTask = (rawTask: any): Task => {
    // Normalizes various input types (string, array, array-like string) into a clean string array.
    const normalizeToArray = (...values: any[]): string[] => {
        const result = new Set<string>();
        values.flat().forEach(value => {
            if (!value) return;

            let items: string[] = [];
            if (Array.isArray(value)) {
                items = value.map(String).filter(Boolean);
            } else if (typeof value === 'string') {
                const trimmed = value.trim();
                if (trimmed.startsWith('[') && trimmed.endsWith(']')) {
                    const content = trimmed.substring(1, trimmed.length - 1);
                    items = content.split(',').map(s => s.replace(/"/g, '').trim()).filter(Boolean);
                } else {
                    items = trimmed.split(',').map(s => s.trim()).filter(Boolean);
                }
            }
            items.forEach(item => result.add(item));
        });
        return Array.from(result);
    };
    
    // Map numeric priorities to string labels
    const normalizePriority = (value: any): string | undefined => {
        const priorityMap: { [key: string]: string } = {
            '1': 'Urgente', '1.0': 'Urgente',
            '2': 'Alta', '2.0': 'Alta',
            '3': 'Média', '3.0': 'Média', 'Normal': 'Média',
            '4': 'Baixa', '4.0': 'Baixa'
        };
        const stringValue = String(value);
        return priorityMap[stringValue] || value; // Return original value if no mapping found
    };


  const assignees = normalizeToArray(coalesce(rawTask, ['Assignees']));
  
  // Consolidate all tag-like fields into a single 'Tags' array
  const tags = normalizeToArray(
    coalesce(rawTask, ['Tags', 'Tags_estrutura', 'Tags_horas']),
    coalesce(rawTask, ['Projeto']),
    coalesce(rawTask, ['Cliente']),
    coalesce(rawTask, ['Processo Geral', 'Processos', 'Processo 2']),
    coalesce(rawTask, ['Estratégico vs Operacional']),
    coalesce(rawTask, ['Tipo de Atividade']),
    coalesce(rawTask, ['IA / DEV']),
    coalesce(rawTask, ['Sub Processo Analytics', 'Sub Processo IA', 'Sub Processo Q3'])
  );


  // Create a new task object with all original fields (for custom fields)
  // and then overwrite with normalized, coalesced values for core fields.
  const normalized: Task = {
    ...rawTask,
    Task_ID: coalesce(rawTask, ['Task_ID', 'Task ID.1']),
    Task_Name: coalesce(rawTask, ['Task_Name', 'Task Name']),
    Status: coalesce(rawTask, ['Status', 'Task Status', 'Section Column']),
    Due_Date: coalesce(rawTask, ['Due_Date', 'Due Date', 'Due Date_estrutura', 'Due Date_horas']),
    Date_Created: coalesce(rawTask, ['Date_Created', 'Date Created', 'Date Created_estrutura', 'Date Created_horas']),
    Last_Modified: coalesce(rawTask, ['Last_Modified']),
    Space_Name: coalesce(rawTask, ['Space_Name', 'Space Name', 'Space Name_estrutura', 'Space Name_horas', 'Nome do Espaço']),
    Folder_Name: coalesce(rawTask, ['Folder_Name', 'Folder Name', 'Folder Name/Path', 'Pasta']),
    List_Name: coalesce(rawTask, ['List_Name', 'List Name', 'List Name_estrutura', 'List Name_horas']),
    Task_Content: coalesce(rawTask, ['Description', 'Task_Content', 'Task Content']),
    Time_Spent_Text: coalesce(rawTask, ['Time_Spent_Text', 'Time Spent Text', 'Task Time Spent Text', 'Rolled Up Time Text', 'User Period Time Spent Text', 'Time Tracked Text', 'Time Spent']),
    Priority: normalizePriority(coalesce(rawTask, ['Priority'])),
    Parent_Task_ID: coalesce(rawTask, ['Parent_Task_ID', 'Parent ID', 'Parent Task ID', 'Parent Task']),
    Assignees: assignees,
    Tags: tags,
  };

  return normalized;
};


// Função para agregar os dados brutos em tarefas com histórico e subtarefas
const aggregateTasks = (rawData: Task[]): AggregatedData => {
  const taskMap = new Map<string, Task[]>();

  // 1. Normalize e agrupa todas as linhas (eventos) pelo Task_ID
  rawData.forEach(row => {
    const normalizedRow = normalizeTask(row); // Normaliza a linha
    if (!normalizedRow.Task_ID) return;
    
    const taskEvents = taskMap.get(normalizedRow.Task_ID) || [];
    taskEvents.push(normalizedRow);
    taskMap.set(normalizedRow.Task_ID, taskEvents);
  });

  const latestStatesMap = new Map<string, Task>();

  // 2. Processa cada grupo para obter o estado mais recente e o histórico
  taskMap.forEach(events => {
    events.sort((a, b) => {
      const dateA = createValidDate(a.Last_Modified)?.getTime() || createValidDate(a.Date_Created)?.getTime() || 0;
      const dateB = createValidDate(b.Last_Modified)?.getTime() || createValidDate(b.Date_Created)?.getTime() || 0;
      return dateB - dateA;
    });

    const latestState = events[0];
    const history = events.slice(1);
    
    // Inicia a tarefa com uma matriz de subtarefas vazia
    latestStatesMap.set(latestState.Task_ID, { ...latestState, history, subtasks: [] });
  });

  const rootTasks: Task[] = [];
  
  // 3. Constrói a hierarquia vinculando subtarefas aos seus pais
  latestStatesMap.forEach(task => {
    if (task.Parent_Task_ID && latestStatesMap.has(task.Parent_Task_ID)) {
      const parent = latestStatesMap.get(task.Parent_Task_ID);
      if (parent) {
        if (!parent.subtasks) {
            parent.subtasks = [];
        }
        parent.subtasks.push(task);
      }
    } else {
      rootTasks.push(task);
    }
  });

  return { rootTasks, allTasksMap: latestStatesMap };
};


const App: React.FC = () => {
  const [webhooks, setWebhooks] = useState<Webhook[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]); // Contém apenas tarefas raiz
  const [allTasks, setAllTasks] = useState<Map<string, Task>>(new Map()); // Contém todas as tarefas para busca rápida
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isInitialLoad, setIsInitialLoad] = useState(true);

  useEffect(() => {
    try {
      const savedWebhooks = localStorage.getItem('googleSheetWebhooks');
      if (savedWebhooks) {
        setWebhooks(JSON.parse(savedWebhooks));
      } else {
        setIsLoading(false);
      }
    } catch(e) {
      console.error("Failed to parse webhooks from localStorage", e);
      localStorage.removeItem('googleSheetWebhooks'); // Clear corrupted data
      setIsLoading(false);
    }
  }, []);

  const refreshData = useCallback(async () => {
    if (webhooks.length === 0) {
      setIsLoading(false);
      return;
    };

    setIsLoading(true);
    setError(null);
    
    const results = await Promise.allSettled(
      webhooks.map(wh => 
        fetchData(wh.url).then(data => ({
          id: wh.id,
          name: wh.name,
          url: wh.url,
          data
        }))
      )
    );
    
    let allRawTasks: Task[] = [];
    const errors: string[] = [];

    results.forEach((result, index) => {
      const webhookName = webhooks[index].name;
      if (result.status === 'fulfilled') {
        const webhookWithData = result.value;
        const tasksFromWebhook = webhookWithData.data.map(task => ({
          ...task,
          webhookId: webhookWithData.id,
          webhookName: webhookWithData.name,
          webhookUrl: webhookWithData.url,
        }));
        allRawTasks = [...allRawTasks, ...tasksFromWebhook];
      } else {
        errors.push(`Falha ao carregar dados do webhook "${webhookName}". Verifique a URL e as permissões do script.`);
        console.error(`Webhook fetch error for "${webhookName}":`, result.reason);
      }
    });

    if (errors.length > 0) {
      setError(errors.join('\n\n'));
    }

    if (allRawTasks.length > 0) {
      const { rootTasks, allTasksMap } = aggregateTasks(allRawTasks);
      setTasks(rootTasks);
      setAllTasks(allTasksMap);
    } else if (errors.length === 0) {
      // Successful fetch but no data
      setTasks([]);
      setAllTasks(new Map());
    }

    setIsLoading(false);
    setIsInitialLoad(false);
  }, [webhooks]);

  useEffect(() => {
    if (webhooks.length > 0) {
      refreshData();
    }
  }, [webhooks, refreshData]);
  
  const handleDataUpdate = useCallback((newData: Task[], webhookIdToUpdate: string) => {
    const updatedWebhook = webhooks.find(wh => wh.id === webhookIdToUpdate);
    if (!updatedWebhook) return;

    const newTasksFromWebhook = newData.map(task => ({
        ...task,
        webhookId: updatedWebhook.id,
        webhookName: updatedWebhook.name,
        webhookUrl: updatedWebhook.url,
    }));
    
    // FIX: Explicitly typed the parameter 't' in the Array.prototype.filter() callback to ensure
    // TypeScript correctly infers the type of `otherWebhookTasks` as Task[] instead of unknown[].
    const otherWebhookTasks = Array.from(allTasks.values()).filter((t: Task) => t.webhookId !== webhookIdToUpdate);
    
    const { rootTasks, allTasksMap } = aggregateTasks([...otherWebhookTasks, ...newTasksFromWebhook]);
    setTasks(rootTasks);
    setAllTasks(allTasksMap);
  }, [webhooks, allTasks]);

  const handleWebhookAdd = (newWebhook: { name: string; url: string }) => {
    const webhookWithId: Webhook = { ...newWebhook, id: 'wh_' + Date.now() + Math.random().toString(36).substring(2, 9) };
    const updatedWebhooks = [...webhooks, webhookWithId];
    setWebhooks(updatedWebhooks);
    localStorage.setItem('googleSheetWebhooks', JSON.stringify(updatedWebhooks));
    setIsInitialLoad(true);
  };

  const handleWebhooksUpdate = (updatedWebhooks: Webhook[]) => {
      setWebhooks(updatedWebhooks);
      localStorage.setItem('googleSheetWebhooks', JSON.stringify(updatedWebhooks));
  };

  if (webhooks.length === 0) {
    return <Onboarding onWebhookAdd={handleWebhookAdd} />;
  }

  if (isInitialLoad && isLoading) {
    return (
      <div className="flex items-center justify-center h-screen bg-gray-900">
        <div className="text-center">
          <svg className="animate-spin h-10 w-10 text-blue-400 mx-auto" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
          <p className="mt-4 text-lg text-gray-400">Conectando e agregando dados de todas as fontes...</p>
        </div>
      </div>
    );
  }

  return (
    <MainLayout
      webhooks={webhooks}
      tasks={tasks}
      allTasks={allTasks}
      isLoading={isLoading}
      error={error}
      onRefresh={refreshData}
      onWebhooksUpdate={handleWebhooksUpdate}
      onDataUpdate={handleDataUpdate}
    />
  );
};

export default App;
