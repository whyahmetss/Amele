import axios from 'axios';
import { config } from '../config';
import { logger } from '../utils/logger';

export async function issueOlustur(baslik: string, govde: string, labels?: string[]): Promise<{ url?: string; hata?: string }> {
  if (!config.github.token || !config.github.repo) {
    return { hata: 'GitHub token veya repo tanımlı değil.' };
  }

  const [owner, repo] = config.github.repo.split('/').filter(Boolean);
  if (!owner || !repo) {
    return { hata: 'GITHUB_REPO formatı: owner/repo olmalı.' };
  }

  try {
    const { data } = await axios.post(
      `https://api.github.com/repos/${owner}/${repo}/issues`,
      {
        title: baslik,
        body: govde,
        labels: labels || [],
      },
      {
        headers: {
          Authorization: `Bearer ${config.github.token}`,
          Accept: 'application/vnd.github+json',
          'X-GitHub-Api-Version': '2022-11-28',
        },
        timeout: 10000,
      }
    );
    return { url: data.html_url };
  } catch (hata: any) {
    const mesaj = hata?.response?.data?.message || hata.message;
    logger.error('GitHub issue hatası:', mesaj);
    return { hata: mesaj };
  }
}
