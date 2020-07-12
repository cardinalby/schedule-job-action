import { ActionOutput, ActionTrOutput } from 'github-actions-utils';

export const actionOutputs = {
    targetYmlFileName: new ActionOutput('targetYmlFile'),
    targetYmlFilePath: new ActionOutput('targetYmlFilePath')
}