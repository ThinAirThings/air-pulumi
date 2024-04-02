import * as github from "@pulumi/github";

export const GitHubRepository = ({
    repositoryName,
    description,
    branchNames
}: {
    repositoryName: string;
    description: string;
    branchNames?: string[];
}) => {
    const repository = new github.Repository(repositoryName, {
        name: repositoryName,
        description
    });
    const branches = branchNames?.map(branchName => new github.Branch(`${repositoryName}-${branchName}`, {
        repository: repository.name,
        branch: branchName
    }))
    return {
        repository,
        branches
    }
}