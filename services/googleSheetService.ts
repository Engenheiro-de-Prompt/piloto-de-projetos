import { Task } from '../types';

interface ApiResponse {
  status: string;
  data?: any;
  message?: string;
}

const callWebhook = async <T,>(url: string, action: string, payload?: object): Promise<T> => {
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'text/plain;charset=utf-8', 
    },
    body: JSON.stringify({ action, ...payload }),
    mode: 'cors',
    redirect: 'follow',
    cache: 'no-cache'
  });

  if (!response.ok) {
     const errorText = await response.text();
    throw new Error(`A requisição ao webhook falhou com o status: ${response.status}. Resposta: ${errorText}`);
  }
  
  const result: ApiResponse = await response.json();

  if (result.status !== 'success') {
    throw new Error(result.message || 'Ocorreu um erro desconhecido com o webhook.');
  }

  return result.data;
};

export const fetchData = async (webhookUrl: string): Promise<Task[]> => {
  return callWebhook<Task[]>(webhookUrl, 'GET_DATA');
};

export const updateTask = async (webhookUrl: string, taskData: Task): Promise<Task[]> => {
  return callWebhook<Task[]>(webhookUrl, 'UPDATE_TASK', { taskData });
};

export const createTask = async (webhookUrl: string, taskData: Omit<Task, 'Task_ID'>): Promise<Task[]> => {
    return callWebhook<Task[]>(webhookUrl, 'CREATE_TASK', { taskData });
};

export const renameStructure = async (webhookUrl: string, payload: {
  structureType: 'workspace' | 'folder' | 'list';
  oldName: string;
  newName: string;
  context: { workspace?: string; folder?: string };
}): Promise<Task[]> => {
  return callWebhook<Task[]>(webhookUrl, 'RENAME_STRUCTURE', payload);
};

export const deleteStructure = async (webhookUrl: string, payload: {
  structureType: 'workspace' | 'folder' | 'list';
  name: string;
  context: { workspace?: string; folder?: string };
}): Promise<Task[]> => {
  return callWebhook<Task[]>(webhookUrl, 'DELETE_STRUCTURE', payload);
};