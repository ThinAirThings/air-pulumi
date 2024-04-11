import * as aws from "@pulumi/aws";
import * as pulumi from "@pulumi/pulumi";
import { createTags } from "../utils@next/createTags";

export const IamUser = ({
    name,
    target
}: {
    name: string;
    target: string;
}) => {
    // Create IAM User
    const iamUser = new aws.iam.User(name, {
        path: `/${pulumi.getProject()}/${pulumi.getStack()}/${target}/`,
        tags: createTags(name)
    });
    // Create Access Key
    const accessKey = new aws.iam.AccessKey('accessKey', {
        user: iamUser.name,
    });
    return { iamUser, accessKey };
}