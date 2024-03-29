import * as pulumi from "@pulumi/pulumi";

export const createNameTag = (tag: string, version?: number) =>
    `${pulumi.getProject()}_${pulumi.getStack()}_${tag}${version ? `_v${version}` : ""}`;
