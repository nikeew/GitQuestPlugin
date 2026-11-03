import * as vscode from 'vscode';

let secondsCoded = 0;
let pomodoroSeconds = 25 * 60;
let isPomodoroActive = false;
let interval: NodeJS.Timeout | undefined;

// Состояние ачивок
let achCleanCode = false;
let achProCommit = false;
let achRefactorMaster = false;
let achNightHacker = false;
let achBranchMaster = false;
let achBugHunter = false;
let achReleaseReady = false;
let achTopContributor = false;

// Провайдер для боковой панели
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

        const levelItem = new vscode.TreeItem(`Уровень: 1 (Новичок)`, vscode.TreeItemCollapsibleState.None);
        levelItem.iconPath = new vscode.ThemeIcon('account', new vscode.ThemeColor('charts.purple'));
        items.push(levelItem);

        const timeItem = new vscode.TreeItem(`Время в коде: ${formattedTime}`, vscode.TreeItemCollapsibleState.None);
        timeItem.iconPath = new vscode.ThemeIcon('clock', new vscode.ThemeColor('charts.blue'));
        items.push(timeItem);

        const pomoItem = new vscode.TreeItem(`Pomodoro: ${isPomodoroActive ? 'Включен' : 'Выключен'}`, vscode.TreeItemCollapsibleState.None);
        pomoItem.iconPath = new vscode.ThemeIcon('play-circle', new vscode.ThemeColor(isPomodoroActive ? 'charts.green' : 'charts.red'));
        items.push(pomoItem);

        const createAchievementItem = (title: string, isUnlocked: boolean) => {
            const item = new vscode.TreeItem(title, vscode.TreeItemCollapsibleState.None);
            if (isUnlocked) {
                item.iconPath = new vscode.ThemeIcon('pass', new vscode.ThemeColor('charts.green'));
                item.description = 'Разблокировано';
            } else {
                item.iconPath = new vscode.ThemeIcon('circle-outline', new vscode.ThemeColor('disabledForeground'));
                item.description = 'Закрыто';
            }
            return item;
        };

        items.push(createAchievementItem(achCleanCode ? "Чистый код" : "Сохранить файл без багов", achCleanCode));
        items.push(createAchievementItem(achBugHunter ? "Охотник за багами" : "Очистить файл от ворнингов", achBugHunter));
        items.push(createAchievementItem(achProCommit ? "Мастер Commits" : "Сделать правильный коммит", achProCommit));
        items.push(createAchievementItem(achBranchMaster ? "Мастер ветвления" : "Создать feature/ ветку", achBranchMaster));
        items.push(createAchievementItem(achRefactorMaster ? "Рефактор-бог" : "Написать от 20 строк", achRefactorMaster));
        items.push(createAchievementItem(achReleaseReady ? "Релизный день" : "Пройти пре-релизный контроль", achReleaseReady));
        items.push(createAchievementItem(achNightHacker ? "Ночной хакер" : "Кодить в ночное время", achNightHacker));
        items.push(createAchievementItem(achTopContributor ? "[ЛЕГЕНДА] Топ-контрибьютор" : "[ЛЕГЕНДА] Собрать основные навыки", achTopContributor));

        return Promise.resolve(items);
    }
}

export function activate(context: vscode.ExtensionContext) {
    console.log('GitQuest успешно активирован!');

    const currentHour = new Date().getHours();
    if (currentHour >= 0 && currentHour < 6) {
        achNightHacker = true;
    }

    const treeDataProvider = new GitQuestTreeDataProvider();
    vscode.window.registerTreeDataProvider('gitquestStats', treeDataProvider);

    // --- УМНЫЙ ЛИНТЕР И СОХРАНЕНИЕ ФАЙЛОВ ---
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

        if (!hasErrors) {
            diagnosticCollection.clear();
        }

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

    // --- АВТОМАТИЧЕСКОЕ ОТСЛЕЖИВАНИЕ GIT ---
    const extension = vscode.extensions.getExtension('vscode.git');
    if (extension) {
        const gitApi = extension.exports.getAPI(1);

        const setupRepoListeners = (repo: any) => {
            repo.state.onDidChange(() => {
                const head = repo.state.HEAD;

                // 1. Автопроверка ветки (Git Flow)
                if (head && head.name) {
                    if ((head.name.startsWith('feature/') || head.name.startsWith('bugfix/')) && !achBranchMaster) {
                        achBranchMaster = true;
                        vscode.window.showInformationMessage(`АЧИВКА: "Мастер ветвления" (Ветка ${head.name})!`);
                        checkLegendStatus();
                        treeDataProvider.refresh();
                    }
                }

                // 2. Автопроверка коммитов
                if (repo.state.commits && repo.state.commits.length > 0) {
                    const lastCommit = repo.state.commits[0];
                    if (lastCommit && lastCommit.message) {
                        const commitMsg = lastCommit.message.trim();
                        const validPrefixes = ['feat:', 'fix:', 'docs:', 'style:', 'refactor:', 'test:', 'chore:'];
                        const isValid = validPrefixes.some(p => commitMsg.startsWith(p)) && commitMsg.length > 10;

                        if (isValid && !achProCommit) {
                            achProCommit = true;
                            vscode.window.showInformationMessage(`АЧИВКА: "Мастер Conventional Commits"!`);
                            checkLegendStatus();
                            treeDataProvider.refresh();
                        }
                    }
                }
            });
        };

        gitApi.repositories.forEach((repo: any) => setupRepoListeners(repo));
        gitApi.onDidOpenRepository((repo: any) => setupRepoListeners(repo));
    }

    // --- ИНТЕРАКТИВНАЯ ПРОВЕРКА КОММИТА (КНОПКА) ---
    let commitCheckerCommand = vscode.commands.registerCommand('gitquest.checkCommit', async () => {
        const commitMessage = await vscode.window.showInputBox({
            placeHolder: 'Например: feat: добавлен модуль авторизации',
            prompt: 'Введите текст вашего коммита по стандарту Conventional Commits'
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

    let testAchievementsCommand = vscode.commands.registerCommand('gitquest.testAchievements', () => {
        achCleanCode = true;
        achProCommit = true;
        achRefactorMaster = true;
        achBranchMaster = true;
        achBugHunter = true;
        achReleaseReady = true;
        checkLegendStatus();
        treeDataProvider.refresh();
        vscode.window.showInformationMessage('ТЕСТ: Все ачивки принудительно разблокированы!');
    })

    let resetAchievementsCommand = vscode.commands.registerCommand('gitquest.resetAchievements', () => {
        achCleanCode = false;
        achProCommit = false;
        achRefactorMaster = false;
        achNightHacker = false;
        achBranchMaster = false;
        achBugHunter = false;
        achReleaseReady = false;
        achTopContributor = false;
        treeDataProvider.refresh();
        vscode.window.showInformationMessage('Все ачивки успешно сброшены!');
    });

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

    let helloCommand = vscode.commands.registerCommand('gitquest.helloWorld', () => {
        vscode.window.showInformationMessage('Hello, World! Ева');
    });

    let helloStatusBarItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Right, 100);
    helloStatusBarItem.command = 'gitquest.helloWorld';
    helloStatusBarItem.text = '$(smiley) Say Hello';
    helloStatusBarItem.tooltip = 'GitQuest: Поприветствовать';
    helloStatusBarItem.show();

    let timerStatusBarItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Right, 90);
    timerStatusBarItem.command = 'gitquest.resetTimer';
    timerStatusBarItem.tooltip = "Время кодинга за сессию. Кликните, чтобы сбросить.";
    timerStatusBarItem.show();

    let gitHelperStatusBar = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Right, 95);
    gitHelperStatusBar.command = 'gitquest.checkCommit';
    gitHelperStatusBar.text = `$(git-merge) Проверить коммит`;
    gitHelperStatusBar.tooltip = 'Кликните, чтобы проверить текст коммита';
    gitHelperStatusBar.show();

    function formatTime(totalSeconds: number): string {
        const mins = Math.floor(totalSeconds / 60);
        const secs = totalSeconds % 60;
        return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }

    interval = setInterval(() => {
        secondsCoded++;
        timerStatusBarItem.text = `$(watch) Время в коде: ${formatTime(secondsCoded)}`;
        
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

    function checkLegendStatus() {
        if (!achTopContributor && achCleanCode && achProCommit && achRefactorMaster && achBranchMaster && achBugHunter) {
            achTopContributor = true;
            vscode.window.showInformationMessage('ЭПИЧЕСКАЯ АЧИВКА: "Топ-контрибьютор" (Собраны все ключевые навыки инженера)!');
        }
    }

    context.subscriptions.push(
        helloCommand, 
        helloStatusBarItem,
        timerStatusBarItem,
        resetTimerCommand,
        togglePomodoroCommand,
        releaseCommand,
        commitCheckerCommand,
        testAchievementsCommand, 
        resetAchievementsCommand,
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