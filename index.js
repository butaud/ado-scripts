
const azureDevOps = require('azure-devops-node-api');
const graphviz = require('graphviz');
const parentWorkItemId = parseInt(process.argv[2]);

// Get the PAT from the environment variable
const dotenv = require('dotenv');
dotenv.config();
const token = process.env.ADO_PAT;
const url = process.env.ORG_URL;

(async () => {
    // Create the connection to Azure DevOps
    const authHandler = azureDevOps.getPersonalAccessTokenHandler(token);
    const connection = new azureDevOps.WebApi(url, authHandler);

    // Get the work item tracking client
    const workItemTrackingClient = await connection.getWorkItemTrackingApi();

    const parent = await workItemTrackingClient.getWorkItem(parentWorkItemId, null, null, 1);

    var nodes = {};
    var dependencies = {};

    const g = graphviz.digraph("G");
    const promises = parent.relations.filter(relation => relation.rel === 'System.LinkTypes.Hierarchy-Forward').map(async relation => {
        const childId = relation.url.split('/').pop();
        const child = await workItemTrackingClient.getWorkItem(childId, null, null, 1);
        const title = child.fields['System.Title'];
        if (!title.startsWith('[') || title.includes("Spike")) {
            return;
        }
        const childNode = g.addNode(child.id, { label: child.fields['System.Title'] });
        nodes[child.id] = childNode;
        dependencies[child.id] = child.relations.filter(relation => relation.rel === 'System.LinkTypes.Dependency-Forward').map(relation => relation.url.split('/').pop());
    });
    await Promise.all(promises);

    Object.keys(dependencies).forEach(childId => {
        dependencies[childId].forEach(dependencyId => {
            if (!nodes[dependencyId]) {
                return;
            }
            g.addEdge(nodes[childId], nodes[dependencyId]);
        });
    });

    g.output("png", "test.png");
})();