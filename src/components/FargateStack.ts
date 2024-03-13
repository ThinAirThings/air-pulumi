import * as pulumi from "@pulumi/pulumi";
import * as aws from "@pulumi/aws";
import * as awsx from "@pulumi/awsx";
import { createNameTag } from "../utils/createNameTag";
import { EcrImage } from "./EcrImage";


export const FargateStack = ({
    tag,
    services
}: {
    tag: string
    services: {
        tag: string
        dockerProjectPath: string
        port: number
        desiredCount: number
        environmentVariables?: Record<string, pulumi.Input<string>>
        pathPattern: string
    }[]
}) => {
    // Create nametag
    const nameTag = createNameTag(tag).replaceAll("_", "-");
    // Create LoadBalancer
    const lb = new awsx.lb.ApplicationLoadBalancer(`${nameTag.split('-').slice(1, -1).join('-')}-lb`, {
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
            }], 
        },
    });

    // Create CNAME Record
    const zone = aws.route53.getZoneOutput({
        name: new pulumi.Config().require("rootDomain"),
    });
    const domainName = `${pulumi.getStack() === 'prod' ? tag : `${pulumi.getStack()}-${tag}.dev.`}${new pulumi.Config().require("rootDomain")}`;
    new aws.route53.Record(`${nameTag}_cname`, {
        zoneId: zone.zoneId,
        name: domainName,
        type: "CNAME",
        ttl: 300,
        records: [lb.loadBalancer.dnsName]
    });
    const cluster = new aws.ecs.Cluster(`${nameTag}-ecscluster`);
    services.map((service, idx) => {
        const serviceNameTag = `${createNameTag(service.tag)}`.replaceAll("_", "-");

        // Create Load Balancer Target
        const targetGroup = new aws.lb.TargetGroup(`${service.tag}-tg`, {
            port: service.port,
            vpcId: lb.loadBalancer.vpcId,
            protocol: "HTTP",
            targetType: "ip",
        });
        // Create Listener Rule
        new aws.lb.ListenerRule(`${serviceNameTag}-listener-rule`, {
            listenerArn: lb.listeners.apply(l => l![0].arn),
            priority: idx+1,
            actions: [{
                type: "forward",
                targetGroupArn: targetGroup.arn
            }],
            conditions: [{
                pathPattern: {
                    values: [`${service.pathPattern}/*`]
                }
            }]
        });
        const ecrRepo = EcrImage({
            tag: `${serviceNameTag}-ecr-repo`,
            dockerProjectPath: service.dockerProjectPath,
        })

        const fargateService = new awsx.ecs.FargateService(`${serviceNameTag}-fargatesvc`, {
            cluster: cluster.arn,
            assignPublicIp: true,
            desiredCount: service.desiredCount,
            taskDefinitionArgs: {
                container: {
                    name: `${serviceNameTag}-container`,
                    image: ecrRepo.imageName,
                    cpu: 256,
                    memory: 1024,
                    essential: true,
                    portMappings: [
                        {
                            containerPort: service.port,
                            targetGroup: targetGroup,
                        },
                    ],
                },
            },
        })
        // Add role permissions
    });
}


