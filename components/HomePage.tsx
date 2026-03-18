import React, { useMemo } from 'react';
import { Task } from '../types';
import TableView from './TableView';
import { createValidDate } from '../utils/dateUtils';
import CollapsibleSection from './CollapsibleSection';

interface HomePageProps {
  tasks: Task[];
  onTaskClick: (task: Task) => void;
  onUpdateTask: (task: Task) => void;
  allStatuses: string[];
  allPriorities: string[];
  onGoToParent: (parentId: string) => void;
}

const HomePage: React.FC<HomePageProps> = ({ tasks, ...props }) => {
  const categorizedTasks = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayTime = today.getTime();

    const overdue: Task[] = [];
    const todayTasks: Task[] = [];
    const upcoming: Task[] = [];
    const noDate: Task[] = [];

    tasks.forEach(task => {
      // Ignora subtarefas na categorização da página inicial para evitar duplicação
      if(task.Parent_Task_ID) return;

      const dueDate = createValidDate(task.Due_Date);
      
      if (!dueDate) {
        noDate.push(task);
        return;
      }
      
      const taskDueDate = new Date(dueDate);
      taskDueDate.setHours(0, 0, 0, 0);
      const taskDueTime = taskDueDate.getTime();

      if (task.Status !== 'Concluído' && taskDueTime < todayTime) {
        overdue.push(task);
      } else if (taskDueTime === todayTime) {
        todayTasks.push(task);
      } else if (taskDueTime > todayTime) {
        upcoming.push(task);
      } else {
        if (task.Status !== 'Concluído') {
            upcoming.push(task)
        }
      }
    });

    return { overdue, todayTasks, upcoming, noDate };
  }, [tasks]);

  const renderSection = (title: string, taskList: Task[], defaultCollapsed = false) => {
    if (taskList.length === 0) return null;

    return (
      <CollapsibleSection title={`${title} (${taskList.length})`} defaultCollapsed={defaultCollapsed}>
        <div className="mt-4">
          <TableView
            tasks={taskList}
            showCompletedToggle={false}
            {...props}
          />
        </div>
      </CollapsibleSection>
    );
  };

  return (
    <div className="w-full h-full space-y-6">
      {renderSection("Para Hoje", categorizedTasks.todayTasks, false)}
      {renderSection("Atrasadas", categorizedTasks.overdue, true)}
      {renderSection("Próximas", categorizedTasks.upcoming, true)}
      {renderSection("Sem Data", categorizedTasks.noDate, true)}
    </div>
  );
};

export default HomePage;