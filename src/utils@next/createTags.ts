import * as pulumi from "@pulumi/pulumi";

export const createTags = (name: string) => ({
    Name: name,
    Organization: pulumi.getOrganization(),
    Project: pulumi.getProject(),
    Stack: pulumi.getStack(),
})