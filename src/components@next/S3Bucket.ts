import * as aws from "@pulumi/aws";
import { createTags } from "../utils@next/createTags";
import { ConstructParameters } from "../types/ConstructParameters";
import * as pulumi from "@pulumi/pulumi";

export const S3Bucket = ({
    name,
    iamUser,
    publicAccess = false,
    ...props
}: ConstructParameters<typeof aws.s3.BucketV2, {
    name: string;
    iamUser?: aws.iam.User;
    publicAccess?: boolean;
}>) => {
    const bucket = new aws.s3.BucketV2(name, {
        tags: createTags(name),
        ...props
    })
    if (publicAccess) {
        const publicAccessBlock = new aws.s3.BucketPublicAccessBlock(
            `${name}_publicAccessBlock`,
            {
                bucket: bucket.id,
                blockPublicAcls: false,
                blockPublicPolicy: false,
                ignorePublicAcls: false,
                restrictPublicBuckets: false,
            },
        );
        new aws.s3.BucketPolicy(
            `${name}_policy`,
            {
                bucket: bucket.id,
                policy: pulumi.jsonStringify({
                    Version: "2012-10-17",
                    Statement: [
                        {
                            Sid: "PublicReadGetObject",
                            Action: ["s3:GetObject"],
                            Effect: "Allow",
                            Resource: pulumi.interpolate`${bucket.arn}/*`,
                            Principal: "*",
                        },
                    ],
                }),
            },
            { dependsOn: [publicAccessBlock] },
        );
    }
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
