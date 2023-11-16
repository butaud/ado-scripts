    const parentWorkItemId = 3162719;
    const affectsForward = await workItemTrackingClient.getRelationType("Microsoft.VSTS.Common.Affects-Forward");
    const affectsReverse = await workItemTrackingClient.getRelationType("Microsoft.VSTS.Common.Affects-Reverse");
    const dependencyForward = await workItemTrackingClient.getRelationType("System.LinkTypes.Dependency-Forward");
    const dependencyReverse = await workItemTrackingClient.getRelationType("System.LinkTypes.Dependency-Reverse");

    const replaceRelationTypes = async (workItemTrackingClient, workItemId, originalRelationType, replacementRelationType) => {
        let workItem = await workItemTrackingClient.getWorkItem(workItemId, null, null, 1);
        let forwardIndex = workItem.relations.findIndex(r => r.rel === originalRelationType.referenceName);
        while (forwardIndex !== -1) {
            const relation = workItem.relations[forwardIndex];
            const targetWiId = relation.url.split('/').pop();
            await removeRelation(workItemTrackingClient, workItemId, forwardIndex);
            await addRelation(workItemTrackingClient, workItemId, replacementRelationType, relation.url);
            console.log(`${workItemId} -> ${targetWiId}`);
            workItem = await workItemTrackingClient.getWorkItem(workItemId, null, null, 1);
            forwardIndex = workItem.relations.findIndex(r => r.rel === originalRelationType.referenceName);
        }
    };

    const replaceAffectsWithDependency = async (workItemTrackingClient, workItemId) => {
        replaceRelationTypes(workItemTrackingClient, workItemId, affectsForward, dependencyForward);
        // replaceRelationTypes(workItemTrackingClient, workItemId, affectsReverse, dependencyReverse);
    };

    const replaceDependencyWithAffects = async (workItemTrackingClient, workItemId) => {
        replaceRelationTypes(workItemTrackingClient, workItemId, dependencyForward, affectsForward);
        replaceRelationTypes(workItemTrackingClient, workItemId, dependencyReverse, affectsReverse);
    };

    const parent = await workItemTrackingClient.getWorkItem(parentWorkItemId, null, null, 1);
    const confirm = prompt(`Are you sure you want to replace all affects for ${parent.id} - ${parent.fields['System.Title']} with dependencies?`);
    if (confirm.toLocaleLowerCase() !== 'y' && confirm.toLocaleLowerCase() !== 'yes') {
        return;
    }

    const childIds = parent.relations
        .filter(relation => relation.rel === 'System.LinkTypes.Hierarchy-Forward')
        .map(relation => relation.url.split('/').pop());
    
    // Need to style this imperatively so that the async operations are not interleaved
    for (const childId of childIds) {
        await replaceAffectsWithDependency(workItemTrackingClient, childId);
    }

    

const addRelation = async (workItemTrackingClient, workItemId, relationType, targetUrl) => {
    const patchDocument = [{
        op: 'add',
        path: '/relations/-',
        value: {
            rel: relationType.referenceName,
            url: targetUrl,
            attributes: {
                name: relationType.name
            }
        }
    }];
    await workItemTrackingClient.updateWorkItem(null, patchDocument, workItemId);
};

const removeRelation = async (workItemTrackingClient, workItemId, index) => {
    const patchDocument = [{
        op: 'remove',
        path: `/relations/${index}`,
    }];
    await workItemTrackingClient.updateWorkItem(null, patchDocument, workItemId);
};
