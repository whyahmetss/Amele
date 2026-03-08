"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.issueOlustur = issueOlustur;
const axios_1 = __importDefault(require("axios"));
const config_1 = require("../config");
const logger_1 = require("../utils/logger");
async function issueOlustur(baslik, govde, labels) {
    if (!config_1.config.github.token || !config_1.config.github.repo) {
        return { hata: 'GitHub token veya repo tanımlı değil.' };
    }
    const [owner, repo] = config_1.config.github.repo.split('/').filter(Boolean);
    if (!owner || !repo) {
        return { hata: 'GITHUB_REPO formatı: owner/repo olmalı.' };
    }
    try {
        const { data } = await axios_1.default.post(`https://api.github.com/repos/${owner}/${repo}/issues`, {
            title: baslik,
            body: govde,
            labels: labels || [],
        }, {
            headers: {
                Authorization: `Bearer ${config_1.config.github.token}`,
                Accept: 'application/vnd.github+json',
                'X-GitHub-Api-Version': '2022-11-28',
            },
            timeout: 10000,
        });
        return { url: data.html_url };
    }
    catch (hata) {
        const mesaj = hata?.response?.data?.message || hata.message;
        logger_1.logger.error('GitHub issue hatası:', mesaj);
        return { hata: mesaj };
    }
}
//# sourceMappingURL=githubService.js.map