import { createNameTag } from "../utils/createNameTag";
import * as aws from "@pulumi/aws";
import * as pulumi from "@pulumi/pulumi";
import * as awsx from "@pulumi/awsx";

export const FargateService = ({
    tag,
    cluster,
    applicationLoadBalancer,
    listener,
    imageUri,
    environmentVariables
}: {
    tag: string
    cluster: aws.ecs.Cluster
    applicationLoadBalancer: aws.lb.LoadBalancer
    listener: aws.lb.Listener
    imageUri: pulumi.Input<string>
    environmentVariables?: Record<string, pulumi.Input<string>>
}) => {
    // Create nametag
    const nameTag = createNameTag(tag).replaceAll("_", "-");

    // Create Load Balancer Target
    const targetGroup = new aws.lb.TargetGroup(`${nameTag}-tg`, {
        port: 80,
        vpcId: applicationLoadBalancer.vpcId,
        protocol: "HTTP",
        targetType: "ip",
        healthCheck: {
            path: "/health",
            protocol: "HTTP",
            interval: 30,
            matcher: "200-299",
        }
    });
    
    // Create Listener Rule
    new aws.lb.ListenerRule(`${nameTag}-listener-rule`, {
        listenerArn: listener.arn,
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
        assignPublicIp: true,
        taskDefinitionArgs: {
            containers: {
                app: {
                    name: `${nameTag}-app`,
                    image: imageUri,
                    memory: 512,
                    portMappings: [{
                        targetGroup, // Replace with the port your socket.io app listens on
                    }],
                    environment: [
                        // Define your environment variables here if needed
                    ],
                    healthCheck: {
                        command: ["CMD-SHELL", "curl -f http://localhost/ || exit 1"],
                        interval: 30,
                        timeout: 5,
                        retries: 3,
                        startPeriod: 60,
                    }
                },
            },
        },
        desiredCount: 1,
    });
    return fargateService;
}