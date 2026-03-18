import React, { useState, useMemo, useEffect } from 'react';
import { Task, ViewType, HierarchicalData, HierarchicalWorkspace, HierarchicalFolder, HierarchicalList, Webhook } from '../types';
import KanbanBoard from './KanbanBoard';
import ListView from './ListView';
import TableView from './TableView';
import ViewSwitcher from './ViewSwitcher';
import TaskDetailModal from './TaskDetailModal';
import CreateTaskModal from './CreateTaskModal';
import HomePage from './HomePage';
import FilterBar from './FilterBar';
import { updateTask, createTask, renameStructure, deleteStructure } from '../services/googleSheetService';
import { RefreshIcon, SettingsIcon, FolderIcon, ListIcon, PlusIcon, DotsVerticalIcon, WebhookIcon } from './icons/Icons';
import ActionModal from './ActionModal';
import WebhookManagerModal from './WebhookManagerModal';

interface MainLayoutProps {
  webhooks: Webhook[];
  tasks: Task[]; // Contém apenas as tarefas raiz para a barra lateral
  allTasks: Map<string, Task>; // Contém todas as tarefas para visualizações e buscas
  isLoading: boolean;
  error: string | null;
  onRefresh: () => void;
  onWebhooksUpdate: (webhooks: Webhook[]) => void;
  onDataUpdate: (newData: Task[], webhookId: string) => void;
}

const buildHierarchy = (tasks: Task[], webhooks: Webhook[]): { [webhookId: string]: { webhook: Webhook, data: HierarchicalData } } => {
  const webhookHierarchy: { [webhookId: string]: { webhook: Webhook, data: HierarchicalData } } = {};

  webhooks.forEach(wh => {
    webhookHierarchy[wh.id] = { webhook: wh, data: {} };
  });

  tasks.forEach(task => {
    const { Space_Name, Folder_Name, List_Name, webhookId } = task;
    if (!Space_Name || !Folder_Name || !List_Name || !webhookId || !webhookHierarchy[webhookId]) return;

    let webhookData = webhookHierarchy[webhookId].data;

    let workspace = webhookData[Space_Name];
    if (!workspace) {
      workspace = { id: Space_Name, name: Space_Name, folders: {} };
      webhookData[Space_Name] = workspace;
    }

    let folder = workspace.folders[Folder_Name];
    if (!folder) {
      folder = { id: Folder_Name, name: Folder_Name, lists: {} };
      workspace.folders[Folder_Name] = folder;
    }

    let list = folder.lists[List_Name];
    if (!list) {
      list = { id: List_Name, name: List_Name, tasks: [] };
      folder.lists[List_Name] = list;
    }

    if (task.Task_Name !== '__placeholder_task__') {
      list.tasks.push(task);
    }
  });
  return webhookHierarchy;
};

const MainLayout: React.FC<MainLayoutProps> = ({ webhooks, tasks, allTasks, isLoading, error, onRefresh, onWebhooksUpdate, onDataUpdate }) => {
  const [view, setView] = useState<ViewType>('home');
  const [selectedList, setSelectedList] = useState<{ webhookId: string; webhookUrl: string; workspace: string; folder: string; list: string; } | null>(null);
  const [expanded, setExpanded] = useState<{ [key: string]: boolean }>({});
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [isCreateModalOpen, setCreateModalOpen] = useState(false);
  
  const [searchTerm, setSearchTerm] = useState('');
  const [priorityFilter, setPriorityFilter] = useState<string>('');
  const [assigneeFilter, setAssigneeFilter] = useState<string>('');
  
  const [isWebhookManagerOpen, setWebhookManagerOpen] = useState(false);

  const [modalAction, setModalAction] = useState<{
    type: 'CREATE' | 'RENAME' | 'DELETE';
    structure: 'workspace' | 'folder' | 'list';
    context?: any;
  } | null>(null);


  const hierarchy = useMemo(() => buildHierarchy(Array.from(allTasks.values()), webhooks), [allTasks, webhooks]);
  
  const handleSelectTaskById = (taskId: string) => {
    const task = allTasks.get(taskId);
    if (task) {
      setSelectedTask(task);
    } else {
      console.warn(`Task with ID ${taskId} not found.`);
    }
  };

  const handleSelectTask = (task: Task) => {
    if (task && task.Task_ID) {
      handleSelectTaskById(task.Task_ID);
    } else {
      console.warn('Attempted to select an invalid task:', task);
    }
  };

  useEffect(() => {
    // Auto-select first list on initial load
    if (!selectedList && webhooks.length > 0 && tasks.length > 0) {
      const firstWebhookId = Object.keys(hierarchy)[0];
      if (!firstWebhookId) return;
      const firstWebhook = hierarchy[firstWebhookId];
      const workspaceKeys = Object.keys(firstWebhook.data);
      if (workspaceKeys.length > 0) {
          const firstWorkspace = firstWebhook.data[workspaceKeys[0]];
          const folderKeys = Object.keys(firstWorkspace.folders);
          if (folderKeys.length > 0) {
              const firstFolder = firstWorkspace.folders[folderKeys[0]];
              const listKeys = Object.keys(firstFolder.lists);
              if (listKeys.length > 0) {
                  const firstList = firstFolder.lists[listKeys[0]];
                  setSelectedList({
                      webhookId: firstWebhook.webhook.id,
                      webhookUrl: firstWebhook.webhook.url,
                      workspace: firstWorkspace.name,
                      folder: firstFolder.name,
                      list: firstList.name
                  });
                  setExpanded(prev => ({ ...prev, [firstWebhook.webhook.id]: true, [firstWorkspace.id]: true, [`${firstWorkspace.id}-${firstFolder.id}`]: true }));
              }
          }
      }
    }
  }, [tasks, hierarchy, selectedList, webhooks]);

  const { allAssignees, allPriorities, allStatuses } = useMemo(() => {
    const assignees = new Set<string>();
    const priorities = new Set<string>();
    const statuses = new Set<string>();
    allTasks.forEach(task => {
      if (Array.isArray(task.Assignees)) {
        task.Assignees.forEach(a => assignees.add(a));
      } else if(task.Assignees) {
        assignees.add(task.Assignees as string);
      }
      if (task.Priority) priorities.add(task.Priority);
      if (task.Status) statuses.add(task.Status);
    });
    return {
        allAssignees: Array.from(assignees).sort(),
        allPriorities: Array.from(priorities),
        allStatuses: Array.from(statuses)
    };
  }, [allTasks]);


  const filteredTasks = useMemo(() => {
    let currentTasks: Task[];

    if (view === 'home') {
        currentTasks = Array.from(allTasks.values());
    } else if (selectedList && hierarchy[selectedList.webhookId]) {
        currentTasks = hierarchy[selectedList.webhookId]?.data[selectedList.workspace]?.folders[selectedList.folder]?.lists[selectedList.list]?.tasks || [];
    } else {
        currentTasks = [];
    }
    
    return currentTasks.filter(task => {
        if (task.Task_Name === '__placeholder_task__') return false;
        const matchesSearch = searchTerm ? task.Task_Name.toLowerCase().includes(searchTerm.toLowerCase()) : true;
        const matchesPriority = priorityFilter ? task.Priority === priorityFilter : true;
        const matchesAssignee = assigneeFilter ? (Array.isArray(task.Assignees) && task.Assignees.includes(assigneeFilter)) || task.Assignees === assigneeFilter : true;
        return matchesSearch && matchesPriority && matchesAssignee;
    });
  }, [allTasks, selectedList, hierarchy, view, searchTerm, priorityFilter, assigneeFilter]);
  
  const handleUpdateTask = async (updatedTaskData: Task) => {
      if (!updatedTaskData.webhookUrl || !updatedTaskData.webhookId) {
          console.error("Task is missing webhook info for update.");
          return;
      }
      try {
          const freshData = await updateTask(updatedTaskData.webhookUrl, updatedTaskData);
          onDataUpdate(freshData, updatedTaskData.webhookId); 
          if(selectedTask && selectedTask.Task_ID === updatedTaskData.Task_ID) {
              const taskFromMap = allTasks.get(updatedTaskData.Task_ID);
              if(taskFromMap) setSelectedTask(taskFromMap);
          }
      } catch (err) {
          console.error("Failed to update task", err);
      }
  };

  const handleCreateTask = async (taskData: Omit<Task, 'Task_ID'>) => {
    const { webhookUrl, webhookId } = taskData;
    if (!webhookUrl || !webhookId) {
        console.error("Cannot create task without webhook context.");
        return;
    }
    try {
        const payload = { ...taskData };
        delete payload.webhookUrl;
        delete payload.webhookId;
        delete payload.webhookName;

        const freshData = await createTask(webhookUrl, payload);
        setCreateModalOpen(false);
        onDataUpdate(freshData, webhookId);
    } catch(err) {
        console.error("Failed to create task", err);
    }
  };

  const handleStructureAction = async (value: string) => {
    if (!modalAction) return;
    const { type, structure, context } = modalAction;
    const { webhookUrl, webhookId } = context;
    if (!webhookUrl || !webhookId) {
        console.error("Action is missing webhook context.");
        return;
    }
    try {
        let freshData: Task[] | undefined;
        const baseTask = { Task_Name: '__placeholder_task__', Status: 'A Fazer' };

        if (type === 'CREATE') {
            if (structure === 'workspace') {
                freshData = await createTask(webhookUrl, { ...baseTask, Space_Name: value, Folder_Name: 'Padrão', List_Name: 'Padrão' });
            } else if (structure === 'folder') {
                freshData = await createTask(webhookUrl, { ...baseTask, Space_Name: context.workspace, Folder_Name: value, List_Name: 'Padrão' });
            } else if (structure === 'list') {
                freshData = await createTask(webhookUrl, { ...baseTask, Space_Name: context.workspace, Folder_Name: context.folder, List_Name: value });
            }
        } else if (type === 'RENAME') {
             freshData = await renameStructure(webhookUrl, {
                structureType: structure,
                oldName: context.name,
                newName: value,
                context: { workspace: context.workspace, folder: context.folder },
            });
             if (selectedList && selectedList.webhookId === webhookId) {
                 if (structure === 'workspace' && selectedList.workspace === context.name) {
                    setSelectedList(prev => prev ? { ...prev, workspace: value } : null);
                 } else if (structure === 'folder' && selectedList.folder === context.name) {
                    setSelectedList(prev => prev ? { ...prev, folder: value } : null);
                } else if (structure === 'list' && selectedList.list === context.name) {
                    setSelectedList(prev => prev ? { ...prev, list: value } : null);
                }
             }
        } else if (type === 'DELETE') {
             freshData = await deleteStructure(webhookUrl, {
                structureType: structure,
                name: context.name,
                context: { workspace: context.workspace, folder: context.folder },
            });
             if (selectedList && selectedList.webhookId === webhookId && (
                 (structure === 'workspace' && selectedList.workspace === context.name) ||
                 (structure === 'folder' && selectedList.folder === context.name && selectedList.workspace === context.workspace) ||
                 (structure === 'list' && selectedList.list === context.name && selectedList.folder === context.folder)
             )) {
                setSelectedList(null);
             }
        }
        
        if (freshData) {
            onDataUpdate(freshData, webhookId);
        }

    } catch (err) {
        console.error(`Failed to ${type} ${structure}`, err);
    } finally {
        setModalAction(null);
    }
};

  const toggleExpand = (key: string) => {
    setExpanded(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const renderContent = () => {
    if (error) {
      return (
        <div className="text-center p-8 bg-red-900/50 border border-red-700 rounded-lg">
          <h3 className="text-xl font-semibold text-red-300">Ocorreu um Erro</h3>
          <p className="mt-2 text-red-400 whitespace-pre-wrap">{error}</p>
          <button onClick={onRefresh} className="mt-4 bg-red-600 text-white px-4 py-2 rounded-md hover:bg-red-700">
            Tentar Novamente
          </button>
        </div>
      );
    }
    
    if (allTasks.size === 0 && !isLoading) {
        return <div className="text-center p-8 text-gray-500">Nenhuma tarefa encontrada. Adicione tarefas às suas Planilhas Google ou clique em "Nova Tarefa".</div>
    }

    const taskViewerProps = {
        tasks: filteredTasks,
        onTaskClick: handleSelectTask,
        onGoToParent: handleSelectTaskById,
    };

    switch (view) {
      case 'home':
        return <HomePage 
            {...taskViewerProps} 
            onUpdateTask={handleUpdateTask} 
            allStatuses={allStatuses} 
            allPriorities={allPriorities} 
        />;
      case 'kanban':
        return <KanbanBoard {...taskViewerProps} />;
      case 'list':
        return <ListView {...taskViewerProps} />;
      case 'table':
        return <TableView 
            {...taskViewerProps}
            onUpdateTask={handleUpdateTask}
            allStatuses={allStatuses}
            allPriorities={allPriorities}
        />;
      default:
        return null;
    }
  };
  
  const getListItemClass = (listName: string, folderName: string, workspaceName: string, webhookId: string) => {
      return `block w-full text-left truncate cursor-pointer p-2 rounded-md group-hover:bg-gray-700 ${
        selectedList?.list === listName && 
        selectedList?.folder === folderName && 
        selectedList?.workspace === workspaceName && 
        selectedList?.webhookId === webhookId 
        ? 'bg-blue-900/50 text-blue-300 font-semibold' 
        : ''
      }`;
  }

  const stopPropagation = (e: React.MouseEvent) => e.stopPropagation();

  return (
    <div className="flex h-screen bg-gray-900 font-sans text-gray-200">
      <aside className="w-80 bg-gray-800 border-r border-gray-700 flex flex-col">
        <div className="p-4 border-b border-gray-700 flex justify-between items-center">
          <h1 className="text-xl font-bold text-gray-100">Piloto de Projetos</h1>
        </div>
        <nav className="flex-1 p-2 space-y-1 overflow-y-auto">
          {Object.values(hierarchy).map(({ webhook, data: workspaceData }) => (
            <div key={webhook.id}>
              <button onClick={() => toggleExpand(webhook.id)} className="w-full flex justify-between items-center p-2 text-left text-base font-bold text-gray-100 hover:bg-gray-700 rounded-md">
                <span className="flex items-center"><WebhookIcon className="w-5 h-5 mr-2"/>{webhook.name}</span>
                 <div className="flex items-center" onClick={stopPropagation}>
                  <button onClick={() => setModalAction({ type: 'CREATE', structure: 'workspace', context: { webhookId: webhook.id, webhookUrl: webhook.url }})} className="text-gray-400 hover:text-white p-1 rounded-md hover:bg-gray-600">
                    <PlusIcon className="w-5 h-5"/>
                  </button>
                </div>
              </button>
              {expanded[webhook.id] && (
                <div className="pl-3 mt-1 space-y-1 border-l-2 border-gray-700 ml-3">
                  {Object.values(workspaceData).map((workspace: HierarchicalWorkspace) => (
                    <div key={workspace.id} className="group relative">
                      <button onClick={() => toggleExpand(workspace.id)} className="w-full flex justify-between items-center p-2 text-left font-semibold text-gray-300 hover:bg-gray-700 rounded-md">
                        <span>{workspace.name}</span>
                        <div className="flex items-center" onClick={stopPropagation}>
                          <button onClick={() => setModalAction({ type: 'CREATE', structure: 'folder', context: { workspace: workspace.name, webhookId: webhook.id, webhookUrl: webhook.url }})} className="opacity-0 group-hover:opacity-100 text-gray-400 hover:text-white p-1 rounded-md hover:bg-gray-600">
                            <PlusIcon className="w-5 h-5"/>
                          </button>
                          <button onClick={() => setModalAction({ type: 'RENAME', structure: 'workspace', context: { name: workspace.name, webhookId: webhook.id, webhookUrl: webhook.url }})} className="opacity-0 group-hover:opacity-100 text-gray-400 hover:text-white p-1 rounded-md hover:bg-gray-600">
                            <DotsVerticalIcon className="w-5 h-5"/>
                          </button>
                        </div>
                      </button>
                      {expanded[workspace.id] && (
                        <div className="pl-2 mt-1 space-y-1">
                          {Object.values(workspace.folders).map((folder: HierarchicalFolder) => (
                            <div key={folder.id} className="group relative">
                              <button onClick={() => toggleExpand(`${workspace.id}-${folder.id}`)} className="w-full flex justify-between items-center p-2 pl-4 text-left font-medium text-gray-400 hover:bg-gray-700 rounded-md">
                                <span className="flex items-center"><FolderIcon className="w-4 h-4 mr-2"/> {folder.name}</span>
                                <div className="flex items-center" onClick={stopPropagation}>
                                  <button onClick={() => setModalAction({ type: 'CREATE', structure: 'list', context: { workspace: workspace.name, folder: folder.name, webhookId: webhook.id, webhookUrl: webhook.url }})} className="opacity-0 group-hover:opacity-100 text-gray-400 hover:text-white p-1 rounded-md hover:bg-gray-600">
                                    <PlusIcon className="w-5 h-5"/>
                                  </button>
                                  <button onClick={() => setModalAction({ type: 'RENAME', structure: 'folder', context: { workspace: workspace.name, name: folder.name, webhookId: webhook.id, webhookUrl: webhook.url }})} className="opacity-0 group-hover:opacity-100 text-gray-400 hover:text-white p-1 rounded-md hover:bg-gray-600">
                                    <DotsVerticalIcon className="w-5 h-5"/>
                                  </button>
                                </div>
                              </button>
                              {expanded[`${workspace.id}-${folder.id}`] && (
                                <div className="pl-6 mt-1 space-y-1">
                                  {Object.values(folder.lists).map((list: HierarchicalList) => (
                                    <div key={list.id} className="group relative flex items-center">
                                      <button onClick={() => { setSelectedList({ webhookId: webhook.id, webhookUrl: webhook.url, workspace: workspace.name, folder: folder.name, list: list.name }); setView('kanban'); }} className={getListItemClass(list.name, folder.name, workspace.name, webhook.id)}>
                                        <span className="flex items-center"><ListIcon className="w-4 h-4 mr-2"/> {list.name}</span>
                                      </button>
                                      <button onClick={(e) => { stopPropagation(e); setModalAction({ type: 'RENAME', structure: 'list', context: { workspace: workspace.name, folder: folder.name, name: list.name, webhookId: webhook.id, webhookUrl: webhook.url }}); }} className="absolute right-1 opacity-0 group-hover:opacity-100 text-gray-400 hover:text-white p-1 rounded-md hover:bg-gray-600">
                                        <DotsVerticalIcon className="w-5 h-5"/>
                                      </button>
                                    </div>
                                  ))}
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </nav>
        <div className="p-4 border-t border-gray-700">
            <button onClick={() => setWebhookManagerOpen(true)} className="w-full flex items-center p-2 text-sm text-gray-400 hover:bg-gray-700 rounded-md">
                <SettingsIcon className="w-5 h-5 mr-2" />
                <span>Gerenciar Webhooks</span>
            </button>
        </div>
      </aside>

      <main className="flex-1 flex flex-col overflow-hidden">
        <header className="flex-col md:flex-row flex items-start md:items-center justify-between p-4 border-b border-gray-700 bg-gray-800 space-y-4 md:space-y-0">
          <div>
             <h2 className="text-2xl font-bold text-gray-100">{view === 'home' ? 'Página Inicial' : (selectedList?.list || 'Selecione uma Lista')}</h2>
             {view !== 'home' && <p className="text-sm text-gray-400">{`${selectedList?.workspace || ''} / ${selectedList?.folder || ''}`}</p>}
          </div>
          <div className="flex items-center space-x-4">
            <button onClick={() => setCreateModalOpen(true)} className="flex items-center bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors">
              <PlusIcon className="w-5 h-5 mr-2" />
              <span>Nova Tarefa</span>
            </button>
            <ViewSwitcher currentView={view} onViewChange={setView} />
            <button onClick={onRefresh} disabled={isLoading} className="p-2 text-gray-400 rounded-full hover:bg-gray-700 disabled:opacity-50">
              <RefreshIcon className={`w-6 h-6 ${isLoading ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </header>
         <FilterBar
            onSearch={setSearchTerm}
            onPriorityChange={setPriorityFilter}
            onAssigneeChange={setAssigneeFilter}
            allAssignees={allAssignees}
            allPriorities={allPriorities}
         />
        <div className="flex-1 overflow-y-auto p-6">
          {renderContent()}
        </div>
      </main>

      {selectedTask && (
        <TaskDetailModal 
            task={selectedTask} 
            onClose={() => setSelectedTask(null)}
            onUpdate={handleUpdateTask} 
            allStatuses={allStatuses}
            allPriorities={allPriorities}
            onCreateTask={handleCreateTask}
            onSelectTaskById={handleSelectTaskById}
        />
      )}
      
      {isCreateModalOpen && (
        <CreateTaskModal 
          onClose={() => setCreateModalOpen(false)} 
          onCreate={handleCreateTask}
          listContext={selectedList 
            ? { Space_Name: selectedList.workspace, Folder_Name: selectedList.folder, List_Name: selectedList.list, webhookId: selectedList.webhookId, webhookUrl: selectedList.webhookUrl }
            : (webhooks.length > 0 ? { Space_Name: 'Default', Folder_Name: 'Default', List_Name: 'Default', webhookId: webhooks[0].id, webhookUrl: webhooks[0].url } : null)
          }
          allAssignees={allAssignees}
          allStatuses={allStatuses}
          allPriorities={allPriorities}
        />
      )}

      {modalAction && (
        <ActionModal
          action={modalAction.type}
          structure={modalAction.structure}
          context={modalAction.context}
          onConfirm={handleStructureAction}
          onClose={() => setModalAction(null)}
        />
      )}
      
      {isWebhookManagerOpen && (
        <WebhookManagerModal
          webhooks={webhooks}
          onClose={() => setWebhookManagerOpen(false)}
          onUpdate={onWebhooksUpdate}
        />
      )}
    </div>
  );
};

export default MainLayout;