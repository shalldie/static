// pnpm --filter @nosaid/cli -r run execute -- summary.ts

import fs from 'fs';
import path from 'path';
import { glob } from 'glob';
import { markdownToTxt } from 'markdown-to-txt';

const LENGTH_LIMIT = 200;

const ROOT_DIR = path.join(__dirname, '../../');
const ARTICLE_DIR = path.join(ROOT_DIR, 'blog/markdown/article');

class Summary {
    public async run() {
        const mds = await this.getMDs();

        for (const mdPath of mds) {
            const md = await fs.promises.readFile(mdPath, 'utf-8');
            const summary = markdownToTxt(md)
                .replace(/^.*?\n/, '') // 去掉第一行标题
                .trim()
                .slice(0, LENGTH_LIMIT);
            const summaryPath = path.join(path.dirname(mdPath), 'summary.txt');
            await fs.promises.writeFile(summaryPath, summary, 'utf-8');
        }
    }

    private async getMDs() {
        const targetPathArr = await glob('**/*.article.json', {
            dot: true,
            cwd: ARTICLE_DIR
        });

        return targetPathArr.map(targetPath => {
            const configPath = path.join(ARTICLE_DIR, targetPath);
            const dir = path.dirname(configPath);
            return path.join(dir, 'index.md');
        });
    }
}

new Summary().run();
