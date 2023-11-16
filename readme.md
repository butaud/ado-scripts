# Setup
1. Create a `.env` file at the root with the following contents:
```
ADO_PAT=<an ADO PAT you generate for your org with Work Item read permissions>
ORG_URL=<the URL to your ADO org>
```
1. Run `yarn install`
1. Run `yarn start <parent work item id>` to generate a dependency graph of the child requirements.