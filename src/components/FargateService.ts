import { createNameTag } from "../utils/createNameTag";
import * as aws from "@pulumi/aws";
import * as pulumi from "@pulumi/pulumi";
import * as awsx from "@pulumi/awsx";
import path = require("path");

export const FargateService = ({
    tag,
    cluster,
    vpc,
    securityGroup,
    applicationLoadBalancer,
    listener,
    imageUri,
    environmentVariables,
    pathPattern
}: {
    tag: string
    cluster: aws.ecs.Cluster
    vpc: awsx.ec2.Vpc
    securityGroup: aws.ec2.SecurityGroup
    applicationLoadBalancer: aws.lb.LoadBalancer
    listener: aws.lb.Listener
    imageUri: pulumi.Input<string>
    environmentVariables?: Record<string, pulumi.Input<string>>
    pathPattern: string
}) => {
    // Create nametag
    const nameTag = createNameTag(tag).replaceAll("_", "-");

    // Create Load Balancer Target
    const targetGroup = new aws.lb.TargetGroup(`${nameTag}-tg`, {
        port: 3000,
        vpcId: applicationLoadBalancer.vpcId,
        protocol: "HTTP",
        targetType: "ip",
        healthCheck: {
            path: `${pathPattern}/health`,
            unhealthyThreshold: 10,
            healthyThreshold: 2,
            timeout: 7,
            protocol: "HTTP",
            interval: 8,
            matcher: "200",
        }
    });
    
    // Create Listener Rule
    new aws.lb.ListenerRule(`${nameTag}-listener-rule`, {
        listenerArn: listener.arn,
        priority: 10,
        actions: [{
            type: "forward",
            targetGroupArn: targetGroup.arn
        }],
        conditions: [{
            pathPattern: {
                values: [`${pathPattern}/*`]
            }
        }]
    });

    // Create a Fargate Service
    const fargateService = new awsx.ecs.FargateService(`${nameTag}-service`, {
        cluster: cluster.arn,
        enableExecuteCommand: true,
        networkConfiguration: {
            subnets: vpc.publicSubnetIds,
            securityGroups: [securityGroup.id],
        },
        // continueBeforeSteadyState: false,
        // // forceNewDeployment: true,
        taskDefinitionArgs: {
            container:{
                name: `${nameTag}-container`,
                image: imageUri,
                cpu: 256,
                memory: 1024,
                portMappings: [{
                    targetGroup
                }],
                environment: [
                    // Define your environment variables here if needed
                ]
            },
        },
        desiredCount: 1,
    });
    return fargateService;
}