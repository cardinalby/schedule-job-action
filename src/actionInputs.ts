import { actionInputs as inputs } from 'github-actions-utils';

export const actionInputs = {
    ghToken: inputs.getString('ghToken', true, true),
    templateYmlFile: inputs.getWsPath('templateYmlFile', true),
    overrideTargetFile: inputs.getBool('overrideTargetFile', true),
    targetYmlFileName: inputs.getString('targetYmlFileName', false),
    targetBranch: inputs.getString('targetBranch', true),
    addTag: inputs.getString('addTag', false)
}