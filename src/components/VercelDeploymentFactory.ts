import * as aws from "@pulumi/aws";
import { createNameTag } from "../utils/createNameTag";
import * as vercel from "@pulumiverse/vercel";
import * as pulumi from "@pulumi/pulumi";

export const VercelDeploymentFactory = (
    applicationIamAccessKey: aws.iam.AccessKey
) => ({
    tag,
    githubRepo,
    apiToken,
    environmentVariables,
}: {
    tag: string,
    githubRepo: string,
    apiToken: pulumi.Output<string>,
    environmentVariables?: {
        key: string
        value: string
    }[]
}) => {
    // Create nametag
    const nameTag = createNameTag(tag)
    // Create Pulumi Provider
    const provider = new vercel.Provider(`${nameTag}_provider`, {
        apiToken: apiToken,
        team: new pulumi.Config('vercel').require("team")
    });
    // Project Setup
    const project = new vercel.Project(`${nameTag}_project`, {
        name: nameTag,
        framework: "nextjs",
        gitRepository: {
            repo: githubRepo,
            type: "github"
        }
    });
    // Create Environment Variables
    ([
        ...environmentVariables??[],
        { key: "AWS_ACCESS_KEY_ID", value: applicationIamAccessKey.id },
        { key: "AWS_SECRET_ACCESS_KEY", value: applicationIamAccessKey.secret }
    ]).forEach(variable => {
        new vercel.ProjectEnvironmentVariable(`${nameTag}_environmentVar_${variable.key}`, {
            projectId: project.id,
            key: variable.key,
            value: variable.value,
            targets: [pulumi.getStack() === "prod" ? "production" : "preview"]
        })
    })
    // Launch Deployment
    const deployment = new vercel.Deployment(`${nameTag}_deployment`, {
        projectId: project.id,
        production: pulumi.getStack() === "prod" ? true : false,
        ref: pulumi.getStack()
    })
    // Create domain
    new vercel.ProjectDomain(`${nameTag}_domain`, {
        domain: `${pulumi.getStack()}.dev.${new pulumi.Config().require("rootDomain")}`,
        projectId: project.id
    })
    // Create AWS Route 53 record
    const zone = pulumi.output(aws.route53.getZone({name: new pulumi.Config().require("rootDomain")}))
    new aws.route53.Record(`${nameTag}_ARecord`, {
        zoneId: zone.zoneId,
        name: `${pulumi.getStack()}.dev.${new pulumi.Config().require("rootDomain")}`,
        type: "A",
        ttl: 300,
        records: ["76.76.21.21"], // This works for all vercel deployments
    });
    return {
        deployment
    }
}