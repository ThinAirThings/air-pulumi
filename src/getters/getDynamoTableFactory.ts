import * as aws from "@pulumi/aws";
import { createNameTag } from "../utils/createNameTag";



export const getDynamoTableFactory = 
    (applicationIamUser: aws.iam.User) =>
    ({
        tag,
        tableName
    }: {
        tag: string;
        tableName: string;
    }) => {
        // Create Nametag
        const nameTag = createNameTag(tag).replaceAll("_", "-");
        // Get Dynamo Table 
        const table = aws.dynamodb.Table.get(`${nameTag}_table`, tableName);
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
    }