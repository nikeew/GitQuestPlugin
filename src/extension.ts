import * as vscode from 'vscode';

let secondsCoded = 0;
let pomodoroSeconds = 25 * 60;
let isPomodoroActive = false;
let interval: NodeJS.Timeout | undefined;

// Состояние ачивок (общие переменные для провайдера и логики)
let achCleanCode = false;
let achProCommit = false;
let achRefactorMaster = false;
let achNightHacker = false;
let achBranchMaster = false;
let achBugHunter = false;
let achReleaseReady = false;
let achTopContributor = false;

// Провайдер для боковой панели с полной статистикой и списком ачивок
class GitQuestTreeDataProvider implements vscode.TreeDataProvider<vscode.TreeItem> {
    private _onDidChangeTreeData: vscode.EventEmitter<vscode.TreeItem | undefined | void> = new vscode.EventEmitter<vscode.TreeItem | undefined | void>();
    readonly onDidChangeTreeData: vscode.Event<vscode.TreeItem | undefined | void> = this._onDidChangeTreeData.event;

    refresh(): void {
        this._onDidChangeTreeData.fire();
    }

    getTreeItem(element: vscode.TreeItem): vscode.TreeItem {
        return element;
    }

    getChildren(): Thenable<vscode.TreeItem[]> {
        const mins = Math.floor(secondsCoded / 60);
        const secs = secondsCoded % 60;
        const formattedTime = `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;

        const items: vscode.TreeItem[] = [];

        // Основная статистика сессии
        items.push(new vscode.TreeItem(`Уровень: 1 (Новичок)`, vscode.TreeItemCollapsibleState.None));
        items.push(new vscode.TreeItem(`Время в коде: ${formattedTime}`, vscode.TreeItemCollapsibleState.None));
        items.push(new vscode.TreeItem(`Pomodoro: ${isPomodoroActive ? 'Включен' : 'Выключен'}`, vscode.TreeItemCollapsibleState.None));

        // Список ачивок
        items.push(new vscode.TreeItem(achCleanCode ? "[Линтер] Чистый код" : "[Линтер] Сохранить файл без багов", vscode.TreeItemCollapsibleState.None));
        items.push(new vscode.TreeItem(achBugHunter ? "[Код] Охотник за багами" : "[Код] Очистить файл от ворнингов", vscode.TreeItemCollapsibleState.None));
        items.push(new vscode.TreeItem(achProCommit ? "[Git] Мастер Commits" : "[Git] Пройти валидацию коммита", vscode.TreeItemCollapsibleState.None));
        items.push(new vscode.TreeItem(achBranchMaster ? "[GitFlow] Мастер ветвления" : "[GitFlow] Создать feature/ ветку", vscode.TreeItemCollapsibleState.None));
        items.push(new vscode.TreeItem(achRefactorMaster ? "[Архитектура] Рефактор-бог" : "[Архитектура] Написать от 20 строк", vscode.TreeItemCollapsibleState.None));
        items.push(new vscode.TreeItem(achReleaseReady ? "[Релиз] Релизный день" : "[Релиз] Пройти пре-релизный контроль", vscode.TreeItemCollapsibleState.None));
        items.push(new vscode.TreeItem(achNightHacker ? "[Пасхалка] Ночной хакер" : "[Пасхалка] Кодить в ночное время", vscode.TreeItemCollapsibleState.None));
        items.push(new vscode.TreeItem(achTopContributor ? "[ЛЕГЕНДА] Топ-контрибьютор" : "[ЛЕГЕНДА] Собрать основные навыки", vscode.TreeItemCollapsibleState.None));

        return Promise.resolve(items);
    }
}

export function activate(context: vscode.ExtensionContext) {
    console.log('GitQuest успешно активирован!');

    // Проверка пасхалки (ночной хакер: 00:00 - 06:00)
    const currentHour = new Date().getHours();
    if (currentHour >= 0 && currentHour < 6) {
        achNightHacker = true;
    }

    // Создаем и регистрируем провайдер боковой панели
    const treeDataProvider = new GitQuestTreeDataProvider();
    vscode.window.registerTreeDataProvider('gitquestAchievementsView', treeDataProvider);
    vscode.window.registerTreeDataProvider('gitquestStats', treeDataProvider); // для совместимости

    // --- ФИЧА 1: УМНЫЙ ЛИНТЕР И СОХРАНЕНИЕ ---
    let diagnosticCollection = vscode.languages.createDiagnosticCollection('gitquest-scanner');
    context.subscriptions.push(diagnosticCollection);

    vscode.workspace.onDidSaveTextDocument((document: vscode.TextDocument) => {
        const text = document.getText();
        const lines = text.split('\n');
        let hasErrors = false;

        lines.forEach((lineText, lineIndex) => {
            if (lineText.includes('console.log') || lineText.includes('eval(')) {
                hasErrors = true;
                const range = new vscode.Range(lineIndex, 0, lineIndex, lineText.length);
                diagnosticCollection.set(document.uri, [
                    new vscode.Diagnostic(range, 'GitQuest: Найден отладочный код', vscode.DiagnosticSeverity.Warning)
                ]);
            }
        });

        if (!hasErrors && !achCleanCode) {
            achCleanCode = true;
            vscode.window.showInformationMessage('АЧИВКА: "Чистый код" (Статический анализ пройден успешно)!');
        }

        if (!hasErrors && lines.length >= 10 && !achBugHunter) {
            achBugHunter = true;
            vscode.window.showInformationMessage('АЧИВКА: "Охотник за багами" (Файл полностью очищен от ворнингов)!');
        }

        if (lines.length >= 20 && !achRefactorMaster) {
            achRefactorMaster = true;
            vscode.window.showInformationMessage('АЧИВКА: "Рефактор-бог" (Написано более 20 строк логики)!');
        }

        checkLegendStatus();
        treeDataProvider.refresh();
    });

    // --- ФИЧА 2: ВАЛИДАТОР КОММИТОВ ---
    let commitCheckerCommand = vscode.commands.registerCommand('gitquest.checkCommit', async () => {
        const commitMessage = await vscode.window.showInputBox({
            placeHolder: 'Например: feat: добавлен модуль авторизации',
            prompt: 'Введите текст вашего Git-коммита по стандарту Conventional Commits'
        });

        if (!commitMessage) return;

        const validPrefixes = ['feat:', 'fix:', 'docs:', 'style:', 'refactor:', 'test:', 'chore:'];
        const isValid = validPrefixes.some(prefix => commitMessage.trim().startsWith(prefix)) && commitMessage.length > 10;

        if (isValid) {
            vscode.window.showInformationMessage(`Коммит идеален! Стандарт соблюден.`);
            if (!achProCommit) {
                achProCommit = true;
                vscode.window.showInformationMessage('АЧИВКА: "Мастер Conventional Commits"!');
                checkLegendStatus();
                treeDataProvider.refresh();
            }
        } else {
            vscode.window.showErrorMessage(`Ошибка! Используйте префиксы (feat:, fix:) и длину от 10 символов.`);
        }
    });

    // --- ФИЧА 3: СИМУЛЯТОР СОЗДАНИЯ ВЕТКИ ---
    let branchCommand = vscode.commands.registerCommand('gitquest.createBranch', async () => {
        const branchName = await vscode.window.showInputBox({
            placeHolder: 'feature/login-page',
            prompt: 'Введите имя новой ветки по стандарту Git Flow (feature/... или bugfix/...)'
        });

        if (!branchName) return;

        if (branchName.startsWith('feature/') || branchName.startsWith('bugfix/')) {
            vscode.window.showInformationMessage(`Успешно создана и переключена ветка: ${branchName}`);
            if (!achBranchMaster) {
                achBranchMaster = true;
                vscode.window.showInformationMessage('АЧИВКА: "Мастер ветвления" (Правильная работа с Git Flow)!');
                checkLegendStatus();
                treeDataProvider.refresh();
            }
        } else {
            vscode.window.showErrorMessage(`Неверное имя ветки! Используйте префиксы feature/ или bugfix/.`);
        }
    });
    // --- ФИЧА 4: ПРОВЕРКА ГОТОВНОСТИ К РЕЛИЗУ ---
    let releaseCommand = vscode.commands.registerCommand('gitquest.checkRelease', () => {
        if (achCleanCode && achProCommit) {
            achReleaseReady = true;
            vscode.window.showInformationMessage('АЧИВКА: "Релизный день" (Проект полностью готов к слиянию в main)!');
            checkLegendStatus();
            treeDataProvider.refresh();
        } else {
            vscode.window.showWarningMessage('Релиз заблокирован! Сначала получите ачивки "Чистый код" и "Мастер Commits".');
        }
    });

    // --- БАЗОВЫЕ КОМАНДЫ И СТАТУС-БАР ---
    let helloCommand = vscode.commands.registerCommand('gitquest.helloWorld', () => {
        vscode.window.showInformationMessage('Hello, World! Ева');
    });

    let helloStatusBarItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Right, 100);
    helloStatusBarItem.command = 'gitquest.helloWorld';
    helloStatusBarItem.text = '$(smiley) Say Hello';
    helloStatusBarItem.tooltip = 'GitQuest: Поприветствовать';
    helloStatusBarItem.show();

    let checkFileCommand = vscode.commands.registerCommand('gitquest.checkFile', (uri: vscode.Uri) => {
        vscode.window.showInformationMessage(`Проверяем файл: ${uri ? uri.fsPath : 'неизвестно'}`);
    });

    let timerStatusBarItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Right, 90);
    timerStatusBarItem.command = 'gitquest.resetTimer';
    timerStatusBarItem.tooltip = "Время кодинга за сессию. Кликните, чтобы сбросить.";
    timerStatusBarItem.show();

    function formatTime(totalSeconds: number): string {
        const mins = Math.floor(totalSeconds / 60);
        const secs = totalSeconds % 60;
        return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }

    // ТАЙМЕР И ЕЖЕСЕКУНДНОЕ ОБНОВЛЕНИЕ БОКОВОЙ ПАНЕЛИ
    interval = setInterval(() => {
        secondsCoded++;
        timerStatusBarItem.text = `$(watch) Время в коде: ${formatTime(secondsCoded)}`;
        
        // Обновляем боковую панель каждую секунду
        treeDataProvider.refresh();
        
        if (isPomodoroActive) {
            pomodoroSeconds--;
            if (pomodoroSeconds <= 0) {
                vscode.window.showWarningMessage('Перерыв! Вы отлично поработали 25 минут. Отдохните 5 минут!', 'Понятно');
                pomodoroSeconds = 25 * 60;
            }
        }
    }, 1000);

    let resetTimerCommand = vscode.commands.registerCommand('gitquest.resetTimer', () => {
        secondsCoded = 0;
        treeDataProvider.refresh();
        vscode.window.showInformationMessage('Таймер сброшен!');
    });

    let togglePomodoroCommand = vscode.commands.registerCommand('gitquest.togglePomodoro', () => {
        isPomodoroActive = !isPomodoroActive;
        treeDataProvider.refresh();
        const status = isPomodoroActive ? 'включен (25 мин)' : 'выключен';
        vscode.window.showInformationMessage(`Таймер отдыха Pomodoro ${status}.`);
    });

    let gitHelperStatusBar = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Right, 95);
    gitHelperStatusBar.command = 'gitquest.checkCommit';
    gitHelperStatusBar.text = `$(git-merge) Проверить коммит`;
    gitHelperStatusBar.show();

    function checkLegendStatus() {
        if (!achTopContributor && achCleanCode && achProCommit && achRefactorMaster && achBranchMaster && achBugHunter) {
            achTopContributor = true;
            vscode.window.showInformationMessage('ЭПИЧЕСКАЯ АЧИВКА: "Топ-контрибьютор" (Собраны все ключевые навыки инженера)!');
        }
    }

    context.subscriptions.push(
        helloCommand, 
        helloStatusBarItem,
        checkFileCommand,
        timerStatusBarItem,
        resetTimerCommand,
        togglePomodoroCommand,
        commitCheckerCommand,
        branchCommand,
        releaseCommand,
        gitHelperStatusBar,
        {
            dispose: () => {
                if (interval) {
                    clearInterval(interval);
                }
            }
        }
    );
}

export function deactivate() {}