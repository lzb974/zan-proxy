"use strict";

/**
 * 初始化脚本
 * @param force
 * @returns {Promise.<void>}
 * 
 */
let resetData = (() => {
    var _ref = _asyncToGenerator(function* (force = false) {

        yield createDir(proxyDataDir);
        yield createDir(path.join(proxyDataDir, "certificate"));
        yield createDir(path.join(proxyDataDir, "certificate/root"));
        yield createDir(path.join(proxyDataDir, "host"));
        yield createDir(path.join(proxyDataDir, "rule"));
        yield createDir(path.join(proxyDataDir, "breakpoint"));
        yield createDir(path.join(proxyDataDir, "mock-data"));
        yield createDir(path.join(proxyDataDir, "mock-list"));
        yield createDir(path.join(proxyDataDir, "profile"));
        yield createDir(path.join(proxyDataDir, "filter"));
        yield createDir(path.join(proxyDataDir, "traffic"));

        yield resetFile(path.join(proxyDataDir, "clientIpUserMap.json"), {}, force);
        yield resetFile(path.join(proxyDataDir, "configure.json"), {}, force);
        const rootTargetDir = path.join(proxyDataDir, "certificate/root");
        ['zproxy.crt.pem', 'zproxy.key.pem'].forEach(function (f) {
            fs.createReadStream(path.join(__dirname, 'certificate', f)).pipe(fs.createWriteStream(path.join(rootTargetDir, f)));
        });
    });

    return function resetData() {
        return _ref.apply(this, arguments);
    };
})();

let resetFile = (() => {
    var _ref2 = _asyncToGenerator(function* (path, data, force) {
        if (force) {
            yield fileUtils.writeJsonToFile(path, data);
        } else {
            let exists = yield fileUtils.exists(path);
            if (!exists) {
                yield fileUtils.writeJsonToFile(path, data);
            }
        }
    });

    return function resetFile(_x, _x2, _x3) {
        return _ref2.apply(this, arguments);
    };
})();

let createDir = (() => {
    var _ref3 = _asyncToGenerator(function* (path) {
        let exists = yield fileUtils.exists(path);
        if (!exists) {
            yield fileUtils.makeDir(path);
        }
    });

    return function createDir(_x4) {
        return _ref3.apply(this, arguments);
    };
})();

function _asyncToGenerator(fn) { return function () { var gen = fn.apply(this, arguments); return new Promise(function (resolve, reject) { function step(key, arg) { try { var info = gen[key](arg); var value = info.value; } catch (error) { reject(error); return; } if (info.done) { resolve(value); } else { return Promise.resolve(value).then(function (value) { step("next", value); }, function (err) { step("throw", err); }); } } return step("next"); }); }; }

const fileUtils = require("./dist/src_old/core/utils/file");
const AppInfoService = require("./dist/src_old/impl/file/appInfoService");
const path = require("path");
const fs = require("fs");

const appInfoService = new AppInfoService();
const proxyDataDir = appInfoService.getProxyDataDir();

const oldDir = path.join(appInfoService.getProxyDataDir(), '../.zanmock-proxy');

function restoreFromOld() {
    if (!fs.existsSync(oldDir)) {
        return;
    }
    restoreHost();
    restoreRule();
    restoreProfile();
}

function restoreHost() {
    const oldHostDir = path.join(oldDir, 'local/host');
    const newHostDir = path.join(proxyDataDir, 'host');
    const oldHostFiles = fs.readdirSync(oldHostDir).filter(f => f.endsWith('.json'));
    oldHostFiles.forEach(fileName => {
        const newFilePath = path.join(newHostDir, `root_${fileName}`);
        if (fs.existsSync(newFilePath)) {
            return;
        }
        const readStream = fs.createReadStream(path.join(oldHostDir, fileName));
        const writeStream = fs.createWriteStream(newFilePath);
        readStream.pipe(writeStream);
    });
}

function restoreRule() {
    const oldRuleDir = path.join(oldDir, 'local/rule');
    const newRuleDir = path.join(proxyDataDir, 'rule');
    const oldRuleFiles = fs.readdirSync(oldRuleDir).filter(f => f.endsWith('.json'));
    oldRuleFiles.forEach(ruleFile => {
        const newRuleFilePath = path.join(newRuleDir, `root_${ruleFile}`);
        if (fs.existsSync(newRuleFilePath)) {
            return;
        }
        const fileContent = fs.readFileSync(path.join(oldRuleDir, ruleFile), { encoding: 'utf-8' });
        const oldRuleFile = JSON.parse(fileContent);
        const newRuleFile = convertRuleFile(oldRuleFile);
        fs.writeFileSync(newRuleFilePath, JSON.stringify(newRuleFile), { encoding: 'utf-8' });
    });
}

function convertRuleFile(oldRuleFile) {
    const newRuleFile = Object.assign({}, oldRuleFile);
    newRuleFile.content = newRuleFile.content.filter(rule => {
        return rule.action.type === 'redirect'; // 其他action暂时不支持
    }).map(convertRule);
    return newRuleFile;
}

function convertRule(oldRule) {
    const newRule = Object.assign({}, oldRule);
    newRule.actionList = [convertAction(oldRule.action)];
    return newRule;
}

function convertAction(oldAction) {
    const newAction = Object.assign({}, oldAction);
    newAction.data = Object.assign({}, {
        "target": "",
        "dataId": "",
        "modifyResponseType": "",
        "callbackName": "",
        "cookieKey": "",
        "cookieValue": "",
        "headerKey": "",
        "headerValue": "",
        "modifyRequestScript": "",
        "modifyResponseScript": ""
    }, oldAction.data);
    return newAction;
}

function restoreProfile() {
    const oldFile = path.join(oldDir, 'local/conf.json');
    if (!fs.existsSync(oldFile)) {
        return;
    }
    const oldConf = JSON.parse(fs.readFileSync(oldFile, { encoding: 'utf-8' }));
    const newConf = {
        enableRule: true,
        enableHost: true,
        enableFilter: false,
        projectPath: oldConf.responderParams || {}
    };
    const newFile = path.join(proxyDataDir, 'profile/root.json');
    if (fs.existsSync(newFile)) {
        return;
    }
    fs.writeFileSync(newFile, JSON.stringify(newConf), { encoding: 'utf-8' });
}

_asyncToGenerator(function* () {
    yield resetData();
    restoreFromOld();
})();