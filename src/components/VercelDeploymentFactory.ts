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
    projectId
}: {
    tag: string,
    githubRepo: string,
    apiToken: pulumi.Output<string>,
    projectId?: string,
    environmentVariables?: {
        key: string
        value: string | pulumi.Output<string>
    }[]
}) => {
    // Create nametag
    const nameTag = createNameTag(tag).replaceAll("_", "-")
    // Create Pulumi Provider
    const provider = new vercel.Provider(`${nameTag}_provider`, {
        apiToken: apiToken,
        team: new pulumi.Config('vercel').require("team")
    });
    // Project Setup
    const project = !(projectId) 
        ? new vercel.Project(`${nameTag}_project`, {
            name: tag,
            framework: "nextjs",
            gitRepository: {
                repo: githubRepo,
                type: "github"
            }
        }, { provider }) 
        : null;
    // Create Environment Variables

    ([
        ...environmentVariables??[],
        { key: "BUILD_ENVIRONMENT", value: pulumi.getStack()},
        { key: "AWS_ACCESS_KEY_ID", value: applicationIamAccessKey.id },
        { key: "AWS_SECRET_ACCESS_KEY", value: applicationIamAccessKey.secret }
    ]).forEach(variable => {
        new vercel.ProjectEnvironmentVariable(`${nameTag}_environmentVar_${variable.key}`, {
            projectId: project?.id??projectId!,
            key: variable.key,
            value: variable.value,
            targets: [pulumi.getStack() === "prod" 
                ? "production" 
                : pulumi.getStack() === "dev" 
                    ? "development"
                    : "preview"
            ],
            gitBranch: pulumi.getStack() === "prod" ? "main" : pulumi.getStack()
        }, { provider })
    })
    // Launch Deployment
    const deployment = new vercel.Deployment(`${nameTag}_deployment`, {
        projectId: project?.id??projectId!,
        production: pulumi.getStack() === "prod" ? true : false,
        ref: pulumi.getStack()
    }, { provider })

    // Create AWS Route 53 record
    const zone = pulumi.output(aws.route53.getZone({name: new pulumi.Config().require("rootDomain")}))
    // Create domain records
    if (pulumi.getStack() === 'prod') {
        // Create Apex-domain
        const domainName = new pulumi.Config().require("rootDomain")
        new vercel.ProjectDomain(`${nameTag}_domain`, {
            domain: domainName,
            projectId: project?.id??projectId!
        }, { provider })
        new aws.route53.Record(`${nameTag}_ARecord`, {
            zoneId: zone.zoneId,
            name: domainName,
            type: "A",
            ttl: 300,
            records: ["76.76.21.21"], // This works for all vercel deployments
        })
    } else {
        // Create Sub-domain
        const domainName = `${pulumi.getStack()}.dev.${new pulumi.Config().require("rootDomain")}`
        new vercel.ProjectDomain(`${nameTag}_domain`, {
            domain: domainName,
            projectId: project?.id??projectId!
        }, { provider })
        new aws.route53.Record(`${nameTag}_CNAMERecord`, {
            zoneId: zone.zoneId,
            name: domainName,
            type: "CNAME",
            ttl: 300,
            records: ['cname.vercel-dns.com']
        })
    }
    return {
        deployment
    }
}