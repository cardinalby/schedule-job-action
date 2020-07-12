![Build Status](https://github.com/cardinalby/schedule-job-action/workflows/build-test/badge.svg)

# Schedule delayed GitHub Actions job 

## Inputs

Specify 1 input from the list to search release by:

* `templateYmlFile` **Required**<br>
Path (relative to the repository) to template scheduled workflow yml file.

* `overrideTargetFile` Default: `true`<br>
Override yml file if exists. If `false` and file exists, action will fail.

* `targetYmlFileName` Default: `templateYmlFile`'s name + sha/tag + `.yml`<br>
Target yml file name in `.github/workflows` folder

* `targetBranch` Default: `master`<br>
Branch to push. Please note, scheduled jobs work only in the default branch.

* `pushForce` Default: `true`<br>
Perform `git push` with `--force` flag

* `addTag`<br>
Specify a tag to schedule job for. Will be used as a ref in the checkout step instead of commit sha.

* `gitUserEmail` Default: `action@github.com`<br>
Make commit using specified user.email

* `gitUserName` Default: `GitHub Action`<br>
Make commit using specified user.name

* `envNewYmlFilePathVariable` Default: `DELAYED_JOB_WORKFLOW_FILE_PATH`<br>
Name of variable containing new yml file path

* `envRefVariable` Default: `DELAYED_JOB_CHECKOUT_REF`<br>
Name of variable containing ref (sha or tag) to add to env section of the job

* `envRefIsTagVariable` Default: `DELAYED_JOB_CHECKOUT_REF_IS_TAG`<br>
Name of variable containing `true` if ref is tag to add to env section of the job

## Env variable

You should set `GITHUB_TOKEN` env variable to enable action to access GitHub API. See example.

## Outputs
Values from [API](https://docs.github.com/en/rest/reference/repos#releases) response object:

* `targetYmlFileName` File name of the new yml file (inside `.github/workflows` folder)
* `targetYmlFilePath` Absolute path to target yml file

## Example usage()
```yaml
- uses: cardinalby/schedule-job-action@v1
  env:
    GITHUB_TOKEN: ${{ github.token }}
  with:
    templateYmlFile: '.github-scheduled-workflows/example.yml'    
```