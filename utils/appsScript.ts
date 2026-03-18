// Fix: The Apps Script code is encapsulated in a function that returns it as a string.
// This prevents TypeScript from trying to compile the Apps Script globals (like SpreadsheetApp)
// and allows the Onboarding component to import and display the code correctly.
export const getAppsScriptCode = (): string => {
  return `// Piloto de Projetos - Backend Google Apps Script (Modelo de Eventos)
// GUIA RÁPIDO DE DEBUG:
// 1. "Failed to fetch" ou Erro de CORS? Na implantação, "Quem tem acesso" DEVE ser "Qualquer pessoa".
// 2. O script não funciona? Vá em "Execuções" no menu à esquerda para ver os logs de erro.
// 3. Alterou o código? Você PRECISA criar uma nova versão da implantação ("Implantar" > "Gerenciar implantações" > Editar > Versão: "Nova versão").

// -----------------------------------------------------------------------------
// INSTRUÇÕES DE CONFIGURAÇÃO INICIAL:
// 1. Cole este script no editor de Apps Script (Extensões > Apps Script).
// 2. CERTIFIQUE-SE DE QUE SUA PLANILHA TENHA AS COLUNAS: 'Last_Modified', 'Time_Spent_Text', e 'Comments'. A coluna 'Last_Modified' é OBRIGATÓRIA.
// 3. Clique em "Implantar" > "Nova implantação".
// 4. Em "Selecionar tipo", escolha "App da Web".
// 5. Em "Quem tem acesso", selecione "Qualquer pessoa".
// 6. Clique em "Implantar", autorize as permissões e copie a URL do app da Web para usar no seu aplicativo.
//
// INSTRUÇÕES PARA RECORRÊNCIA (IMPORTANTE!):
// Para que as tarefas recorrentes funcionem, você precisa configurar um gatilho de tempo:
// 1. No editor do Apps Script, clique no ícone de relógio ("Acionadores") no menu à esquerda.
// 2. Clique em "+ Adicionar acionador" no canto inferior direito.
// 3. Na janela que abrir, configure o seguinte:
//    - Escolha qual função executar: processRecurrences
//    - Escolha qual implantação executar: Head
//    - Selecione a origem do evento: Com base no tempo
//    - Selecione o tipo de acionador com base no tempo: Seletor de hora
//    - Selecione o intervalo de horas: A cada hora (recomendado)
// 4. Clique em "Salvar". O Google pedirá autorização novamente.
// -----------------------------------------------------------------------------


function doPost(e) {
  try {
    const sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
    const body = JSON.parse(e.postData.contents);
    const action = body.action;
    
    // Operações de leitura não precisam de trava, melhorando a performance e evitando timeouts.
    if (action === 'GET_DATA') {
      const data = getData(sheet);
      return createJsonResponse({ status: 'success', data: data });
    }

    // Para todas as operações de escrita, usamos um bloqueio para garantir a integridade dos dados.
    let result;
    const lock = LockService.getScriptLock();
    lock.waitLock(30000); // Espera até 30 segundos
    
    try {
      switch(action) {
        case 'UPDATE_TASK':
          addTaskEvent(sheet, body.taskData);
          break;
        case 'CREATE_TASK':
           createTask(sheet, body.taskData);
          break;
        case 'RENAME_STRUCTURE':
           renameStructureInSheet(sheet, body);
           break;
        case 'DELETE_STRUCTURE':
           deleteStructureInSheet(sheet, body);
           break;
        default:
          throw new Error('Ação inválida: ' + action);
      }
      // CRÍTICO: Após qualquer operação de escrita bem-sucedida, retorna o conjunto de dados completo.
      // Isso elimina a necessidade de uma segunda chamada do front-end, resolvendo o "Lock timeout".
      result = getData(sheet);

    } finally {
      lock.releaseLock();
    }
    
    return createJsonResponse({ status: 'success', data: result });
    
  } catch (error) {
    return createJsonResponse({ status: 'error', message: error.message, stack: error.stack });
  }
}

function doGet(e) {
    return createJsonResponse({ status: 'success', message: 'Webhook está ativo. Use POST para enviar dados.' });
}

function createJsonResponse(data) {
  return ContentService.createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON);
}

function getHeaders(sheet) {
  if (sheet.getLastRow() === 0) return [];
  return sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
}

function ensureColumnsExist(sheet, headers, taskData) {
  const taskKeys = Object.keys(taskData);
  const newHeaders = taskKeys.filter(key => !headers.includes(key));
  
  if (newHeaders.length > 0) {
    const lastColumn = headers.length;
    sheet.getRange(1, lastColumn + 1, 1, newHeaders.length).setValues([newHeaders]);
    return headers.concat(newHeaders);
  }
  
  return headers;
}


function sheetDataToJson(sheetData, headers) {
    return sheetData.map(function(row) {
        let obj = {};
        row.forEach(function(cell, i) {
            if (headers[i]) {
                obj[headers[i]] = cell;
            }
        });
        return obj;
    });
}

function getData(sheet) {
  const headers = getHeaders(sheet);
  if (headers.length === 0 || sheet.getLastRow() <= 1) return [];

  const dataRange = sheet.getRange(2, 1, sheet.getLastRow() - 1, headers.length);
  const values = dataRange.getValues();
  return sheetDataToJson(values, headers);
}

// A função agora não precisa retornar nada, pois o doPost retornará os dados completos.
function addTaskEvent(sheet, taskData) {
  let headers = getHeaders(sheet);
  if (!headers.includes('Last_Modified')) {
    throw new Error("Sua planilha PRECISA ter uma coluna 'Last_Modified'.");
  }
  headers = ensureColumnsExist(sheet, headers, taskData);
  taskData['Last_Modified'] = new Date().toISOString();
  const newRow = headers.map(header => taskData[header] !== undefined ? taskData[header] : "");
  sheet.appendRow(newRow);
}

// A função agora não precisa retornar nada.
function createTask(sheet, taskData) {
  let headers = getHeaders(sheet);
  const newTaskId = "task_" + new Date().getTime() + "_" + Math.random().toString(36).substr(2, 9);
  
  taskData['Task_ID'] = newTaskId;
  const now = new Date().toISOString();
  taskData['Date_Created'] = now;
  taskData['Last_Modified'] = now;
  
  if (!taskData['Time_Spent_Text']) taskData['Time_Spent_Text'] = "0 m";
  if (!taskData['Comments']) taskData['Comments'] = "[]";

  headers = ensureColumnsExist(sheet, headers, taskData);
  const newRow = headers.map(header => taskData[header] !== undefined ? taskData[header] : "");

  sheet.appendRow(newRow);
}

// A função agora não precisa retornar nada.
function renameStructureInSheet(sheet, payload) {
  const { structureType, oldName, newName, context } = payload;
  const headers = getHeaders(sheet);
  if (sheet.getLastRow() <= 1) return;
  const dataRange = sheet.getRange(2, 1, sheet.getLastRow() - 1, headers.length);
  const values = dataRange.getValues();
  
  let colToChange = -1;
  if (structureType === 'workspace') colToChange = headers.indexOf('Space_Name');
  if (structureType === 'folder') colToChange = headers.indexOf('Folder_Name');
  if (structureType === 'list') colToChange = headers.indexOf('List_Name');

  if (colToChange === -1) throw new Error('Coluna da estrutura não encontrada.');

  const spaceCol = headers.indexOf('Space_Name');
  const folderCol = headers.indexOf('Folder_Name');
  
  for (let i = 0; i < values.length; i++) {
    let match = false;
    if (structureType === 'workspace' && values[i][colToChange] === oldName) {
      match = true;
    } else if (structureType === 'folder' && values[i][colToChange] === oldName && values[i][spaceCol] === context.workspace) {
      match = true;
    } else if (structureType === 'list' && values[i][colToChange] === oldName && values[i][spaceCol] === context.workspace && values[i][folderCol] === context.folder) {
      match = true;
    }
    
    if (match) {
      values[i][colToChange] = newName;
    }
  }
  
  dataRange.setValues(values);
}

// A função agora não precisa retornar nada.
function deleteStructureInSheet(sheet, payload) {
  const { structureType, name, context } = payload;
  const headers = getHeaders(sheet);
  if (sheet.getLastRow() <= 1) return;
  
  const data = sheet.getDataRange().getValues();
  
  const spaceCol = headers.indexOf('Space_Name');
  const folderCol = headers.indexOf('Folder_Name');
  const listCol = headers.indexOf('List_Name');

  for (let i = data.length - 1; i >= 1; i--) { // Iterate backwards when deleting
    const row = data[i];
    let match = false;
    if (structureType === 'workspace' && row[spaceCol] === name) {
      match = true;
    } else if (structureType === 'folder' && row[folderCol] === name && row[spaceCol] === context.workspace) {
      match = true;
    } else if (structureType === 'list' && row[listCol] === name && row[spaceCol] === context.workspace && row[folderCol] === context.folder) {
      match = true;
    }
    
    if (match) {
      sheet.deleteRow(i + 1);
    }
  }
}

// ------------ RECURRENCE LOGIC ------------
// ESTA FUNÇÃO É ACIONADA POR UM GATILHO DE TEMPO (veja as instruções no topo)
function processRecurrences() {
    const sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
    const lock = LockService.getScriptLock();
    lock.waitLock(30000);

    try {
        const headers = getHeaders(sheet);
        if (headers.length === 0) return;
        const allData = getData(sheet);
        
        // 1. Get latest state for each task
        const taskMap = new Map();
        allData.forEach(row => {
            if (!row.Task_ID) return;
            const existing = taskMap.get(row.Task_ID);
            const rowDate = new Date(row.Last_Modified || row.Date_Created || 0).getTime();
            if (!existing || rowDate > existing.date) {
                taskMap.set(row.Task_ID, { data: row, date: rowDate });
            }
        });

        const latestStates = Array.from(taskMap.values()).map(v => v.data);
        const now = new Date();
        
        latestStates.forEach(task => {
            if (task.Status === 'Concluído' && task.Recurrence_Rule) {
                try {
                    const rule = JSON.parse(task.Recurrence_Rule);
                    const nextDueDate = new Date(rule.nextDueDate);

                    if (now >= nextDueDate) {
                        // A tarefa está pronta para recorrer
                        const newNextDueDate = calculateNextDueDate(rule, nextDueDate);
                        const newRule = { ...rule, nextDueDate: newNextDueDate.toISOString() };
                        
                        if (rule.mode === 'reopen') {
                            const updatePayload = {
                                Task_ID: task.Task_ID,
                                Status: 'A Fazer',
                                Due_Date: nextDueDate.toISOString(),
                                Recurrence_Rule: JSON.stringify(newRule)
                            };
                            addTaskEvent(sheet, updatePayload);

                        } else if (rule.mode === 'create_new') {
                             const newTaskPayload = { ...task };
                             delete newTaskPayload.Task_ID; 
                             delete newTaskPayload.Date_Created;
                             delete newTaskPayload.Last_Modified;
                             delete newTaskPayload.history;
                             delete newTaskPayload.subtasks;

                            // Apaga campos com base nas opções
                            if (!rule.creationOptions.keepStructure) {
                                delete newTaskPayload.Space_Name;
                                delete newTaskPayload.Folder_Name;
                                delete newTaskPayload.List_Name;
                                delete newTaskPayload.Parent_Task_ID;
                            }
                            if (!rule.creationOptions.keepDetails) {
                                delete newTaskPayload.Task_Name;
                                delete newTaskPayload.Assignees;
                                delete newTaskPayload.Priority;
                                delete newTaskPayload.Tags;
                            }
                            if (!rule.creationOptions.keepContent) {
                                delete newTaskPayload.Task_Content;
                                // subtarefas não são copiadas por padrão, a menos que seja uma feature futura
                            }
                            if (!rule.creationOptions.keepData) {
                                newTaskPayload.Time_Spent_Text = "0 m";
                                newTaskPayload.Comments = "[]";
                                // Limpa campos personalizados
                                Object.keys(newTaskPayload).forEach(key => {
                                    if (!['Task_Name','Task_Content','Space_Name','Folder_Name','List_Name','Status','Priority','Tags','Assignees','Due_Date','Parent_Task_ID'].includes(key)) {
                                       delete newTaskPayload[key];
                                    }
                                });
                            }
                            
                            newTaskPayload.Due_Date = nextDueDate.toISOString();
                            newTaskPayload.Status = 'A Fazer';
                            delete newTaskPayload.Recurrence_Rule; // A nova tarefa não recorre
                            
                            createTask(sheet, newTaskPayload);
                            
                            // Atualiza a tarefa original com a nova data da próxima recorrência
                            const originalTaskUpdate = {
                                Task_ID: task.Task_ID,
                                Recurrence_Rule: JSON.stringify(newRule)
                            };
                            addTaskEvent(sheet, originalTaskUpdate);
                        }
                    }
                } catch (e) {
                    // Ignora erros de parsing JSON ou de regra inválida
                    Logger.log("Erro ao processar recorrência para a tarefa " + task.Task_ID + ": " + e.message);
                }
            }
        });

    } finally {
        lock.releaseLock();
    }
}


function calculateNextDueDate(rule, fromDate) {
    let nextDate = new Date(fromDate.getTime());

    if (rule.frequency === 'weekly') {
        const sortedDays = rule.daysOfWeek.sort();
        nextDate.setDate(nextDate.getDate() + 1); // Começa a procurar a partir do dia seguinte

        while (true) {
            const currentDay = nextDate.getDay();
            if (sortedDays.includes(currentDay)) {
                return nextDate; // Encontrou o próximo dia válido na mesma semana ou na próxima
            }
            nextDate.setDate(nextDate.getDate() + 1);
        }
    } else if (rule.frequency === 'monthly') {
        // Lógica simples de adicionar um mês. Pode ser aprimorada para lidar com meses de durações diferentes.
        nextDate.setMonth(nextDate.getMonth() + 1);
        return nextDate;
    }
    
    // Fallback: adiciona 7 dias se a regra for desconhecida
    nextDate.setDate(nextDate.getDate() + 7);
    return nextDate;
}
`;
};