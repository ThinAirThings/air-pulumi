

import * as aws from "@pulumi/aws";
import * as pulumi from "@pulumi/pulumi";
import * as path from "path";
import * as fs from "fs";
import { createNameTag } from "../utils/createNameTag";

export const PublicBucket = () => ({
    tag,
    version,
    resourceDirectoryPath,
    // domainPrefix
}: {
    tag: Lowercase<string>,
    version: number,
    resourceDirectoryPath?: string
}) => {
    // Create nametag
    const nameTag = createNameTag(tag, version).replaceAll("_", "-")
    // Create a logo bucket
    const bucket = new aws.s3.BucketV2(nameTag)
    new aws.s3.BucketPublicAccessBlock(`${nameTag}_publicAccessBlock`, {
        bucket: bucket.id,
        blockPublicAcls: false,
        blockPublicPolicy: false,
        ignorePublicAcls: false,
        restrictPublicBuckets: false,
    })
    new aws.s3.BucketPolicy(`${nameTag}_policy`, {
        bucket: bucket.id,
        policy: pulumi.jsonStringify({
            Version: "2012-10-17",
            Statement: [{
                Sid: "PublicReadGetObject",
                Action: ["s3:GetObject"],
                Effect: "Allow",
                Resource: pulumi.interpolate`${bucket.arn}/*`,
                Principal: "*",
            }],
        }),
    })
    // Add resources to expose
    if (resourceDirectoryPath) {
        fs.readdirSync(resourceDirectoryPath).forEach(file => {
            new aws.s3.BucketObject(file, {
                bucket: bucket.id,
                key: file,
                source: new pulumi.asset.FileAsset(path.join(resourceDirectoryPath, file))
            })
        })
    }
    return {
        bucket
    }
}