import * as vscode from 'vscode';

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

    context.subscriptions.push(helloCommand, helloStatusBarItem, checkFileCommand);
}

export function deactivate() {}