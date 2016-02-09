// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT license. See LICENSE file in the project root for details.

import {FileSystem} from "./utils/node/fileSystem";
import * as path from "path";
import * as vscode from "vscode";
import {ReactNativeCommandExecutor} from "./utils/reactNativeCommandExecutor";
import {ReactNativeProjectHelper} from "./utils/reactNativeProjectHelper";
import {ReactDirManager} from "./utils/reactDirManager";
import {TsConfigHelper} from "./utils/tsconfigHelper";

export function activate(context: vscode.ExtensionContext): void {
    let reactNativeProjectHelper = new ReactNativeProjectHelper(vscode.workspace.rootPath);
    reactNativeProjectHelper.isReactNativeProject().then(isRNProject => {
        if (isRNProject) {
            setupReactNativeDebugger();
            setupReactNativeIntellisense();
            context.subscriptions.push(new ReactDirManager());
        }
    });

    let reactNativeCommandExecutor = new ReactNativeCommandExecutor(vscode.workspace.rootPath);

    // Register React Native commands
    context.subscriptions.push(vscode.commands.registerCommand("reactNative.runAndroid",
        () => reactNativeCommandExecutor.runAndroid()));
    context.subscriptions.push(vscode.commands.registerCommand("reactNative.runIos",
        () => reactNativeCommandExecutor.runIos()));
    context.subscriptions.push(vscode.commands.registerCommand("reactNative.startPackager",
        () => reactNativeCommandExecutor.startPackager()));
    context.subscriptions.push(vscode.commands.registerCommand("reactNative.stopPackager",
        () => reactNativeCommandExecutor.stopPackager()));
}

/**
 * Sets up the debugger for the React Native project by dropping
 * the debugger stub into the workspace
 */
function setupReactNativeDebugger(): void {
    let launcherPath = require.resolve("./debugger/launcher");
    let pkg = require("../package.json");
    const extensionVersionNumber = pkg.version;
    const extensionName = pkg.name;

    let debuggerEntryCode =
`// This file is automatically generated by ${extensionName}@${extensionVersionNumber}
try {
    var path = require("path");
    var Launcher = require(${JSON.stringify(launcherPath)}).Launcher;
    new Launcher(path.resolve(__dirname, "..")).launch();
} catch (e) {
    throw new Error("Unable to launch application. Try deleting .vscode/launchReactNative.js and restarting vscode.");
}`;

    let vscodeFolder = path.join(vscode.workspace.rootPath, ".vscode");
    let debugStub = path.join(vscodeFolder, "launchReactNative.js");
    let fsUtil = new FileSystem();

    fsUtil.ensureDirectory(vscodeFolder).then(() => {
        fsUtil.ensureFileWithContents(debugStub, debuggerEntryCode);
    }).catch((err: Error) => {
        vscode.window.showErrorMessage(err.message);
    });
}

function setupReactNativeIntellisense(): void {
    if (!process.env.VSCODE_TSJS) {
        return;
    }

    // Enable JavaScript intellisense through Salsa language service
    TsConfigHelper.compileJavaScript(true).done();

    let reactTypingsSource = path.resolve(__dirname, "..", "ReactTypings");
    let reactTypingsDest = path.resolve(vscode.workspace.rootPath, ".vscode", "typings");
    let fileSystem = new FileSystem();

    fileSystem.copyRecursive(reactTypingsSource, reactTypingsDest);
}
