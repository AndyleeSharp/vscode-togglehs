'use strict';
import * as vscode from 'vscode';
import * as path from 'path';
var fileExists = require('file-exists');

const headerExts = [ '.h', '.hpp', '.hh', '.hxx' ];
const sourceExts = [ '.c', '.cpp', '.cc', '.cxx', '.m', '.mm' ];

// Generates appropriate variants for the predefined extensions arrays.
function allExts(exts:string[]) {
  return exts.concat(exts.map((ext) => { return ext.toUpperCase(); }));
}

// Test whether a given file has an extension included in the given array.
function testExtension(fileName:string, exts:string[]) {
  var found = allExts(exts).find((ext) => { return ext === path.extname(fileName); });
  return undefined != found;
}

// Finds a file matching an extension included in the given array.
function findFile(baseName:string, exts:string[]) {
  console.log(baseName);
  return allExts(exts).map((ext) => { return baseName + ext; })
    .find((fileName) => { return fileExists(fileName); });
}

// Try to toggle current vscode file from a given set of extensions to another.
function tryToggle(file:vscode.Uri, from:string[], to:string[]) {
  return new Promise<boolean>((accept, reject) => {
    if (file.scheme !== 'file') {
      reject('Unsupported file scheme.');
    }
    var fileStr = file.fsPath;
    if (!testExtension(fileStr, from)) {
      accept(false);
    }
    var baseName = fileStr.substr(0, fileStr.lastIndexOf('.'));
    var ext = path.extname(fileStr);
    var found = findFile(baseName, to);
    if(!found){
      if(testExtension(fileStr, headerExts))
      {
        //头文件
        var dir = path.dirname(fileStr);
        var newFileStr = path.join(dir,"../src",path.basename(baseName));       
        found = findFile(newFileStr, sourceExts);      


      }else if(testExtension(fileStr, sourceExts)){
        //源文件
        var dir = path.dirname(fileStr);
        var newFileStr = path.join(dir,"../h",path.basename(baseName));   
        found = findFile(newFileStr, headerExts);     
      }
    }
    if (found) {
      vscode.workspace.openTextDocument(found).then(
        (doc) => {
          var column = vscode.window.activeTextEditor.viewColumn;
          vscode.window.showTextDocument(doc, column).then(() => { accept(true); }, reject);
        }, reject
      );
    } else {
      reject('Cannot find corresponding file.');
    }
  });
}

// Activates the extension.
// Unfortunately, we cannot (yet) make the toggle command only displaying when a file with a matching extension is opened.
export function activate(context: vscode.ExtensionContext) {
  let disposable = vscode.commands.registerTextEditorCommand('yytogglehs.toggleHS', (textEditor, edit) => {
    var currentFile = vscode.window.activeTextEditor.document.uri;
    console.log(currentFile);
    tryToggle(currentFile, headerExts, sourceExts).then((ok) => {
      if (!ok) {
        tryToggle(currentFile, sourceExts, headerExts).then((ok) => {
          if (!ok) {
            vscode.window.showErrorMessage('Cannot find corresponding file.');
          }
        }).catch((reason) => {
          vscode.window.showErrorMessage(reason);
        });
      }
    }).catch((reason) => {
      vscode.window.showErrorMessage(reason);
    });
  });

  context.subscriptions.push(disposable);
}

export function deactivate() {
}
