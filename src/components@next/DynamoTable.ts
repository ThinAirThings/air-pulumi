import { ConstructParameters } from "../types/ConstructParameters";
import * as aws from "@pulumi/aws";

export const DynamoTable = ({
    name,
    version,
    iamUser,
    ...props
}: ConstructParameters<typeof aws.dynamodb.Table, {
    name: string
    version: number
    iamUser?: aws.iam.User
}>) => {
    const table = new aws.dynamodb.Table(`${name}_table`, {
        ...props,
        tags: {
            Name: `${name}-${version}`
        }
    });
    // Set Permissions
    if (!iamUser) return table;
    new aws.iam.UserPolicyAttachment(`${name}_policy_attachment`, {
        user: iamUser.name,
        policyArn: new aws.iam.Policy(`${name}_policy`, {
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


