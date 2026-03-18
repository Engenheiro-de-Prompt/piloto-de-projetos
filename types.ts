export interface Webhook {
  id: string;
  name: string;
  url: string;
}

export interface Comment {
  author: string;
  text: string;
  timestamp: string;
}

export interface RecurrenceRule {
  frequency: 'weekly' | 'monthly';
  interval: number; // For future use, e.g., every 2 weeks. Default to 1.
  daysOfWeek?: number[]; // 0 for Sunday, 6 for Saturday
  dayOfMonth?: number; // 1-31
  mode: 'reopen' | 'create_new';
  // Options for 'create_new' mode
  creationOptions?: {
    keepStructure: boolean; // Space, Folder, List, Parent Task
    keepDetails: boolean;   // Name, Assignees, Priority, Tags
    keepContent: boolean;   // Description, Subtasks
    keepData: boolean;      // Time Spent, Comments, Custom Fields
  };
  // Internal tracking
  nextDueDate?: string; // The next scheduled occurrence
}


export interface Task {
  Task_ID: string;
  Task_Name: string;
  Task_Content?: string;
  Space_Name: string;
  Folder_Name: string;
  List_Name: string;
  Status: string;
  Priority?: string;
  Tags?: string[];
  Assignees?: string[] | string;
  Due_Date?: string;
  Time_Spent_Text?: string; 
  Comments?: string;
  Date_Created?: string;
  Last_Modified?: string; // Essencial para ordenar eventos
  Parent_Task_ID?: string; // ID da tarefa pai
  Recurrence_Rule?: string; // JSON string of RecurrenceRule
  subtasks?: Task[]; // Para aninhar subtarefas
  history?: Task[]; // Para armazenar estados anteriores
  webhookId?: string; // To identify the source webhook
  webhookName?: string; // For display purposes
  webhookUrl?: string; // To make API calls for this task
  [key: string]: any; // For custom fields
}

export type ViewType = 'home' | 'list' | 'kanban' | 'table';

export interface HierarchicalList {
  id: string;
  name: string;
  tasks: Task[];
}

export interface HierarchicalFolder {
  id: string;
  name: string;
  lists: { [listId: string]: HierarchicalList };
}

export interface HierarchicalWorkspace {
  id: string;
  name: string;
  folders: { [folderId: string]: HierarchicalFolder };
}

export type HierarchicalData = {
  [workspaceId: string]: HierarchicalWorkspace;
};

export type ColumnFormat = 'text' | 'number' | 'date' | 'categorical';

export interface ColumnConfig {
  key: string;
  label: string;
  format: ColumnFormat;
  isVisible: boolean;
  options?: string[]; // For 'categorical' format
}
