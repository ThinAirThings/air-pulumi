import * as pulumi from "@pulumi/pulumi";

export const nameTag = (
    tag: string
) => `${pulumi.getProject()}_${pulumi.getStack()}_${tag}`