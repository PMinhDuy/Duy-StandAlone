import { join } from 'path';
import * as prettier from 'prettier';
import { traverseTranslations } from './traverseTranslations';
import minimist from 'minimist';
import inquirer, { QuestionCollection } from 'inquirer';
import chalk from 'chalk';
import path from 'path';
import * as fs from 'fs';

const LIST_MODULES = ['features/users', 'features/posts', 'shared'];

const joinPath: typeof path.join = (...args) =>
  path
    .join(...args)
    .split(path.sep)
    .join('/');

async function getConfig() {
  const args = minimist(process.argv.slice(2));
  const questions: QuestionCollection[] = [];
  const moduleChoices = ['all'].concat(LIST_MODULES);
  const file = args?.file as string | undefined;
  let config: { module: string; file?: string } = {
    module: args?.module,
    file,
  };

  if (!config.module) {
    questions.push({
      type: 'list',
      message: 'Please choose module to generate:',
      name: 'module',
      choices: moduleChoices,
      default: 'all',
    });
  }

  if (!config.file) {
    questions.push({
      type: 'input',
      message: 'Please enter locale json file to generate:',
      name: 'file',
    });
  }

  if (questions.length) {
    const answers = await inquirer.prompt(questions);
    config = { ...config, ...answers };
  }

  if (!moduleChoices.includes(config.module) || !config.file) {
    throw Error(`Config is not valid ${JSON.stringify(config)}`);
  }

  return config as {
    module: string;
    file: string;
  };
}

async function generateKeys(module: string, file: string) {
  if (!file.endsWith('.json')) {
    throw new Error('File must be JSON file!');
  }

  console.log(
    chalk.blue(
      '=====> Generating translation keys for module ' +
        chalk.blue.bold(module),
    ),
  );

  const rootPath = joinPath('lib', module);
  const localeFilePath = joinPath(rootPath, 'src/configs', 'locales', file);

  if (!fs.existsSync(localeFilePath)) {
    throw new Error('Locale file not found!');
  }

  const generatedTranslationKeysFilePath = joinPath(
    rootPath,
    'src/generated/translationKeys.ts',
  );

  const localeJSONFile = await import(`../${localeFilePath}`);

  console.log(chalk.blue('=====> .................'));
  console.log(chalk.blue('=====> .................'));
  console.log(chalk.blue('=====> .................'));

  const s = `
    // This is autogenerated by running \`pnpm run gen-translation-keys\`
    export type TranslationKeys =
    ${traverseTranslations(localeJSONFile.default)
      .map(k => `  "${k}"`)
      .join('|\n')}
    `;

  fs.writeFileSync(
    join(__dirname, `../${generatedTranslationKeysFilePath}`),
    prettier.format(s, {
      parser: 'babel',
      singleQuote: true,
    }),
  );

  console.log(
    chalk.green('=====> Successfully generated translation keys to ') +
      chalk.bold.green(generatedTranslationKeysFilePath),
  );
}

(async () => {
  const config = await getConfig();

  const modules = config.module === 'all' ? LIST_MODULES : [config.module];
  for (const module of modules) {
    await generateKeys(module, config.file);
  }
})();
