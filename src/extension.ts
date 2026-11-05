import * as vscode from 'vscode';

let secondsCoded = 0;
let pomodoroSeconds = 25 * 60;
let isPomodoroActive = false;
let interval: NodeJS.Timeout | undefined;

// RPG Состояние
let userXP = 150;
let userStreak = 1;

// Состояние ачивок
let achCleanCode = false;
let achProCommit = false;
let achRefactorMaster = false;
let achNightHacker = false;
let achBranchMaster = false;
let achBugHunter = false;
let achReleaseReady = false;
let achTopContributor = false;

// Провайдер для боковой панели с кликабельным Pomodoro и обратным отсчетом
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

        let rankName = "Script Kiddie 💻";
        let nextRankXP = 1000;
        if (userXP >= 4000) { rankName = "Git Archmage 🧙‍♂️"; nextRankXP = 6000; }
        else if (userXP >= 2000) { rankName = "Senior Wizard ⚡️"; nextRankXP = 4000; }
        else if (userXP >= 800) { rankName = "Middle Developer 🚀"; nextRankXP = 2000; }

        const levelItem = new vscode.TreeItem(`Ранг: ${rankName} (${userXP} XP)`, vscode.TreeItemCollapsibleState.None);
        levelItem.iconPath = new vscode.ThemeIcon('account', new vscode.ThemeColor('charts.purple'));
        items.push(levelItem);

        const timeItem = new vscode.TreeItem(`Время в коде: ${formattedTime}`, vscode.TreeItemCollapsibleState.None);
        timeItem.iconPath = new vscode.ThemeIcon('clock', new vscode.ThemeColor('charts.blue'));
        items.push(timeItem);

        // Интерактивный Pomodoro с обратным отсчетом
        const pomoMins = Math.floor(pomodoroSeconds / 60);
        const pomoSecs = pomodoroSeconds % 60;
        const pomoFormatted = `${pomoMins.toString().padStart(2, '0')}:${pomoSecs.toString().padStart(2, '0')}`;

        const pomoItem = new vscode.TreeItem(
            `Pomodoro: ${isPomodoroActive ? pomoFormatted : 'Выключен'}`, 
            vscode.TreeItemCollapsibleState.None
        );
        pomoItem.iconPath = new vscode.ThemeIcon('play-circle', new vscode.ThemeColor(isPomodoroActive ? 'charts.green' : 'charts.red'));
        pomoItem.command = {
            command: 'gitquest.togglePomodoro',
            title: 'Переключить Pomodoro'
        };
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
 
        items.push(createAchievementItem("Чистый код", achCleanCode));
        items.push(createAchievementItem("Охотник за багами", achBugHunter));
        items.push(createAchievementItem("Мастер Commits", achProCommit));
        items.push(createAchievementItem("Мастер ветвления", achBranchMaster));
        items.push(createAchievementItem("Рефактор-бог", achRefactorMaster));
        items.push(createAchievementItem("Релизный день", achReleaseReady));
        items.push(createAchievementItem("Ночной хакер", achNightHacker));
        items.push(createAchievementItem("[ЛЕГЕНДА] Топ-контрибьютор", achTopContributor));

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

    let diagnosticCollection = vscode.languages.createDiagnosticCollection('gitquest-scanner');
    context.subscriptions.push(diagnosticCollection);

    vscode.workspace.onDidSaveTextDocument((document: vscode.TextDocument) => {
        const text = document.getText();
        const lines = text.split('\n');

        diagnosticCollection.clear();

        if (!achCleanCode) {
            achCleanCode = true;
            userXP += 100;
            treeDataProvider.refresh();
            vscode.window.showInformationMessage('АЧИВКА: "Чистый код" (+100 XP)!');
        }

        if (lines.length >= 10 && !achBugHunter) {
            achBugHunter = true;
            userXP += 150;
            treeDataProvider.refresh();
            vscode.window.showInformationMessage('АЧИВКА: "Охотник за багами" (+150 XP)!');
        }

        if (lines.length >= 20 && !achRefactorMaster) {
            achRefactorMaster = true;
            userXP += 200;
            treeDataProvider.refresh();
            vscode.window.showInformationMessage('АЧИВКА: "Рефактор-бог" (+200 XP)!');
        }

        checkLegendStatus();
    });
    
    const extension = vscode.extensions.getExtension('vscode.git');
    if (extension) {
        const gitApi = extension.exports.getAPI(1);
        const setupRepoListeners = (repo: any) => {
            repo.state.onDidChange(() => {
                const head = repo.state.HEAD;
                if (head && head.name) {
                    if ((head.name.startsWith('feature/') || head.name.startsWith('bugfix/')) && !achBranchMaster) {
                        achBranchMaster = true;
                        userXP += 200;
                        treeDataProvider.refresh();
                        vscode.window.showInformationMessage(`АЧИВКА: "Мастер ветвления" (+200 XP)!`);
                        checkLegendStatus();
                    }
                }
            });
        };
        gitApi.repositories.forEach((repo: any) => setupRepoListeners(repo));
        gitApi.onDidOpenRepository((repo: any) => setupRepoListeners(repo));
    }

    // --- ИНТЕРАКТИВНЫЕ ЗАДАЧИ ---
    function openSpecificQuestPanel(questId: string, questTitle: string, rewardXP: number) {
        const panel = vscode.window.createWebviewPanel(
            `gitquest_${questId}`,
            `⚔️ Квест: ${questTitle}`,
            vscode.ViewColumn.Active,
            { enableScripts: true }
        );

        let initialCode = '';
        let taskDescription = '';

        if (questId === 'merge') {
            taskDescription = '<b>Задача:</b> Удалите маркеры конфликта (<code>&lt;&lt;&lt;</code>, <code>===</code>, <code>&gt;&gt;&gt;</code>) и соберите переменные <code>let a = 5;</code> и <code>let b = 10;</code>:';
            initialCode = `<<<<<<< HEAD\nlet a = 5;\n=======\nlet b = 10;\n>>>>>>> main`;
        } else if (questId === 'syntax') {
            taskDescription = '<b>Задача:</b> В коде ниже допущена опечатка в названии метода <code>retrn</code>. Исправьте её на правильное ключевое слово <code>return</code>:';
            initialCode = `function getStatus() {\n    retrn true;\n}`;
        } else if (questId === 'log') {
            taskDescription = '<b>Задача:</b> Введите команду Git для просмотра истории последних 3 коммитов в одну строку:';
            initialCode = `// Введите команду (например: git log ...):`;
        } else if (questId === 'stash') {
            taskDescription = '<b>Задача:</b> Введите команду Git, чтобы временно спрятать текущие несохраненные изменения:';
            initialCode = `// Введите команду:`;
        }

        panel.webview.html = `
            <!DOCTYPE html>
            <html lang="ru">
            <head>
                <meta charset="UTF-8">
                <style>
                    body { font-family: 'Segoe UI', Tahoma, sans-serif; padding: 25px; background-color: #1e1e2e; color: #cdd6f4; }
                    h2 { color: #f5e0dc; border-bottom: 2px solid #cba6f7; padding-bottom: 8px; }
                    .card { background: #313244; padding: 20px; border-radius: 10px; border-left: 5px solid #89b4fa; margin-bottom: 15px; }
                    textarea { width: 100%; height: 140px; background: #11111b; color: #a6e3a1; font-family: Consolas, monospace; font-size: 14px; padding: 12px; border: 1px solid #45475a; border-radius: 6px; resize: vertical; }
                    .btn { background: #cba6f7; color: #11111b; border: none; padding: 10px 18px; border-radius: 6px; cursor: pointer; font-weight: bold; margin-top: 15px; }
                    .btn:hover { background: #b4befe; }
                </style>
            </head>
            <body>
                <h2>⚔️ ${questTitle}</h2>
                <div class="card">
                    <p>${taskDescription}</p>
                    <textarea id="codeEditor">${initialCode}</textarea>
                    <br>
                    <button class="btn" onclick="submitSolution()">✅ Проверить решение (+${rewardXP} XP)</button>
                </div>
                <script>
                    const vscode = acquireVsCodeApi();
                    function submitSolution() {
                        const code = document.getElementById('codeEditor').value;
[05.11.2026 15:48] олеся ෆ𓂅: vscode.postMessage({ command: 'submitCode', code: code, xp: ${rewardXP}, questId: '${questId}' });
                    }
                </script>
            </body>
            </html>
        `;

        panel.webview.onDidReceiveMessage(message => {
            if (message.command === 'submitCode') {
                const code = message.code;
                let isValid = false;
                let errorMsg = "";

                if (message.questId === 'merge') {
                    if (!code.includes('<<<<<<<') && !code.includes('======') && !code.includes('>>>>>>>') && code.includes('let a') && code.includes('let b')) {
                        isValid = true;
                    } else {
                        errorMsg = "Ошибка! Уберите маркеры конфликта и оставьте обе переменные.";
                    }
                } else if (message.questId === 'syntax') {
                    if (code.includes('return true') && !code.includes('retrn')) {
                        isValid = true;
                    } else {
                        errorMsg = "Ошибка! Замените 'retrn' на правильное ключевое слово 'return'.";
                    }
                } else if (message.questId === 'log') {
                    if (code.includes('git log') && (code.includes('-n 3') || code.includes('-3') || code.includes('--oneline'))) {
                        isValid = true;
                    } else {
                        errorMsg = "Ошибка! Укажите вывод последних коммитов (например: git log -n 3 --oneline)";
                    }
                } else if (message.questId === 'stash') {
                    if (code.includes('git stash')) {
                        isValid = true;
                    } else {
                        errorMsg = "Ошибка! Нужна стандартная команда: git stash";
                    }
                }

                if (isValid) {
                    userXP += message.xp;
                    checkLegendStatus();
                    treeDataProvider.refresh();
                    vscode.window.showInformationMessage(`🎉 Отлично! Задание пройдено. Получено +${message.xp} XP! Всего: ${userXP} XP`);
                    panel.dispose();
                } else {
                    vscode.window.showErrorMessage(errorMsg);
                }
            }
        });
    }

    // --- ЦЕНТР КВЕСТОВ И ПРОФИЛЬ (ХАБ) ---
    let openQuestsHubCommand = vscode.commands.registerCommand('gitquest.openQuestsHub', () => {
        const panel = vscode.window.createWebviewPanel(
            'gitquestHub',
            '⚔️ GitQuest: Центр Квестов и Профиль',
            vscode.ViewColumn.One,
            { enableScripts: true }
        );

        let rankName = "Script Kiddie 💻";
        let nextRankXP = 1000;
        if (userXP >= 4000) { rankName = "Git Archmage 🧙‍♂️"; nextRankXP = 6000; }
        else if (userXP >= 2000) { rankName = "Senior Wizard ⚡️"; nextRankXP = 4000; }
        else if (userXP >= 800) { rankName = "Middle Developer 🚀"; nextRankXP = 2000; }

        const progressPercent = Math.min(100, Math.floor((userXP / nextRankXP) * 100));
        panel.webview.html = `
            <!DOCTYPE html>
            <html lang="ru">
            <head>
                <meta charset="UTF-8">
                <style>
                    body { font-family: 'Segoe UI', Tahoma, sans-serif; padding: 30px; background-color: #1e1e2e; color: #cdd6f4; margin: 0; }
                    h1, h2 { color: #f5e0dc; border-bottom: 2px solid #cba6f7; padding-bottom: 10px; }
                    .profile-card { background: #313244; border-radius: 12px; padding: 20px; margin-bottom: 30px; border: 1px solid #45475a; display: flex; justify-content: space-between; align-items: center; }
                    .profile-info h3 { margin: 0 0 5px 0; color: #cba6f7; font-size: 20px; }
                    .profile-info p { margin: 0; color: #a6adc8; font-size: 14px; }
                    .progress-bar-container { background: #11111b; border-radius: 10px; height: 12px; width: 250px; margin-top: 8px; overflow: hidden; border: 1px solid #45475a; }
                    .progress-bar { background: #a6e3a1; height: 100%; width: ${progressPercent}%; }
                    .achievements-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 12px; margin-bottom: 30px; }
                    .ach-item { background: #252538; padding: 12px; border-radius: 8px; font-size: 13px; border: 1px solid #313244; display: flex; align-items: center; gap: 10px; }
                    .unlocked { border-color: #a6e3a1; color: #a6e3a1; background: rgba(166, 227, 161, 0.1); }
                    .locked { color: #6c7086; }
                    .grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(240px, 1fr)); gap: 20px; }
                    .quest-card { background: #313244; border-radius: 12px; padding: 20px; cursor: pointer; transition: all 0.2s ease; border: 1px solid #45475a; box-shadow: 0 4px 12px rgba(0,0,0,0.3); display: flex; flex-direction: column; justify-content: space-between; }
                    .quest-card:hover { background: #45475a; transform: translateY(-3px); border-color: #cba6f7; }
                    .quest-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px; }
                    .icon { font-size: 24px; }
                    .reward { background: rgba(203, 166, 247, 0.15); color: #cba6f7; padding: 4px 10px; border-radius: 20px; font-size: 12px; font-weight: bold; }
                    .title { font-size: 16px; font-weight: bold; margin-bottom: 8px; color: #f5e0dc; }
                    .desc { font-size: 13px; color: #a6adc8; line-height: 1.4; }
                </style>
            </head>
            <body>
                <h1>⚔️ Центр боевых испытаний GitQuest</h1>
                
                <div class="profile-card">
                    <div class="profile-info">
                        <h3>🧙‍♂️ Ранг: ${rankName}</h3>
                        <p>Очки опыта: <b>${userXP} XP</b> / Цель: ${nextRankXP} XP</p>
                        <div class="progress-bar-container">
                            <div class="progress-bar"></div>
                        </div>
                    </div>
                    <div>
                        <p style="text-align: right; margin: 0; color: #fab387;">🔥 Стрик: ${userStreak} дн.</p>
                    </div>
                </div>
[05.11.2026 15:48] олеся ෆ𓂅: <h2>🏆 Ваши достижения</h2>
                <div class="achievements-grid">
                    <div class="ach-item ${achCleanCode ? 'unlocked' : 'locked'}">${achCleanCode ? '✅' : '🔒'} Чистый код</div>
                    <div class="ach-item ${achBugHunter ? 'unlocked' : 'locked'}">${achBugHunter ? '✅' : '🔒'} Охотник за багами</div>
                    <div class="ach-item ${achProCommit ? 'unlocked' : 'locked'}">${achProCommit ? '✅' : '🔒'} Мастер Commits</div>
                    <div class="ach-item ${achBranchMaster ? 'unlocked' : 'locked'}">${achBranchMaster ? '✅' : '🔒'} Мастер ветвления</div>
                    <div class="ach-item ${achRefactorMaster ? 'unlocked' : 'locked'}">${achRefactorMaster ? '✅' : '🔒'} Рефактор-бог</div>
                    <div class="ach-item ${achReleaseReady ? 'unlocked' : 'locked'}">${achReleaseReady ? '✅' : '🔒'} Релизный день</div>
                    <div class="ach-item ${achNightHacker ? 'unlocked' : 'locked'}">${achNightHacker ? '✅' : '🔒'} Ночной хакер</div>
                    <div class="ach-item ${achTopContributor ? 'unlocked' : 'locked'}">${achTopContributor ? '✅' : '🔒'} Топ-контрибьютор</div>
                </div>

                <h2>🎯 Квесты и задачи</h2>
                <div class="grid">
                    <div class="quest-card" onclick="openQuest('merge', 'Двойной Конфликт', 400)">
                        <div>
                            <div class="quest-header"><span class="icon">💥</span><span class="reward">+400 XP</span></div>
                            <div class="title">Двойной Конфликт</div>
                            <div class="desc">Соберите две переменные после слияния.</div>
                        </div>
                    </div>

                    <div class="quest-card" onclick="openQuest('syntax', 'Исправление Опечатки', 350)">
                        <div>
                            <div class="quest-header"><span class="icon">🔧</span><span class="reward">+350 XP</span></div>
                            <div class="title">Исправление Опечатки</div>
                            <div class="desc">Исправьте retrn на return в функции.</div>
                        </div>
                    </div>

                    <div class="quest-card" onclick="openQuest('log', 'История Коммитов', 300)">
                        <div>
                            <div class="quest-header"><span class="icon">📜</span><span class="reward">+300 XP</span></div>
                            <div class="title">История Коммитов</div>
                            <div class="desc">Напишите продвинутый git log с лимитом.</div>
                        </div>
                    </div>

                    <div class="quest-card" onclick="openQuest('stash', 'Временный Стэш', 300)">
                        <div>
                            <div class="quest-header"><span class="icon">📦</span><span class="reward">+300 XP</span></div>
                            <div class="title">Временный Стэш</div>
                            <div class="desc">Спрячьте изменения командой git stash.</div>
                        </div>
                    </div>
                </div>

                <script>
                    const vscode = acquireVsCodeApi();
                    function openQuest(id, title, xp) {
                        vscode.postMessage({ command: 'openSpecificQuest', id: id, title: title, xp: xp });
                    }
                </script>
            </body>
            </html>
        `;

        panel.webview.onDidReceiveMessage(message => {
            if (message.command === 'openSpecificQuest') {
                openSpecificQuestPanel(message.id, message.title, message.xp);
            }
        });
    });

    let commitCheckerCommand = vscode.commands.registerCommand('gitquest.checkCommit', async () => {
        const commitMessage = await vscode.window.showInputBox({
            placeHolder: 'Например: исправил ошибку входа',
            prompt: 'Введите текст вашего коммита (описание от 5 символов)'
        });

        if (!commitMessage) return;

        if (commitMessage.trim().length >= 5) {
            vscode.window.showInformationMessage(`Коммит принят! Отличная работа.`);
            if (!achProCommit) {
                achProCommit = true;
                userXP += 150;
                vscode.window.showInformationMessage('АЧИВКА: "Мастер Commits" (+150 XP)!');
                checkLegendStatus();
                treeDataProvider.refresh();
            }
        } else {
            vscode.window.showErrorMessage(`Слишком короткое описание! Напишите хотя бы 5 символов.`);
        }
    });

    let helloCommand = vscode.commands.registerCommand('gitquest.helloWorld', () => {
        vscode.window.showInformationMessage('Hello, World! Ева');
    });

    let checkFileCommand = vscode.commands.registerCommand('gitquest.checkFile', () => {
        vscode.window.showInformationMessage('GitQuest: Файл успешно проверен!');
    });

    let testAchievementsCommand = vscode.commands.registerCommand('gitquest.testAchievements', () => {
        achCleanCode = true;
        achProCommit = true;
        achRefactorMaster = true;
        achBranchMaster = true;
        achBugHunter = true;
        achReleaseReady = true;
        userXP += 1000;
        checkLegendStatus();
        treeDataProvider.refresh();
        vscode.window.showInformationMessage('ТЕСТ: Ачивки и XP разблокированы!');
    });

    let resetAchievementsCommand = vscode.commands.registerCommand('gitquest.resetAchievements', () => {
        achCleanCode = false;
        achProCommit = false;
        achRefactorMaster = false;
        achNightHacker = false;
        achBranchMaster = false;
        achBugHunter = false;
        achReleaseReady = false;
        achTopContributor = false;
        userXP = 150;
        treeDataProvider.refresh();
        vscode.window.showInformationMessage('Ачивки и XP сброшены!');
    });

    let releaseCommand = vscode.commands.registerCommand('gitquest.checkRelease', () => {
        if (achCleanCode && achProCommit) {
            achReleaseReady = true;
            userXP += 300;
            treeDataProvider.refresh();
            vscode.window.showInformationMessage('АЧИВКА: "Релизный день" (+300 XP)!');
            checkLegendStatus();
        } else {
            vscode.window.showWarningMessage('Релиз заблокирован! Нужны ачивки "Чистый код" и "Мастер Commits".');
        }
    });

    let helloStatusBarItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Right, 100);
    helloStatusBarItem.command = 'gitquest.helloWorld';
    helloStatusBarItem.text = '$(smiley) Say Hello';
    helloStatusBarItem.tooltip = 'GitQuest: Поприветствовать';
    helloStatusBarItem.show();

    let questStatusBarBtn = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Right, 98);
    questStatusBarBtn.command = 'gitquest.openQuestsHub';
    questStatusBarBtn.text = `$(swords) Квесты`;
    questStatusBarBtn.tooltip = 'Открыть центр боевых испытаний и профиль';
    questStatusBarBtn.show();

    let gitHelperStatusBar = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Right, 95);
    gitHelperStatusBar.command = 'gitquest.checkCommit';
    gitHelperStatusBar.text = `$(git-merge) Проверить коммит`;
    gitHelperStatusBar.tooltip = 'Кликните, чтобы проверить текст коммита';
    gitHelperStatusBar.show();

    let timerStatusBarItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Right, 90);
    timerStatusBarItem.command = 'gitquest.resetTimer';
    timerStatusBarItem.tooltip = "Время кодинга за сессию. Кликните, чтобы сбросить.";
    timerStatusBarItem.show();

    let formatTime = (totalSeconds: number) => {
        const mins = Math.floor(totalSeconds / 60);
        const secs = totalSeconds % 60;
        return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    };
    
    interval = setInterval(() => {
        secondsCoded++;
        timerStatusBarItem.text = `$(watch) Время в коде: ${formatTime(secondsCoded)}`;
        
        if (isPomodoroActive) {
            pomodoroSeconds--;
            if (pomodoroSeconds <= 0) {
                vscode.window.showWarningMessage('Перерыв! Вы отлично поработали 25 минут. Отдохните 5 минут!', 'Понятно');
                pomodoroSeconds = 25 * 60;
                isPomodoroActive = false;
            }
        }
        treeDataProvider.refresh();
    }, 1000);

    let resetTimerCommand = vscode.commands.registerCommand('gitquest.resetTimer', () => {
        secondsCoded = 0;
        treeDataProvider.refresh();
        vscode.window.showInformationMessage('Таймер сброшен!');
    });

    let togglePomodoroCommand = vscode.commands.registerCommand('gitquest.togglePomodoro', () => {
        isPomodoroActive = !isPomodoroActive;
        treeDataProvider.refresh();
        vscode.window.showInformationMessage(`Таймер отдыха Pomodoro ${isPomodoroActive ? 'включен' : 'выключен'}.`);
    });

    function checkLegendStatus() {
        if (!achTopContributor && achCleanCode && achProCommit && achRefactorMaster && achBranchMaster && achBugHunter) {
            achTopContributor = true;
            userXP += 500;
            treeDataProvider.refresh();
            vscode.window.showInformationMessage('ЭПИЧЕСКАЯ АЧИВКА: "Топ-контрибьютор" (+500 XP)!');
        }
    }

    context.subscriptions.push(
        helloCommand, checkFileCommand, helloStatusBarItem, questStatusBarBtn,
        gitHelperStatusBar, timerStatusBarItem, resetTimerCommand, togglePomodoroCommand,
        releaseCommand, commitCheckerCommand, testAchievementsCommand, resetAchievementsCommand,
        { dispose: () => { if (interval) clearInterval(interval); } }
    );
}

export function deactivate() {}