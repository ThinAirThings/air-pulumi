import { createNameTag } from "../utils/createNameTag";
import * as aws from "@pulumi/aws";
import * as awsx from "@pulumi/awsx";
import * as pulumi from "@pulumi/pulumi";
import { FargateService } from "./FargateService";


export const FargateStack = ({
    tag,
    services
}: {
    tag: string
    services: {
        tag: string
        imageUri: pulumi.Input<string>
        environmentVariables?: Record<string, pulumi.Input<string>>
        pathPattern: string
    }[]
}) => {
    // Create nametag
    const nameTag = createNameTag(tag).replaceAll("_", "-");
    // Create a VPC
    const vpc = new awsx.ec2.Vpc(`${nameTag}-vpc`, {});
    const securityGroup = new aws.ec2.SecurityGroup(`${nameTag}-sg`, {
        vpcId: vpc.vpcId,
        egress: [{
            fromPort: 0,
            toPort: 0,
            protocol: "-1",
            cidrBlocks: ["0.0.0.0/0"]
        }],
        ingress: [{
            fromPort: 80,
            toPort: 80,
            protocol: "tcp",
            cidrBlocks: ["0.0.0.0/0"]
        }, {
            fromPort: 443,
            toPort: 443,
            protocol: "tcp",
            cidrBlocks: ["0.0.0.0/0"]
        }, {
            fromPort: 3000,
            toPort: 3000,
            protocol: "tcp",
            cidrBlocks: ["0.0.0.0/0"]
        }]
    })
    // Create Cluster
    const cluster = new aws.ecs.Cluster(`${nameTag}_ecs_cluster`, {});
    // Create a new load balancer
    const alb = new aws.lb.LoadBalancer(`${nameTag}-alb`, {
        loadBalancerType: "application",
        internal: false,
        subnets: vpc.publicSubnetIds,
        securityGroups: [securityGroup.id]
    });

    // Create a listener
    const listener = new aws.lb.Listener(`${nameTag}-listener`, {
        loadBalancerArn: alb.arn,
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
        records: [alb.dnsName]
    });

    // Create services
    const createdServices = services.map((service, index) => {
        return FargateService({
            ...service,
            cluster,
            vpc,
            securityGroup,
            applicationLoadBalancer: alb,
            listener
        });
    });
    return {
        vpc,
        cluster,
        securityGroup,
        alb,
        listener,
        domainName
    };
}