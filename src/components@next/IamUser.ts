import * as aws from "@pulumi/aws";
import * as pulumi from "@pulumi/pulumi";
import { createTags } from "../utils@next/createTags";
import { ConstructParameters } from "../types/ConstructParameters";

export const IamUser = ({
    name,
    ...props
}: ConstructParameters<typeof aws.iam.User, {
    name: string;
}>) => {
    // Create IAM User
    const iamUser = new aws.iam.User(name, {
        path: `/${pulumi.getProject()}/${pulumi.getStack()}/${name}/`,
        tags: createTags(name),
        ...props
    });
    // Create Access Key
    const accessKey = new aws.iam.AccessKey('accessKey', {
        user: iamUser.name,
    });
    return { iamUser, accessKey };
}