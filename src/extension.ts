import * as vscode from 'vscode';

let secondsCoded = 0;
let pomodoroSeconds = 25*60;
let isPomodoroActive = false;
let interval: NodeJS.Timeout | undefined;

export function activate(context: vscode.ExtensionContext) {
    console.log('GitQuest успешно активирован!');

   
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

    interval = setInterval(() => {
        secondsCoded++;
        timerStatusBarItem.text = `$(watch) Время в коде: ${formatTime(secondsCoded)}`;
        
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
        vscode.window.showInformationMessage('Таймер сброшен!');
    });

    let togglePomodoroCommand = vscode.commands.registerCommand('gitquest.togglePomodoro', () => {
        isPomodoroActive = !isPomodoroActive;
        const status = isPomodoroActive ? 'включен (25 мин)' : 'выключен';
        vscode.window.showInformationMessage(`Таймер отдыха Pomodoro ${status}.`);
    });

     context.subscriptions.push(
        helloCommand, 
        helloStatusBarItem,
        checkFileCommand,
        timerStatusBarItem,
        resetTimerCommand,
        togglePomodoroCommand,
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