import * as aws from "@pulumi/aws";
import { createNameTag } from "../utils/createNameTag";
import { Output } from "@pulumi/pulumi";


export const DynamoTableFactory = (applicationIamUser: aws.iam.User) =>({
    tag,
    version,
    hashKey,
    rangeKey,
    attributes,
    globalSecondaryIndexes
}: {
    tag: string,
    version: number,
    hashKey: string,
    rangeKey?: string,
    attributes: { name: string, type: string | Output<string> }[],
    globalSecondaryIndexes?: {
        name: string,
        hashKey: string,
        projectionType: string
    }[]
}) => {
    const nameTag = createNameTag(tag, version)
    const table = new aws.dynamodb.Table(nameTag, {
        hashKey,
        rangeKey,
        attributes: [{
            name: hashKey,
            type: "S"
        }, ...attributes],
        globalSecondaryIndexes: globalSecondaryIndexes?.map(index => ({
            name: index.name,
            hashKey: index.hashKey,
            projectionType: index.projectionType
        })),
        billingMode: "PAY_PER_REQUEST"
    }, { dependsOn: [applicationIamUser] });
    // Set Permissions
    new aws.iam.UserPolicyAttachment(`${nameTag}_policy_attachment`, {
        user: applicationIamUser.name,
        policyArn: new aws.iam.Policy(`${nameTag}_policy`, {
            policy: table.arn.apply(arn => JSON.stringify({
                Version: "2012-10-17",
                Statement: [{
                    Effect: "Allow",
                    Action: [
                        "dynamodb:*"
                    ],
                    Resource: [arn, `${arn}/index/*`]
                }]
            }))
        }).arn
    })
    return table;
}