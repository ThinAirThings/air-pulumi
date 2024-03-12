import { createNameTag } from "../utils/createNameTag";
import * as aws from "@pulumi/aws";
import * as awsx from "@pulumi/awsx";
import * as pulumi from "@pulumi/pulumi";

export const FargateService = ({
    tag,
    cluster,
    applicationLoadBalancer,
    imageUri,
    environmentVariables
}: {
    tag: string
    cluster: aws.ecs.Cluster
    applicationLoadBalancer: awsx.lb.ApplicationLoadBalancer
    imageUri: pulumi.Input<string>
    environmentVariables?: Record<string, pulumi.Input<string>>
}) => {
    // Create nametag
    const nameTag = createNameTag(tag).replaceAll("_", "-");

    // Create Load Balancer Target
    const targetGroup = new aws.lb.TargetGroup(`${nameTag}-tg`, {
        port: 80,
        vpcId: applicationLoadBalancer.vpcId.apply(vpcId => vpcId!),
        protocol: "HTTP",
        targetType: "ip",
        healthCheck: {
            path: "/",
            protocol: "HTTP",
        }
    });
    
    // Create Listener Rule
    new aws.lb.ListenerRule(`${nameTag}-listener-rule`, {
        listenerArn: applicationLoadBalancer.listeners.apply((listeners) => listeners![0].arn),
        actions: [{
            type: "forward",
            targetGroupArn: targetGroup.arn
        }],
        conditions: [{
            pathPattern: {
                values: ["/"]
            }
        }]
    });
    // Create a Fargate Service
    const fargateService = new awsx.ecs.FargateService(`${nameTag}-service`, {
        cluster: cluster.arn,
        taskDefinitionArgs: {
            containers: {
                app: {
                    name: `${nameTag}-app`,
                    image: imageUri,
                    memory: 512,
                    portMappings: [{
                        targetGroup // Replace with the port your socket.io app listens on
                    }],
                    environment: [
                        // Define your environment variables here if needed
                    ],
                },
            },
        },
        desiredCount: 1,
    });
    return fargateService;
}