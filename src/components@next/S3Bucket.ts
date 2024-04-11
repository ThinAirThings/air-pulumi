import * as aws from "@pulumi/aws";
import { createTags } from "../utils@next/createTags";

export const S3Bucket = ({
    name,
    iamUser
}: {
    name: string;
    iamUser?: aws.iam.User;
}) => {
    const bucket = new aws.s3.Bucket(name, {
        tags: createTags(name)
    })
    if (!iamUser) return bucket
    new aws.iam.UserPolicyAttachment(`${name}_policy_attachment`, {
        user: iamUser.name,
        policyArn: new aws.iam.Policy(`${name}_policy`, {
            policy: bucket.arn.apply((arn) => JSON.stringify({
                Version: "2012-10-17",
                Statement: [{
                    Effect: "Allow",
                    Action: ["s3:ListBucket"],
                    Resource: [arn]
                }, {
                    Effect: "Allow",
                    Action: ["s3:GetObject", "s3:PutObject"],
                    Resource: [`${arn}/*`]
                }]
            }))
        }).arn
    })
    return bucket
}