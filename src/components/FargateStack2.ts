import * as pulumi from "@pulumi/pulumi";
import * as aws from "@pulumi/aws";
import * as awsx from "@pulumi/awsx";
import { createNameTag } from "../utils/createNameTag";
import { EcrImage } from "./EcrImage";


export const FargateStack2 = ({
    tag,
    services
}: {
    tag: string
    services: {
        tag: string
        dockerProjectPath: string
        environmentVariables?: Record<string, pulumi.Input<string>>
        pathPattern: string
    }
}) => {
    // Create nametag
    const nameTag = createNameTag(tag).replaceAll("_", "-");
    // Create LoadBalancer
    const lb = new awsx.lb.ApplicationLoadBalancer(`${nameTag}-lb`, {
        listener: {
            port: 443,
            protocol: "HTTPS",
            certificateArn: new pulumi.Config().require("certificateArn"),
            defaultActions: [{
                type: "fixed-response",
                fixedResponse: {
                    contentType: "text/plain",
                    messageBody: "Default Target GG Load Balancer",
                    statusCode: "200"
                }
            }]
        }
    });
    // Create CNAME Record
    const zone = aws.route53.getZoneOutput({
        name: new pulumi.Config().require("rootDomain"),
    });
    const domainName = `${pulumi.getStack() === 'prod' ? tag : `${pulumi.getStack()}-${tag}2.dev.`}${new pulumi.Config().require("rootDomain")}`;
    new aws.route53.Record(`${nameTag}_cname`, {
        zoneId: zone.zoneId,
        name: domainName,
        type: "CNAME",
        ttl: 300,
        records: [lb.loadBalancer.dnsName]
    });
    const cluster = new aws.ecs.Cluster(`${nameTag}-ecscluster`);
    const ecrRepo = EcrImage({
        tag: `${nameTag}-ecr-repo`,
        dockerProjectPath: services.dockerProjectPath,
    })
    const service = new awsx.ecs.FargateService(`${nameTag}-fargatesvc`, {
        cluster: cluster.arn,
        assignPublicIp: true,
        desiredCount: 2,
        taskDefinitionArgs: {
            container: {
                name: `${nameTag}-container`,
                image: ecrRepo.imageName,
                cpu: 256,
                memory: 1024,
                essential: true,
                portMappings: [
                    {
                        containerPort: 80,
                        targetGroup: lb.defaultTargetGroup,
                    },
                ],
            },
        },
    })
}
