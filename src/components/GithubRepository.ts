import * as github from "@pulumi/github";
import * as pulumi from "@pulumi/pulumi";


export const GitHubRepository = ({
    repositoryName,
    branches
}: {
    repositoryName: string;
    branches: string[];
}) => {

}