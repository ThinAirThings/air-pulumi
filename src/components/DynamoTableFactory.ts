import * as aws from "@pulumi/aws";
import { createNameTag } from "../utils/createNameTag";
import { TableArgs } from "@pulumi/aws/dynamodb";

export const DynamoTableFactory =
    (applicationIamUser: aws.iam.User) =>
        ({
            tag,
            version,
            hashKey,
            rangeKey,
            attributes,
            globalSecondaryIndexes,
            streamEnabled,
            streamViewType,
        }: {
            tag: string;
            version: number;
            hashKey: string;
            rangeKey?: string;
            attributes: { name: string; type: string }[];
            globalSecondaryIndexes?: {
                name: string;
                hashKey: string;
                rangeKey?: string;
                projectionType: string;
            }[];
            streamEnabled?: boolean;
            streamViewType?: "NEW_IMAGE" | "OLD_IMAGE" | "NEW_AND_OLD_IMAGES" | "KEYS_ONLY";
        }) => {
            const nameTag = createNameTag(tag, version);
            const table = new aws.dynamodb.Table(
                `${nameTag}_table`,
                {
                    hashKey,
                    rangeKey,
                    attributes: [
                        {
                            name: hashKey,
                            type: "S",
                        },
                        ...attributes,
                    ],
                    globalSecondaryIndexes: globalSecondaryIndexes?.map(
                        (index) => ({
                            name: index.name,
                            hashKey: index.hashKey,
                            projectionType: index.projectionType,
                        }),
                    ),
                    billingMode: "PAY_PER_REQUEST",
                    streamEnabled,
                    streamViewType
                },
                { dependsOn: [applicationIamUser] },
            );
            // Set Permissions
            new aws.iam.UserPolicyAttachment(`${nameTag}_policy_attachment`, {
                user: applicationIamUser.name,
                policyArn: new aws.iam.Policy(`${nameTag}_policy`, {
                    policy: table.arn.apply((arn) =>
                        JSON.stringify({
                            Version: "2012-10-17",
                            Statement: [
                                {
                                    Effect: "Allow",
                                    Action: ["dynamodb:*"],
                                    Resource: [arn, `${arn}/index/*`],
                                },
                            ],
                        }),
                    ),
                }).arn,
            });
            return table;
        };
